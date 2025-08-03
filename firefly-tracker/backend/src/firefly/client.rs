use crate::config::FireflyConfig;
use crate::models::{
    Account, Balance, BalanceFrequency, FireflyAccount, FireflyResponse, FireflyTransaction,
};
use anyhow::{Context, Result};
use chrono::{DateTime, Datelike, Utc};
use dashmap::DashMap;
use reqwest::{Client, ClientBuilder, header};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::{debug, error, info, warn};

/// Client for interacting with the Firefly III API
pub struct FireflyClient {
    client: Client,
    config: FireflyConfig,
    accounts_cache: Arc<DashMap<String, (Account, Instant)>>,
    transactions_cache: Arc<DashMap<String, (Vec<FireflyTransaction>, Instant)>>,
    balance_cache: Arc<DashMap<String, (Balance, Instant)>>,
    balances_cache: Arc<DashMap<String, (Vec<Balance>, Instant)>>,
    cache_ttl: Duration,
}

/// Helper struct for HTTP request options
struct RequestOptions {
    retry_on_status: Vec<u16>,
}

impl Default for RequestOptions {
    fn default() -> Self {
        Self {
            // By default, retry on common transient errors
            retry_on_status: vec![408, 429, 500, 502, 503, 504],
        }
    }
}

impl FireflyClient {
    /// Helper method to perform HTTP requests with retry logic
    async fn request_with_retry<T>(
        &self,
        url: &str,
        request_builder: reqwest::RequestBuilder,
        options: RequestOptions,
    ) -> Result<T>
    where
        T: serde::de::DeserializeOwned,
    {
        let max_retries = self.config.max_retries;
        let base_delay = self.config.retry_delay_ms;
        let debug_mode = self.config.debug_mode;

        let mut attempt = 0;

        loop {
            attempt += 1;

            if debug_mode {
                info!("Request attempt {} of {} to {}", attempt, max_retries + 1, url);
            }

            // Clone the request builder for this attempt
            let request = request_builder.try_clone()
                .ok_or_else(|| anyhow::anyhow!("Failed to clone request"))?;

            // Attempt the request
            match request.send().await {
                Ok(response) => {
                    let status = response.status();

                    if status.is_success() {
                        // Success - parse the response
                        match response.json::<T>().await {
                            Ok(data) => {
                                if debug_mode {
                                    info!("Request to {} succeeded on attempt {}", url, attempt);
                                }
                                return Ok(data);
                            },
                            Err(e) => {
                                // JSON parsing error
                                let error_msg = format!("Failed to parse response from {}: {}", url, e);
                                error!("{}", error_msg);

                                // Don't retry parsing errors
                                return Err(anyhow::anyhow!(error_msg));
                            }
                        }
                    } else {
                        // Error status code
                        let status_code = status.as_u16();
                        let error_text = response.text().await
                            .unwrap_or_else(|_| "No error message".to_string());

                        let error_msg = format!("Firefly III API error ({}): {}", status_code, error_text);
                        error!("{}", error_msg);

                        // Check if we should retry based on status code
                        if attempt <= max_retries && options.retry_on_status.contains(&status_code) {
                            warn!("Retrying request to {} after status code {}", url, status_code);
                        } else {
                            return Err(anyhow::anyhow!(error_msg));
                        }
                    }
                },
                Err(e) => {
                    // Network or other error
                    let is_timeout = e.is_timeout();
                    let is_connect_error = e.is_connect();

                    let error_msg = if is_timeout {
                        format!("Request to {} timed out", url)
                    } else if is_connect_error {
                        format!("Connection error to {}: {}", url, e)
                    } else {
                        format!("Failed to send request to {}: {}", url, e)
                    };

                    error!("{}", error_msg);

                    // Retry network errors
                    if attempt <= max_retries {
                        warn!("Retrying request to {} after error: {}", url, e);
                    } else {
                        return Err(anyhow::anyhow!(error_msg));
                    }
                }
            }

            // Calculate delay with exponential backoff: base_delay * 2^(attempt-1)
            let delay_ms = base_delay * (1 << (attempt - 1));
            if debug_mode {
                info!("Waiting {}ms before retry attempt {}", delay_ms, attempt + 1);
            }

            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
        }
    }

