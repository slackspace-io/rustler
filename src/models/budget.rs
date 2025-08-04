use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Represents a budget in the system
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Budget {
    /// Unique identifier for the budget
    pub id: Uuid,
    /// Name of the budget (e.g., "Monthly Expenses", "Vacation Fund")
    pub name: String,
    /// Description of the budget
    pub description: Option<String>,
    /// Total amount allocated to this budget
    pub amount: f64,
    /// Start date of the budget period
    pub start_date: DateTime<Utc>,
    /// End date of the budget period
    pub end_date: Option<DateTime<Utc>>,
    /// When the budget was created
    pub created_at: DateTime<Utc>,
    /// When the budget was last updated
    pub updated_at: DateTime<Utc>,
}

/// Data required to create a new budget
#[derive(Debug, Deserialize)]
pub struct CreateBudgetRequest {
    pub name: String,
    pub description: Option<String>,
    pub amount: f64,
    pub start_date: DateTime<Utc>,
    pub end_date: Option<DateTime<Utc>>,
}

/// Data required to update an existing budget
#[derive(Debug, Deserialize)]
pub struct UpdateBudgetRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub amount: Option<f64>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
}
