use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Represents a setting in the system
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Setting {
    /// Unique identifier for the setting
    pub id: i32,
    /// Key name of the setting
    pub key: String,
    /// Value of the setting
    pub value: String,
    /// When the setting was created
    pub created_at: DateTime<Utc>,
    /// When the setting was last updated
    pub updated_at: DateTime<Utc>,
}

/// Request to update a setting
#[derive(Debug, Deserialize)]
pub struct UpdateSettingRequest {
    pub value: String,
}

/// Response for forecasted monthly income
#[derive(Debug, Serialize)]
pub struct ForecastedMonthlyIncomeResponse {
    pub forecasted_monthly_income: f64,
}
