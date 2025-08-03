use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Represents a financial account in the system
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Account {
    /// Unique identifier for the account
    pub id: Uuid,
    /// Name of the account (e.g., "Checking Account", "Savings Account")
    pub name: String,
    /// Type of account (e.g., "Checking", "Savings", "Credit Card")
    pub account_type: String,
    /// Current balance of the account
    pub balance: f64,
    /// Currency of the account (e.g., "USD", "EUR")
    pub currency: String,
    /// When the account was created
    pub created_at: DateTime<Utc>,
    /// When the account was last updated
    pub updated_at: DateTime<Utc>,
}

/// Data required to create a new account
#[derive(Debug, Deserialize)]
pub struct CreateAccountRequest {
    pub name: String,
    pub account_type: String,
    pub balance: f64,
    pub currency: String,
}

/// Data required to update an existing account
#[derive(Debug, Deserialize)]
pub struct UpdateAccountRequest {
    pub name: Option<String>,
    pub account_type: Option<String>,
    pub balance: Option<f64>,
    pub currency: Option<String>,
}
