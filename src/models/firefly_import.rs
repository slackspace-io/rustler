use serde::{Deserialize, Serialize};

// Import options
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct FireflyImportOptions {
    pub import_method: String, // "api" or "csv"
    pub api_url: Option<String>,
    pub api_token: Option<String>,
    pub accounts_csv_path: Option<String>,
    pub transactions_csv_path: Option<String>,
}

// Import result
#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub accounts_imported: usize,
    pub transactions_imported: usize,
    pub errors: Vec<String>,
}
