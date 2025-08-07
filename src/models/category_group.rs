use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Represents a category group in the system
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CategoryGroup {
    /// Unique identifier for the category group
    pub id: Uuid,
    /// Name of the category group
    pub name: String,
    /// Description of the category group (optional)
    pub description: Option<String>,
    /// When the category group was created
    pub created_at: DateTime<Utc>,
    /// When the category group was last updated
    pub updated_at: DateTime<Utc>,
}

/// Data required to create a new category group
#[derive(Debug, Deserialize)]
pub struct CreateCategoryGroupRequest {
    pub name: String,
    pub description: Option<String>,
}

/// Data required to update an existing category group
#[derive(Debug, Deserialize)]
pub struct UpdateCategoryGroupRequest {
    pub name: Option<String>,
    pub description: Option<String>,
}
