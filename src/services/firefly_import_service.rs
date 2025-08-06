use std::collections::HashMap;
use std::path::Path;
use std::fs::File;
use std::io::{BufReader, Read};
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Postgres};
use uuid::Uuid;
use csv::ReaderBuilder;

use crate::models::{Account, CreateAccountRequest, Transaction, CreateTransactionRequest, firefly_import::{FireflyImportOptions, ImportResult}};
use crate::services::account_service::AccountService;
use crate::services::transaction_service::TransactionService;

// Firefly III account types
#[derive(Debug, Deserialize, Serialize, Clone)]
pub enum FireflyAccountType {
    #[serde(rename = "asset")]
    Asset,
    #[serde(rename = "expense")]
    Expense,
    #[serde(rename = "revenue")]
    Revenue,
    #[serde(rename = "loan")]
    Loan,
    #[serde(rename = "debt")]
    Debt,
    #[serde(rename = "liabilities")]
    Liabilities,
    #[serde(other)]
    Other,
}

// Firefly III transaction types
#[derive(Debug, Deserialize, Serialize, Clone)]
pub enum FireflyTransactionType {
    #[serde(rename = "withdrawal")]
    Withdrawal,
    #[serde(rename = "deposit")]
    Deposit,
    #[serde(rename = "transfer")]
    Transfer,
    #[serde(other)]
    Other,
}

// Firefly III account model
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct FireflyAccount {
    pub id: String,
    pub name: String,
    pub type_: FireflyAccountType,
    pub currency_code: String,
    pub current_balance: Option<f64>,
    pub notes: Option<String>,
}

// Firefly III transaction model
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct FireflyTransaction {
    pub id: String,
    pub transaction_type: FireflyTransactionType,
    pub description: String,
    pub date: DateTime<Utc>,
    pub amount: f64,
    pub source_id: String,
    pub source_name: String,
    pub destination_id: String,
    pub destination_name: String,
    pub category_name: Option<String>,
    pub notes: Option<String>,
}

// Firefly III API response structure for accounts
#[derive(Debug, Deserialize)]
struct FireflyAccountsResponse {
    data: Vec<FireflyAccount>,
}

// Firefly III API response structure for transactions
#[derive(Debug, Deserialize)]
struct FireflyTransactionsResponse {
    data: Vec<FireflyTransaction>,
}

// CSV row for Firefly III account export
#[derive(Debug, Deserialize, Clone)]
pub struct FireflyAccountCsv {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub currency_code: String,
    pub current_balance: Option<String>,
    pub notes: Option<String>,
}

// CSV row for Firefly III transaction export
#[derive(Debug, Deserialize, Clone)]
pub struct FireflyTransactionCsv {
    pub id: String,
    #[serde(rename = "type")]
    pub transaction_type: String,
    pub description: String,
    pub date: String,
    pub amount: String,
    pub source_id: String,
    pub source_name: String,
    pub destination_id: String,
    pub destination_name: String,
    pub category_name: Option<String>,
    pub notes: Option<String>,
}


// Service for importing data from Firefly III
pub struct FireflyImportService {
    db: Pool<Postgres>,
    account_service: AccountService,
    transaction_service: TransactionService,
}

impl FireflyImportService {
    // Create a new FireflyImportService
    pub fn new(db: Pool<Postgres>) -> Self {
        Self {
            db: db.clone(),
            account_service: AccountService::new(db.clone()),
            transaction_service: TransactionService::new(db),
        }
    }

    // Map Firefly III account type to Rustler account type
    fn map_account_type(&self, firefly_type: &str) -> String {
        match firefly_type.to_lowercase().as_str() {
            "asset" => {
                if firefly_type.to_lowercase().contains("checking") {
                    "On Budget".to_string()
                } else if firefly_type.to_lowercase().contains("savings") {
                    "On Budget".to_string()
                } else if firefly_type.to_lowercase().contains("credit card") {
                    "On Budget".to_string()
                } else if firefly_type.to_lowercase().contains("investment") {
                    "On Budget".to_string()
                } else {
                    "Off Budget".to_string()
                }
            }
            "loan" | "debt" | "liabilities" => "Off Budget".to_string(),
            "expense" | "revenue" => "External".to_string(),
            _ => "External".to_string(),
        }
    }

