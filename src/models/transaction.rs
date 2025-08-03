use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Represents a financial transaction in the system
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Transaction {
    /// Unique identifier for the transaction
    pub id: Uuid,
    /// ID of the account this transaction belongs to
    pub account_id: Uuid,
    /// Description of the transaction
    pub description: String,
    /// Amount of the transaction (positive for income, negative for expense)
    pub amount: f64,
    /// Category of the transaction (e.g., "Food", "Transportation", "Income")
    pub category: String,
    /// Date and time when the transaction occurred
    pub transaction_date: DateTime<Utc>,
    /// When the transaction record was created
    pub created_at: DateTime<Utc>,
    /// When the transaction record was last updated
    pub updated_at: DateTime<Utc>,
}

/// Data required to create a new transaction
#[derive(Debug, Deserialize)]
pub struct CreateTransactionRequest {
    pub account_id: Uuid,
    pub description: String,
    pub amount: f64,
    pub category: String,
    pub transaction_date: Option<DateTime<Utc>>,
}

/// Data required to update an existing transaction
#[derive(Debug, Deserialize)]
pub struct UpdateTransactionRequest {
    pub description: Option<String>,
    pub amount: Option<f64>,
    pub category: Option<String>,
    pub transaction_date: Option<DateTime<Utc>>,
}
