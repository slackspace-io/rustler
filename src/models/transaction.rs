use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Represents a financial transaction in the system
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Transaction {
    /// Unique identifier for the transaction
    pub id: Uuid,
    /// ID of the source account for this transaction
    pub source_account_id: Uuid,
    /// ID of the destination account (required for double entry accounting)
    pub destination_account_id: Uuid,
    /// Description of the transaction
    pub description: String,
    /// Amount of the transaction (always positive for transfers)
    pub amount: f64,
    /// Category of the transaction (e.g., "Food", "Transportation", "Income", "Transfer")
    pub category: String,
    /// Optional budget ID this transaction is assigned to
    pub budget_id: Option<Uuid>,
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
    /// ID of the source account for this transaction
    pub source_account_id: Uuid,
    /// ID of the destination account (required for double entry accounting)
    pub destination_account_id: Uuid,
    pub description: String,
    pub amount: f64,
    pub category: String,
    /// Optional budget ID this transaction is assigned to
    pub budget_id: Option<Uuid>,
    pub transaction_date: Option<DateTime<Utc>>,
}

/// Data required to update an existing transaction
#[derive(Debug, Deserialize)]
pub struct UpdateTransactionRequest {
    /// ID of the destination account (required for double entry accounting)
    pub destination_account_id: Option<Uuid>,
    pub description: Option<String>,
    pub amount: Option<f64>,
    pub category: Option<String>,
    /// Optional budget ID this transaction is assigned to
    pub budget_id: Option<Uuid>,
    pub transaction_date: Option<DateTime<Utc>>,
}