    // Import accounts and transactions from Firefly III
    pub async fn import(&self, options: FireflyImportOptions) -> Result<ImportResult, String> {
        let mut result = ImportResult {
            accounts_imported: 0,
            transactions_imported: 0,
            errors: Vec::new(),
        };

        // Import accounts and transactions based on the selected method
        match options.import_method.as_str() {
            "api" => {
                if let (Some(api_url), Some(api_token)) = (&options.api_url, &options.api_token) {
                    self.import_from_api(api_url, api_token, &mut result).await?;
                } else {
                    return Err("API URL and token are required for API import".to_string());
                }
            }
            "csv" => {
                if let (Some(accounts_csv), Some(transactions_csv)) = (&options.accounts_csv_path, &options.transactions_csv_path) {
                    self.import_from_csv(accounts_csv, transactions_csv, &mut result).await?;
                } else {
                    return Err("Accounts and transactions CSV paths are required for CSV import".to_string());
                }
            }
            _ => {
                return Err("Invalid import method. Use 'api' or 'csv'".to_string());
            }
        }

        Ok(result)
    }

    // Import accounts and transactions from Firefly III API
    async fn import_from_api(&self, api_url: &str, api_token: &str, result: &mut ImportResult) -> Result<(), String> {
        // Create HTTP client
        let client = Client::new();

        // Fetch accounts from Firefly III API
        let accounts = self.fetch_accounts_from_api(&client, api_url, api_token).await?;

        // Map of Firefly III account IDs to Rustler account IDs
        let account_id_map = self.import_accounts(accounts, result).await?;

        // Fetch transactions from Firefly III API
        let transactions = self.fetch_transactions_from_api(&client, api_url, api_token).await?;

        // Import transactions
        self.import_transactions(transactions, &account_id_map, result).await?;

        Ok(())
    }

    // Fetch accounts from Firefly III API
    async fn fetch_accounts_from_api(&self, client: &Client, api_url: &str, api_token: &str) -> Result<Vec<FireflyAccount>, String> {
        // Build the API URL for accounts
        let accounts_url = format!("{}/api/v1/accounts", api_url.trim_end_matches('/'));

        // Make the API request
        let response = client.get(&accounts_url)
            .header("Authorization", format!("Bearer {}", api_token))
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| format!("Failed to fetch accounts from API: {}", e))?;

        // Check if the request was successful
        if !response.status().is_success() {
            return Err(format!("Failed to fetch accounts: HTTP {}", response.status()));
        }

