use sqlx::{Pool, Postgres};
use tracing::info;

/// Migrate the database to update accounts with account_type = 'DESTINATION' to use 'External'
pub async fn update_destination_account_type(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    info!("Running migration to update account_type from 'DESTINATION' to 'External'...");

    // 1. Check if there are any accounts with account_type = 'DESTINATION'
    let count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM accounts WHERE account_type = 'DESTINATION'"
    )
    .fetch_one(pool)
    .await?;

    if count == 0 {
        info!("No accounts with account_type = 'DESTINATION' found. Migration not needed.");
        return Ok(());
    }

    info!("Found {} accounts with account_type = 'DESTINATION'", count);

    // 2. Update all accounts with account_type = 'DESTINATION' to use 'External'
    info!("Updating accounts with account_type = 'DESTINATION' to use 'External'...");

    let updated = sqlx::query(
        r#"
        UPDATE accounts
        SET account_type = 'External'
        WHERE account_type = 'DESTINATION'
        "#
    )
    .execute(pool)
    .await?;

    info!("Updated {} accounts from 'DESTINATION' to 'External'", updated.rows_affected());

    // 3. Verify that there are no more accounts with account_type = 'DESTINATION'
    let remaining = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM accounts WHERE account_type = 'DESTINATION'"
    )
    .fetch_one(pool)
    .await?;

    if remaining > 0 {
        info!(
            "Migration warning: {} accounts still have account_type = 'DESTINATION'",
            remaining
        );
    } else {
        info!("Account type migration completed successfully!");
    }

    Ok(())
}
