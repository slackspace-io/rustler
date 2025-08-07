use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Represents a transaction category in the system
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Category {
    /// Unique identifier for the category
    pub id: Uuid,
    /// Name of the category (e.g., "Food", "Transportation")
    pub name: String,
    /// Description of the category (optional)
    pub description: Option<String>,
    /// ID of the category group this category belongs to (optional)
    pub group_id: Option<Uuid>,
    /// When the category was created
    pub created_at: DateTime<Utc>,
    /// When the category was last updated
    pub updated_at: DateTime<Utc>,
}

/// Data required to create a new category
#[derive(Debug, Deserialize)]
pub struct CreateCategoryRequest {
    pub name: String,
    pub description: Option<String>,
    pub group_id: Option<Uuid>,
}

/// Data required to update an existing category
#[derive(Debug, Deserialize)]
pub struct UpdateCategoryRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub group_id: Option<Uuid>,
}