        // First try to parse as a structured response with data field
        match response.json::<FireflyAccountsResponse>().await {
            Ok(accounts_response) => {
                // Successfully parsed the structured response
                Ok(accounts_response.data)
            },
            Err(e) => {
                // If that fails, try to parse directly as an array of accounts
                // This provides a fallback in case the API format changes
                let response_text = format!("Failed to parse structured accounts response: {}. Trying alternative format...", e);
                eprintln!("{}", response_text);

                // Need to make a new request since we consumed the previous one
                let response = client.get(&accounts_url)
                    .header("Authorization", format!("Bearer {}", api_token))
                    .header("Accept", "application/json")
                    .send()
                    .await
                    .map_err(|e| format!("Failed to fetch accounts from API: {}", e))?;

                let accounts: Vec<FireflyAccount> = response.json()
                    .await
                    .map_err(|e| format!("Failed to parse accounts response in any format: {}", e))?;

                Ok(accounts)
            }
        }
    }

    // Fetch transactions from Firefly III API
    async fn fetch_transactions_from_api(&self, client: &Client, api_url: &str, api_token: &str) -> Result<Vec<FireflyTransaction>, String> {
        // Build the API URL for transactions
        let transactions_url = format!("{}/api/v1/transactions", api_url.trim_end_matches('/'));

        // Make the API request
        let response = client.get(&transactions_url)
            .header("Authorization", format!("Bearer {}", api_token))
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| format!("Failed to fetch transactions from API: {}", e))?;

        // Check if the request was successful
        if !response.status().is_success() {
            return Err(format!("Failed to fetch transactions: HTTP {}", response.status()));
        }

        // Parse the response
        let transactions: Vec<FireflyTransaction> = response.json()
            .await
            .map_err(|e| format!("Failed to parse transactions response: {}", e))?;

        Ok(transactions)
    }

    // Import accounts and transactions from CSV files
    async fn import_from_csv(&self, accounts_csv_path: &str, transactions_csv_path: &str, result: &mut ImportResult) -> Result<(), String> {
        // Read accounts from CSV
        let accounts = self.read_accounts_from_csv(accounts_csv_path)?;

        // Map of Firefly III account IDs to Rustler account IDs
        let account_id_map = self.import_accounts(accounts, result).await?;

        // Read transactions from CSV
        let transactions = self.read_transactions_from_csv(transactions_csv_path)?;

        // Import transactions
        self.import_transactions(transactions, &account_id_map, result).await?;

        Ok(())
    }

    // Read accounts from CSV file
    fn read_accounts_from_csv(&self, csv_path: &str) -> Result<Vec<FireflyAccount>, String> {
        // Open the CSV file
        let file = File::open(csv_path)
            .map_err(|e| format!("Failed to open accounts CSV file: {}", e))?;

        let reader = BufReader::new(file);

        // Create CSV reader
        let mut csv_reader = ReaderBuilder::new()
            .has_headers(true)
            .delimiter(b',')
            .from_reader(reader);

        // Read accounts from CSV
        let mut accounts = Vec::new();
        for result in csv_reader.deserialize::<FireflyAccountCsv>() {
            match result {
                Ok(csv_account) => {
                    // Convert CSV account to FireflyAccount
                    let account_type = match csv_account.type_.to_lowercase().as_str() {
                        "asset" => FireflyAccountType::Asset,
                        "expense" => FireflyAccountType::Expense,
                        "revenue" => FireflyAccountType::Revenue,
                        "loan" => FireflyAccountType::Loan,
                        "debt" => FireflyAccountType::Debt,
                        "liabilities" => FireflyAccountType::Liabilities,
                        _ => FireflyAccountType::Other,
                    };

                    let current_balance = csv_account.current_balance
                        .and_then(|b| b.parse::<f64>().ok());

                    accounts.push(FireflyAccount {
                        id: csv_account.id,
                        name: csv_account.name,
                        type_: account_type,
                        currency_code: csv_account.currency_code,
                        current_balance,
                        notes: csv_account.notes,
                    });
                }
                Err(e) => {
                    return Err(format!("Failed to parse account from CSV: {}", e));
                }
            }
        }

        Ok(accounts)
    }

    // Read transactions from CSV file
    fn read_transactions_from_csv(&self, csv_path: &str) -> Result<Vec<FireflyTransaction>, String> {
        // Open the CSV file
        let file = File::open(csv_path)
            .map_err(|e| format!("Failed to open transactions CSV file: {}", e))?;

        let reader = BufReader::new(file);

        // Create CSV reader
        let mut csv_reader = ReaderBuilder::new()
            .has_headers(true)
            .delimiter(b',')
            .from_reader(reader);

        // Read transactions from CSV
        let mut transactions = Vec::new();
        for result in csv_reader.deserialize::<FireflyTransactionCsv>() {
            match result {
                Ok(csv_transaction) => {
                    // Convert CSV transaction to FireflyTransaction
                    let transaction_type = match csv_transaction.transaction_type.to_lowercase().as_str() {
                        "withdrawal" => FireflyTransactionType::Withdrawal,
                        "deposit" => FireflyTransactionType::Deposit,
                        "transfer" => FireflyTransactionType::Transfer,
                        _ => FireflyTransactionType::Other,
                    };

                    // Parse date
                    let date = DateTime::parse_from_rfc3339(&csv_transaction.date)
                        .map_err(|e| format!("Failed to parse transaction date: {}", e))?
                        .with_timezone(&Utc);

                    // Parse amount
                    let amount = csv_transaction.amount.parse::<f64>()
                        .map_err(|e| format!("Failed to parse transaction amount: {}", e))?;

                    transactions.push(FireflyTransaction {
                        id: csv_transaction.id,
                        transaction_type,
                        description: csv_transaction.description,
                        date,
                        amount,
                        source_id: csv_transaction.source_id,
                        source_name: csv_transaction.source_name,
                        destination_id: csv_transaction.destination_id,
                        destination_name: csv_transaction.destination_name,
                        category_name: csv_transaction.category_name,
                        notes: csv_transaction.notes,
                    });
                }
                Err(e) => {
                    return Err(format!("Failed to parse transaction from CSV: {}", e));
                }
            }
        }

        Ok(transactions)
    }

    // Import accounts from Firefly III to Rustler
    async fn import_accounts(&self, accounts: Vec<FireflyAccount>, result: &mut ImportResult) -> Result<HashMap<String, Uuid>, String> {
        let mut account_id_map = HashMap::new();

        // Get existing accounts to avoid duplicates
        let existing_accounts = self.account_service.get_accounts()
            .await
            .map_err(|e| format!("Failed to fetch existing accounts: {}", e))?;

        // Create a map of account names to IDs for quick lookup
        let mut existing_account_names = HashMap::new();
        for account in &existing_accounts {
            existing_account_names.insert(account.name.clone(), account.id);
        }

        // Import each account
        for firefly_account in accounts {
            // Skip if account already exists
            if let Some(existing_id) = existing_account_names.get(&firefly_account.name) {
                account_id_map.insert(firefly_account.id, *existing_id);
                continue;
            }

            // Map Firefly III account type to Rustler account type
            let account_type = match firefly_account.type_ {
                FireflyAccountType::Asset => "On Budget",
                FireflyAccountType::Loan | FireflyAccountType::Debt | FireflyAccountType::Liabilities => "Off Budget",
                _ => "External",
            };

            // Create account request
            let create_request = CreateAccountRequest {
                name: firefly_account.name.clone(),
                account_type: account_type.to_string(),
                balance: firefly_account.current_balance.unwrap_or(0.0),
                currency: firefly_account.currency_code.clone(),
                is_default: false, // Imported accounts are not default by default
            };

            // Create the account
            match self.account_service.create_account(create_request).await {
                Ok(account) => {
                    account_id_map.insert(firefly_account.id, account.id);
                    result.accounts_imported += 1;
                }
                Err(e) => {
                    result.errors.push(format!("Failed to create account {}: {}", firefly_account.name, e));
                }
            }
        }

        Ok(account_id_map)
    }

    // Import transactions from Firefly III to Rustler
    async fn import_transactions(&self, transactions: Vec<FireflyTransaction>, account_id_map: &HashMap<String, Uuid>, result: &mut ImportResult) -> Result<(), String> {
        // Import each transaction
        for firefly_transaction in transactions {
            // Skip if source or destination account is not mapped
            let source_account_id = match account_id_map.get(&firefly_transaction.source_id) {
                Some(id) => *id,
                None => {
                    result.errors.push(format!(
                        "Skipping transaction {}: Source account {} not found",
                        firefly_transaction.id, firefly_transaction.source_name
                    ));
                    continue;
                }
            };

            // Get destination account ID if it exists in the map
            let destination_account_id = account_id_map.get(&firefly_transaction.destination_id).copied();

            // Determine transaction amount based on transaction type
            let amount = match firefly_transaction.transaction_type {
                FireflyTransactionType::Withdrawal => firefly_transaction.amount,
                FireflyTransactionType::Deposit => -firefly_transaction.amount, // Negative for deposits in Rustler
                FireflyTransactionType::Transfer => firefly_transaction.amount,
                _ => firefly_transaction.amount,
            };

            // Determine category
            let category = firefly_transaction.category_name.unwrap_or_else(|| {
                match firefly_transaction.transaction_type {
                    FireflyTransactionType::Withdrawal => "Expense".to_string(),
                    FireflyTransactionType::Deposit => "Income".to_string(),
                    FireflyTransactionType::Transfer => "Transfer".to_string(),
                    _ => "Other".to_string(),
                }
            });

            // Create transaction request
            let create_request = CreateTransactionRequest {
                source_account_id,
                destination_account_id,
                destination_name: Some(firefly_transaction.destination_name.clone()),
                description: firefly_transaction.description.clone(),
                amount,
                category,
                budget_id: None, // Firefly III doesn't have direct budget mapping
                transaction_date: Some(firefly_transaction.date),
            };

            // Create the transaction
            match self.transaction_service.create_transaction(create_request).await {
                Ok(_) => {
                    result.transactions_imported += 1;
                }
                Err(e) => {
                    result.errors.push(format!(
                        "Failed to create transaction {}: {}",
                        firefly_transaction.description, e
                    ));
                }
            }
        }

        Ok(())
    }
}
