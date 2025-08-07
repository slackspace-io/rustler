use chrono::Utc;
use sqlx::{Pool, Postgres};

use crate::models::{Setting, UpdateSettingRequest};

pub struct SettingsService {
    db: Pool<Postgres>,
}

impl SettingsService {
    pub fn new(db: Pool<Postgres>) -> Self {
        Self { db }
    }

    /// Get a setting by key
    pub async fn get_setting(&self, key: &str) -> Result<Option<Setting>, sqlx::Error> {
        let setting = sqlx::query_as::<_, Setting>(
            r#"
            SELECT * FROM settings
            WHERE key = $1
            "#,
        )
        .bind(key)
        .fetch_optional(&self.db)
        .await?;

        Ok(setting)
    }

    /// Update a setting
    pub async fn update_setting(&self, key: &str, req: UpdateSettingRequest) -> Result<Setting, sqlx::Error> {
        let now = Utc::now();

        // Check if the setting exists
        let setting = self.get_setting(key).await?;

        if let Some(_) = setting {
            // Update existing setting
            let updated_setting = sqlx::query_as::<_, Setting>(
                r#"
                UPDATE settings
                SET value = $1, updated_at = $2
                WHERE key = $3
                RETURNING *
                "#,
            )
            .bind(&req.value)
            .bind(now)
            .bind(key)
            .fetch_one(&self.db)
            .await?;

            Ok(updated_setting)
        } else {
            // Create new setting
            let new_setting = sqlx::query_as::<_, Setting>(
                r#"
                INSERT INTO settings (key, value, created_at, updated_at)
                VALUES ($1, $2, $3, $4)
                RETURNING *
                "#,
            )
            .bind(key)
            .bind(&req.value)
            .bind(now)
            .bind(now)
            .fetch_one(&self.db)
            .await?;

            Ok(new_setting)
        }
    }

    /// Get the forecasted monthly income
    pub async fn get_forecasted_monthly_income(&self) -> Result<f64, sqlx::Error> {
        let setting = self.get_setting("forecasted_monthly_income").await?;

        match setting {
            Some(s) => {
                // Parse the value as f64
                match s.value.parse::<f64>() {
                    Ok(value) => Ok(value),
                    Err(_) => Ok(0.0), // Default to 0.0 if parsing fails
                }
            }
            None => Ok(0.0), // Default to 0.0 if setting doesn't exist
        }
    }

    /// Update the forecasted monthly income
    pub async fn update_forecasted_monthly_income(&self, amount: f64) -> Result<f64, sqlx::Error> {
        let req = UpdateSettingRequest {
            value: amount.to_string(),
        };

        let updated = self.update_setting("forecasted_monthly_income", req).await?;

        // Parse the updated value as f64
        match updated.value.parse::<f64>() {
            Ok(value) => Ok(value),
            Err(_) => Ok(0.0), // Default to 0.0 if parsing fails
        }
    }
}
