use std::collections::HashMap;
use serde::{Deserialize, Serialize};

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

// Import result
#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub accounts_imported: usize,
    pub transactions_imported: usize,
    pub errors: Vec<String>,
}