    /// Create a new Firefly III API client
    pub fn new(config: FireflyConfig) -> Result<Self> {
        let mut headers = header::HeaderMap::new();
        headers.insert(
            header::AUTHORIZATION,
            header::HeaderValue::from_str(&format!("Bearer {}", config.api_token))
                .context("Invalid API token")?,
        );

        // Log configuration settings if debug mode is enabled
        if config.debug_mode {
            info!("Initializing Firefly client with configuration:");
            info!("  API URL: {}", config.api_url);
            info!("  Accept invalid certificates: {}", config.accept_invalid_certs);
            info!("  Max retries: {}", config.max_retries);
            info!("  Retry delay: {}ms", config.retry_delay_ms);
            info!("  Debug mode: {}", config.debug_mode);
        }

        // Build the HTTP client with the specified configuration
        let client_builder = ClientBuilder::new()
            .default_headers(headers)
            .timeout(Duration::from_secs(30));

        // Configure SSL/TLS certificate validation
        let client_builder = if config.accept_invalid_certs {
            warn!("SSL certificate validation is disabled. This is not recommended for production use.");
            client_builder.danger_accept_invalid_certs(true)
        } else {
            client_builder
        };

        let client = client_builder
            .build()
            .context("Failed to build HTTP client")?;

        Ok(Self {
            client,
            config,
            accounts_cache: Arc::new(DashMap::new()),
            transactions_cache: Arc::new(DashMap::new()),
            balance_cache: Arc::new(DashMap::new()),
            balances_cache: Arc::new(DashMap::new()),
            cache_ttl: Duration::from_secs(300), // 5 minutes cache TTL
        })
    }

    /// Get all accounts from Firefly III with pagination support
    pub async fn get_accounts(&self) -> Result<Vec<Account>> {
        // Check cache first
        let cache_key = "all_accounts".to_string();

        // Use a separate entry in the accounts_cache for the full list
        // We'll store it as a special entry with a Vec<Account> in the transactions_cache
        if let Some(cached) = self.transactions_cache.get(&cache_key) {
            if cached.1.elapsed() < self.cache_ttl {
                debug!("Using cached accounts data");
                // Since we're storing the accounts list in the transactions_cache,
                // we need to cast it back to Vec<Account>
                if let Ok(accounts) = serde_json::from_value::<Vec<Account>>(
                    serde_json::to_value(&cached.0).unwrap_or_default()
                ) {
                    return Ok(accounts);
                }
            }
        }

        let mut all_accounts = Vec::new();
        let mut current_page = 1;
        let mut total_pages = 10; // Start with 1, will be updated after first request

        // Fetch all pages
        while current_page <= total_pages {
            //let url = format!("{}/v1/accounts?page={}&type=asset", self.config.api_url, current_page);
            let url = format!("{}/v1/accounts?page={}&limit=500", self.config.api_url, current_page);
            debug!("Fetching accounts from {} (page {} of {})", url, current_page, total_pages);

            // Create request builder
            let request_builder = self.client.get(&url);

            // Use the retry mechanism to make the request
            let firefly_response: FireflyResponse<Vec<FireflyAccount>> =
                self.request_with_retry(&url, request_builder, RequestOptions::default()).await?;
            debug!("{:?}", firefly_response);
            // Update total pages from pagination metadata if available
            if let Some(meta) = &firefly_response.meta {
                debug!("Received response from firefly: {:?}", meta);
                if let Some(pages) = meta.pagination.total_pages {
                    total_pages = pages;
                    debug!("Total pages: {}", total_pages);
                }
            }

            // Process accounts from this page
            let page_accounts: Vec<Account> = firefly_response.data
                .into_iter()
                .map(Account::from)
                .filter(|account| account.active)
                .collect();

            // Add accounts from this page to our collection
            all_accounts.extend(page_accounts);

            // Move to next page
            current_page += 1;
        }

        debug!("Fetched a total of {} accounts", all_accounts.len());

        // Update cache for individual accounts
        for account in &all_accounts {
            debug!("Caching account: {}", account.name);
            self.accounts_cache.insert(
                account.id.clone(),
                (account.clone(), Instant::now()),
            );
        }

        // Cache the full list of accounts
        debug!("Caching full list of {} accounts", all_accounts.len());

        // Store the full list in the transactions_cache
        // We use this cache because it already stores Vec<T> values
        if let Ok(transactions_json) = serde_json::to_value(&all_accounts) {
            if let Ok(transactions) = serde_json::from_value(transactions_json.clone()) {
                self.transactions_cache.insert(
                    cache_key,
                    (transactions, Instant::now()),
                );
            }
        }

        Ok(all_accounts)
    }

