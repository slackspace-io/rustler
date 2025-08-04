use sqlx::{Pool, Postgres};
use tracing::info;

/// Add destination_name column to transactions table
pub async fn add_destination_name_column(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    info!("Running migration to add destination_name column to transactions table...");

    // Check if the column already exists
    let column_exists = sqlx::query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'destination_name'"
    )
    .fetch_optional(pool)
    .await?;

    if column_exists.is_some() {
        info!("destination_name column already exists. Migration not needed.");
        return Ok(());
    }

    // Start a transaction for the migration
    let mut tx = pool.begin().await?;

    // Add the destination_name column
    info!("Adding destination_name column to transactions table...");
    sqlx::query(
        r#"
        ALTER TABLE transactions
        ADD COLUMN destination_name VARCHAR(255) NULL
        "#,
    )
    .execute(&mut *tx)
    .await?;

    // Populate the destination_name column based on destination_account_id
    info!("Populating destination_name column from destination accounts...");
    sqlx::query(
        r#"
        UPDATE transactions t
        SET destination_name = a.name
        FROM accounts a
        WHERE t.destination_account_id = a.id
        "#,
    )
    .execute(&mut *tx)
    .await?;

    // Commit the transaction
    tx.commit().await?;
    info!("destination_name column migration completed successfully!");

    Ok(())
}
