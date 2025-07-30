use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

/// Frequency for balance data points
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BalanceFrequency {
    /// Daily balance data points
    Daily,
    /// Weekly balance data points
    Weekly,
    /// Monthly balance data points
    Monthly,
    /// Automatically determine frequency based on date range
    #[serde(rename = "auto")]
    Auto,
}

impl Default for BalanceFrequency {
    fn default() -> Self {
        BalanceFrequency::Auto
    }
}

impl fmt::Display for BalanceFrequency {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            BalanceFrequency::Daily => write!(f, "daily"),
            BalanceFrequency::Weekly => write!(f, "weekly"),
            BalanceFrequency::Monthly => write!(f, "monthly"),
            BalanceFrequency::Auto => write!(f, "auto"),
        }
    }
}

impl FromStr for BalanceFrequency {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "daily" => Ok(BalanceFrequency::Daily),
            "weekly" => Ok(BalanceFrequency::Weekly),
            "monthly" => Ok(BalanceFrequency::Monthly),
            "auto" => Ok(BalanceFrequency::Auto),
            _ => Err(format!("Unknown balance frequency: {}", s)),
        }
    }
}

/// Represents an account from Firefly III
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub type_name: String,
    pub currency_code: String,
    pub current_balance: f64,
    pub active: bool,
}

/// Represents a balance at a specific point in time
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Balance {
    pub date: DateTime<Utc>,
    pub amount: f64,
}

/// Represents an account with its balance history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountWithBalances {
    pub account: Account,
    pub balances: Vec<Balance>,
}

/// Response for the accounts endpoint
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountsResponse {
    pub accounts: Vec<Account>,
}

/// Request for the net worth endpoint
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetWorthRequest {
    pub account_ids: Vec<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    #[serde(default)]
    pub frequency: BalanceFrequency,
}

/// Response for the net worth endpoint
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetWorthResponse {
    pub accounts: Vec<AccountWithBalances>,
    pub net_worth: Vec<Balance>,
}

/// Error response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}

// Firefly III API response models

/// Firefly III pagination metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FireflyPagination {
    pub total: Option<i32>,
    pub count: Option<i32>,
    pub per_page: Option<i32>,
    pub current_page: Option<i32>,
    pub total_pages: Option<i32>,
}

/// Firefly III meta data containing pagination
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FireflyMeta {
    pub pagination: FireflyPagination,
}

/// Firefly III API response wrapper
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FireflyResponse<T> {
    pub data: T,
    pub meta: Option<FireflyMeta>,
}

/// Firefly III account data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FireflyAccount {
    pub id: String,
    pub attributes: FireflyAccountAttributes,
}

/// Firefly III account attributes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FireflyAccountAttributes {
    pub name: String,
    pub r#type: String,
    pub currency_code: Option<String>,
    pub current_balance: Option<String>,
    pub current_balance_date: Option<DateTime<Utc>>,
    pub active: bool,
}

/// Firefly III transaction data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FireflyTransaction {
    pub id: String,
    pub attributes: FireflyTransactionAttributes,
}

/// Firefly III transaction attributes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FireflyTransactionAttributes {
    pub transactions: Vec<FireflyTransactionJournal>,
}

/// Firefly III transaction journal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FireflyTransactionJournal {
    pub description: String,
    pub date: DateTime<Utc>,
    pub amount: String,
    pub source_id: String,
    pub destination_id: String,
}

// Conversion functions

impl From<FireflyAccount> for Account {
    fn from(firefly_account: FireflyAccount) -> Self {
        let current_balance = firefly_account.attributes.current_balance
            .unwrap_or_else(|| "0".to_string())
            .parse::<f64>()
            .unwrap_or(0.0);

        Account {
            id: firefly_account.id,
            name: firefly_account.attributes.name,
            type_name: firefly_account.attributes.r#type,
            currency_code: firefly_account.attributes.currency_code.unwrap_or_else(|| "USD".to_string()),
            current_balance,
            active: firefly_account.attributes.active,
        }
    }
}
