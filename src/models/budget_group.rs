use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Represents a budget group in the system
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct BudgetGroup {
    /// Unique identifier for the budget group
    pub id: Uuid,
    /// Name of the budget group
    pub name: String,
    /// Description of the budget group (optional)
    pub description: Option<String>,
    /// When the budget group was created
    pub created_at: DateTime<Utc>,
    /// When the budget group was last updated
    pub updated_at: DateTime<Utc>,
}

/// Data required to create a new budget group
#[derive(Debug, Deserialize)]
pub struct CreateBudgetGroupRequest {
    pub name: String,
    pub description: Option<String>,
}

/// Data required to update an existing budget group
#[derive(Debug, Deserialize)]
pub struct UpdateBudgetGroupRequest {
    pub name: Option<String>,
    pub description: Option<String>,
}