    /// Get account balance for a specific date
    async fn get_account_balance_for_date(
        &self,
        account_id: &str,
        date: DateTime<Utc>,
    ) -> Result<Balance> {
        // Format the date as YYYY-MM-DD for the query parameter
        let date_str = date.format("%Y-%m-%d").to_string();

        // Construct the URL with the date parameter
        let url = format!("{}/v1/accounts/{}?date={}", self.config.api_url, account_id, date_str);
        debug!("Fetching account balance from {} for date {}", url, date_str);

        // Create request builder
        let request_builder = self.client.get(&url);

        // Use the retry mechanism to make the request
        let firefly_response: FireflyResponse<FireflyAccount> =
            self.request_with_retry(&url, request_builder, RequestOptions::default()).await?;

        // Extract the account data
        let account = firefly_response.data;

        // Parse the current balance
        let amount = account.attributes.current_balance
            .unwrap_or_else(|| "0".to_string())
            .parse::<f64>()
            .unwrap_or(0.0);

        // Use the provided date or the balance date from the response
        let balance_date = account.attributes.current_balance_date
            .unwrap_or(date);

        // Create a Balance object
        let balance = Balance {
            date: balance_date.date_naive().and_hms_opt(0, 0, 0).map(|naive| naive.and_utc()).unwrap_or(balance_date),
            amount,
        };

        debug!("Got balance for date {}: {}", balance.date.format("%Y-%m-%d"), balance.amount);

        Ok(balance)
    }

