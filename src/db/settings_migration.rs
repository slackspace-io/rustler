use sqlx::{Pool, Postgres, Row};
use tracing::info;

/// Add settings table with forecasted_monthly_income
pub async fn add_settings_table(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    info!("Running migration to add settings table with forecasted_monthly_income...");

    // Check if settings table exists
    let settings_table_exists = sqlx::query("SELECT to_regclass('public.settings')::text")
        .fetch_optional(pool)
        .await?;

    // Check if the table exists by safely handling the result
    let table_exists = match settings_table_exists {
        Some(row) => match row.try_get::<Option<String>, _>(0) {
            Ok(Some(table_name)) if !table_name.is_empty() => true,
            _ => false,
        },
        None => false,
    };

    if !table_exists {
        info!("Creating settings table...");

        // Create settings table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                key VARCHAR(255) NOT NULL UNIQUE,
                value TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL
            )
            "#,
        )
        .execute(pool)
        .await?;

        // Create index on key for faster lookups
        sqlx::query(
            r#"
            CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key ON settings(key)
            "#,
        )
        .execute(pool)
        .await?;

        // Insert default forecasted_monthly_income setting
        let now = chrono::Utc::now();
        sqlx::query(
            r#"
            INSERT INTO settings (key, value, created_at, updated_at)
            VALUES ('forecasted_monthly_income', '0.0', $1, $2)
            "#,
        )
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        info!("Settings table created successfully with default forecasted_monthly_income!");
    } else {
        // Check if forecasted_monthly_income setting exists
        let forecasted_income_exists = sqlx::query("SELECT key FROM settings WHERE key = 'forecasted_monthly_income'")
            .fetch_optional(pool)
            .await?;

        if forecasted_income_exists.is_none() {
            // Insert forecasted_monthly_income setting if it doesn't exist
            let now = chrono::Utc::now();
            sqlx::query(
                r#"
                INSERT INTO settings (key, value, created_at, updated_at)
                VALUES ('forecasted_monthly_income', '0.0', $1, $2)
                "#,
            )
            .bind(now)
            .bind(now)
            .execute(pool)
            .await?;

            info!("Added forecasted_monthly_income setting to existing settings table!");
        } else {
            info!("forecasted_monthly_income setting already exists. No changes needed.");
        }
    }

    Ok(())
}
