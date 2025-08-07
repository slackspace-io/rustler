use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

// Account type mapping
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AccountTypeMapping {
    // Map from Firefly III account type to Rustler account type
    pub asset: String,
    pub expense: String,
    pub revenue: String,
    pub loan: String,
    pub debt: String,
    pub liabilities: String,
    pub other: String,
    // Map for specific accounts by name (overrides the type mapping)
    #[serde(default)]
    pub account_specific: HashMap<String, String>,
}

impl Default for AccountTypeMapping {
    fn default() -> Self {
        Self {
            asset: "On Budget".to_string(),
            expense: "External".to_string(),
            revenue: "External".to_string(),
            loan: "Off Budget".to_string(),
            debt: "Off Budget".to_string(),
            liabilities: "Off Budget".to_string(),
            other: "External".to_string(),
            account_specific: HashMap::new(),
        }
    }
}

// Import options
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct FireflyImportOptions {
    pub import_method: String, // "api" or "csv"
    pub api_url: Option<String>,
    pub api_token: Option<String>,
    pub accounts_csv_path: Option<String>,
    pub transactions_csv_path: Option<String>,
    #[serde(default)]
    pub account_type_mapping: AccountTypeMapping,
}

// Failed transaction details for retry
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FailedTransactionDetails {
    pub source_account_id: Uuid,
    pub destination_account_id: Option<Uuid>,
    pub destination_name: Option<String>,
    pub description: String,
    pub amount: f64,
    pub category: String,
    pub budget_id: Option<Uuid>,
    pub transaction_date: Option<DateTime<Utc>>,
    pub error_message: String,
}

// Import result
#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub accounts_imported: usize,
    pub transactions_imported: usize,
    pub errors: Vec<String>,
    pub failed_transactions: Vec<FailedTransactionDetails>,
}
