use crate::config::FireflyConfig;
use crate::models::{
    Account, Balance, FireflyAccount, FireflyResponse, FireflyTransaction,
};
use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use dashmap::DashMap;
use reqwest::{Client, ClientBuilder, Error as ReqwestError, header};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::{debug, error, info, warn};

/// Client for interacting with the Firefly III API
pub struct FireflyClient {
    client: Client,
    config: FireflyConfig,
    accounts_cache: Arc<DashMap<String, (Account, Instant)>>,
    transactions_cache: Arc<DashMap<String, (Vec<FireflyTransaction>, Instant)>>,
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
        let mut last_error = None;

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
                            last_error = Some(anyhow::anyhow!(error_msg));
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
                        last_error = Some(anyhow::anyhow!(error_msg));
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
            cache_ttl: Duration::from_secs(300), // 5 minutes cache TTL
        })
    }

    /// Get all accounts from Firefly III
    pub async fn get_accounts(&self) -> Result<Vec<Account>> {
        // Check cache first
        let cache_key = "all_accounts".to_string();
        if let Some(cached) = self.accounts_cache.get(&cache_key) {
            if cached.1.elapsed() < self.cache_ttl {
                debug!("Using cached accounts data");
                return Ok(vec![cached.0.clone()]);
            }
        }

        let url = format!("{}/v1/accounts", self.config.api_url);
        debug!("Fetching accounts from {}", url);

        // Create request builder
        let request_builder = self.client.get(&url);

        // Use the retry mechanism to make the request
        let firefly_response: FireflyResponse<Vec<FireflyAccount>> =
            self.request_with_retry(&url, request_builder, RequestOptions::default()).await?;

        let accounts: Vec<Account> = firefly_response.data
            .into_iter()
            .map(Account::from)
            .filter(|account| account.active)
            .collect();

        // Update cache
        for account in &accounts {
            self.accounts_cache.insert(
                account.id.clone(),
                (account.clone(), Instant::now()),
            );
        }

        Ok(accounts)
    }

    /// Get account balances over time
    pub async fn get_account_balances(
        &self,
        account_id: &str,
        start_date: Option<DateTime<Utc>>,
        end_date: Option<DateTime<Utc>>,
    ) -> Result<Vec<Balance>> {
        // Fetch transactions for the account
        let transactions = self.get_account_transactions(account_id, start_date, end_date).await?;

        // Calculate balances over time
        let mut balances = Vec::new();
        let mut current_balance = 0.0;

        // Sort transactions by date
        let mut sorted_transactions = transactions.clone();
        sorted_transactions.sort_by(|a, b| {
            a.attributes.transactions[0].date.cmp(&b.attributes.transactions[0].date)
        });

        for transaction in sorted_transactions {
            for journal in transaction.attributes.transactions {
                let amount = journal.amount.parse::<f64>().unwrap_or(0.0);

                // If this account is the source, subtract the amount
                if journal.source_id == account_id {
                    current_balance -= amount;
                }

                // If this account is the destination, add the amount
                if journal.destination_id == account_id {
                    current_balance += amount;
                }

                balances.push(Balance {
                    date: journal.date,
                    amount: current_balance,
                });
            }
        }

        // Sort balances by date
        balances.sort_by(|a, b| a.date.cmp(&b.date));

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

        // Add date filters if provided
        if let Some(start) = start_date {
            url.push_str(&format!("&start={}", start.format("%Y-%m-%d")));
        }

        if let Some(end) = end_date {
            url.push_str(&format!("&end={}", end.format("%Y-%m-%d")));
        }

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
            let balances = self.get_account_balances(account_id, start_date, end_date).await?;
            all_balances.extend(balances);
        }

        // Group balances by date and sum amounts
        let mut net_worth_map = std::collections::HashMap::new();

        for balance in all_balances {
            let date_key = balance.date.format("%Y-%m-%d").to_string();
            let entry = net_worth_map.entry(date_key).or_insert(0.0);
            *entry += balance.amount;
        }

        // Convert map to vector of Balance objects
        let mut net_worth: Vec<Balance> = net_worth_map
            .into_iter()
            .map(|(date_str, amount)| {
                let date = DateTime::parse_from_str(&format!("{}T00:00:00Z", date_str), "%Y-%m-%dT%H:%M:%S%z")
                    .unwrap_or_else(|_| Utc::now().into())
                    .with_timezone(&Utc);

                Balance { date, amount }
            })
            .collect();

        // Sort by date
        net_worth.sort_by(|a, b| a.date.cmp(&b.date));

        Ok(net_worth)
    }
}
