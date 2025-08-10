use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Represents a rule group in the system
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RuleGroup {
    /// Unique identifier for the rule group
    pub id: Uuid,
    /// Name of the rule group
    pub name: String,
    /// Description of the rule group (optional)
    pub description: Option<String>,
    /// When the rule group was created
    pub created_at: DateTime<Utc>,
    /// When the rule group was last updated
    pub updated_at: DateTime<Utc>,
}

/// Data required to create a new rule group
#[derive(Debug, Deserialize)]
pub struct CreateRuleGroupRequest {
    pub name: String,
    pub description: Option<String>,
}

/// Data required to update an existing rule group
#[derive(Debug, Deserialize)]
pub struct UpdateRuleGroupRequest {
    pub name: Option<String>,
    pub description: Option<String>,
}