    /// Get account balances over time with specified frequency
    ///
    /// This method retrieves historical balance data for an account. It uses caching to avoid
    /// making repeated API calls for the same data. The `force_refresh` parameter can be used
    /// to bypass the cache and fetch fresh data from the API.
    pub async fn get_account_balances(
        &self,
        account_id: &str,
        start_date: Option<DateTime<Utc>>,
        end_date: Option<DateTime<Utc>>,
        frequency: Option<BalanceFrequency>,
        force_refresh: Option<bool>,
    ) -> Result<Vec<Balance>> {
        // Get account name for better debug output
        let account_name = match self.accounts_cache.get(account_id) {
            Some(cached) => cached.0.name.clone(),
            None => account_id.to_string(),
        };

        debug!("Calculating balances for account: {} (ID: {})", account_name, account_id);

        // Use provided dates or set defaults to ensure 6 months of data
        let end = end_date.unwrap_or_else(|| Utc::now());

        // If start_date is not provided, set it to 6 months before end_date
        let start = start_date.unwrap_or_else(|| {
            // Subtract 6 months from end date (approximately 180 days)
            end - chrono::Duration::days(180)
        });

        debug!("Date range: start={}, end={}", start.format("%Y-%m-%d"), end.format("%Y-%m-%d"));

        // Create a cache key based on account_id, date range, and frequency
        let freq_str = match frequency {
            Some(f) => format!("{}", f),
            None => "auto".to_string(),
        };
        let cache_key = format!("balances_{}_{}_{}_{}",
            account_id,
            start.format("%Y-%m-%d"),
            end.format("%Y-%m-%d"),
            freq_str
        );

        // Check if we should use cached data
        let should_use_cache = !force_refresh.unwrap_or(false);

        // Check cache first if not forcing refresh
        if should_use_cache {
            if let Some(cached) = self.balances_cache.get(&cache_key) {
                if cached.1.elapsed() < self.cache_ttl {
                    debug!("Using cached balance history for account {}", account_id);
                    return Ok(cached.0.clone());
                }
            }
        }

        // Calculate the number of days in the range
        let days = (end.date_naive() - start.date_naive()).num_days() + 1;

        // Determine the appropriate frequency based on the date range if auto is selected
        let effective_frequency = match frequency.unwrap_or(BalanceFrequency::Auto) {
            BalanceFrequency::Auto => {
                // Auto-select frequency based on date range:
                // - Less than 30 days: daily
                // - 30-90 days: weekly
                // - More than 90 days: monthly
                if days <= 30 {
                    BalanceFrequency::Daily
                } else if days <= 90 {
                    BalanceFrequency::Weekly
                } else {
                    BalanceFrequency::Monthly
                }
            },
            specific => specific,
        };

        debug!("Using {} frequency for {} days date range", effective_frequency, days);

        // Collect balances at the specified frequency
        let mut balances = Vec::new();

        // For monthly frequency, always use the first day of each month
        if effective_frequency == BalanceFrequency::Monthly {
            // Start with the first day of the month for the start date
            let mut year = start.year();
            let mut month = start.month();

            // Create dates for the first of each month in the range
            loop {
                // Create a date for the first of the current month
                let date = chrono::NaiveDate::from_ymd_opt(year, month, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    .and_utc();

                // If this date is after the end date, break
                if date > end {
                    break;
                }

                // If this date is within our range, get the balance
                if date >= start {
                    match self.get_account_balance_for_date(account_id, date).await {
                        Ok(balance) => {
                            balances.push(balance);
                        },
                        Err(e) => {
                            error!("Failed to get balance for date {}: {}", date.format("%Y-%m-%d"), e);
                            // Continue with the next date even if this one fails
                        }
                    }
                }

                // Move to the next month
                month += 1;
                if month > 12 {
                    month = 1;
                    year += 1;
                }
            }

            // Add the current date as the final data point if it's not already the last day
            // and it's after the last data point we've added
            if !balances.is_empty() {
                let last_date = balances.last().unwrap().date;
                if end.date_naive() != last_date.date_naive() && end > last_date {
                    match self.get_account_balance_for_date(account_id, end).await {
                        Ok(balance) => {
                            balances.push(balance);
                        },
                        Err(e) => {
                            error!("Failed to get balance for current date {}: {}", end.format("%Y-%m-%d"), e);
                        }
                    }
                }
            }
        } else {
            // For daily and weekly frequencies, use the original approach
            // Calculate the step size based on frequency
            let step_days = match effective_frequency {
                BalanceFrequency::Daily => 1,
                BalanceFrequency::Weekly => 7,
                BalanceFrequency::Auto => unreachable!(), // Already resolved above
                BalanceFrequency::Monthly => unreachable!(), // Handled separately above
            };

            let mut current_date = start;

            while current_date <= end {
                match self.get_account_balance_for_date(account_id, current_date).await {
                    Ok(balance) => {
                        balances.push(balance);
                    },
                    Err(e) => {
                        error!("Failed to get balance for date {}: {}", current_date.format("%Y-%m-%d"), e);
                        // Continue with the next date even if this one fails
                    }
                }

                // Move to the next date based on frequency
                current_date = current_date + chrono::Duration::days(step_days);
            }

            // For weekly frequency, ensure the final data point is the current date if needed
            if effective_frequency == BalanceFrequency::Weekly && !balances.is_empty() {
                let last_date = balances.last().unwrap().date;
                if end.date_naive() != last_date.date_naive() && end > last_date {
                    match self.get_account_balance_for_date(account_id, end).await {
                        Ok(balance) => {
                            balances.push(balance);
                        },
                        Err(e) => {
                            error!("Failed to get balance for current date {}: {}", end.format("%Y-%m-%d"), e);
                        }
                    }
                }
            }
        }

        // Sort balances by date (should already be sorted, but just to be safe)
        balances.sort_by(|a, b| a.date.cmp(&b.date));

        debug!("Final balance data for account {} ({}):", account_name, account_id);
        for (i, balance) in balances.iter().enumerate() {
            debug!("  Balance {}: Date={}, Amount={}",
                i + 1,
                balance.date.format("%Y-%m-%d %H:%M:%S"),
                balance.amount);
        }

        Ok(balances)
    }

    /// Get transactions for an account
    async fn get_account_transactions(
        &self,
        account_id: &str,
        start_date: Option<DateTime<Utc>>,
        end_date: Option<DateTime<Utc>>,
    ) -> Result<Vec<FireflyTransaction>> {
        // Check cache first
        let cache_key = format!("transactions_{}", account_id);
        if let Some(cached) = self.transactions_cache.get(&cache_key) {
            if cached.1.elapsed() < self.cache_ttl {
                debug!("Using cached transactions data for account {}", account_id);
                return Ok(cached.0.clone());
            }
        }

        let mut url = format!("{}/v1/transactions?type=all", self.config.api_url);

        // Add account filter
        url.push_str(&format!("&query=account_id:{}", account_id));

        // Use provided dates or set defaults to ensure 6 months of data
        let end = end_date.unwrap_or_else(|| Utc::now());

        // If start_date is not provided, set it to 6 months before end_date
        let start = start_date.unwrap_or_else(|| {
            // Subtract 6 months from end date
            // Since chrono doesn't have a direct "subtract months" method,
            // we'll approximate by subtracting 180 days
            end - chrono::Duration::days(180)
        });

        debug!("Using date range: start={}, end={}", start.format("%Y-%m-%d"), end.format("%Y-%m-%d"));

        // Add date filters
        url.push_str(&format!("&start={}", start.format("%Y-%m-%d")));
        url.push_str(&format!("&end={}", end.format("%Y-%m-%d")));

        debug!("Fetching transactions from {}", url);

        // Create request builder
        let request_builder = self.client.get(&url);

        // Use the retry mechanism to make the request
        let firefly_response: FireflyResponse<Vec<FireflyTransaction>> =
            self.request_with_retry(&url, request_builder, RequestOptions::default()).await?;

        let transactions = firefly_response.data;

        // Update cache
        self.transactions_cache.insert(
            cache_key,
            (transactions.clone(), Instant::now()),
        );

        Ok(transactions)
    }

    /// Calculate net worth over time based on selected accounts
    pub async fn calculate_net_worth(
        &self,
        account_ids: &[String],
        start_date: Option<DateTime<Utc>>,
        end_date: Option<DateTime<Utc>>,
    ) -> Result<Vec<Balance>> {
        let mut all_balances = Vec::new();

        // Get balances for each account
        for account_id in account_ids {
            let balances = self.get_account_balances(account_id, start_date, end_date, None, None).await?;
            all_balances.extend(balances);
        }

        // Group balances by date and sum amounts
        let mut net_worth_map = std::collections::HashMap::new();

        for balance in all_balances {
            // Normalize the date to midnight UTC to ensure consistent grouping
            let date_key = balance.date.date_naive().and_hms_opt(0, 0, 0).map(|naive| naive.and_utc()).unwrap_or(balance.date);
            let entry = net_worth_map.entry(date_key).or_insert(0.0);
            *entry += balance.amount;
        }

        // Convert map to vector of Balance objects
        let mut net_worth: Vec<Balance> = net_worth_map
            .into_iter()
            .map(|(date, amount)| Balance { date, amount })
            .collect();

        // Sort by date
        net_worth.sort_by(|a, b| a.date.cmp(&b.date));

        Ok(net_worth)
    }
}
