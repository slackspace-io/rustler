use sqlx::{Pool, Postgres};
use tracing::info;
use uuid::Uuid;

/// Migrate the database to fix any NULL destination_account_id values
pub async fn fix_null_destination_accounts(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    info!("Running migration to fix NULL destination_account_id values...");

    // Start a transaction for the entire migration
    let mut tx = pool.begin().await?;

    // 1. Check if there are any NULL destination_account_id values
    let null_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM transactions WHERE destination_account_id IS NULL"
    )
    .fetch_one(&mut *tx)
    .await?;

    if null_count == 0 {
        info!("No NULL destination_account_id values found. Migration not needed.");
        tx.commit().await?;
        return Ok(());
    }

    info!("Found {} transactions with NULL destination_account_id", null_count);

    // 2. Create a special "Unknown Destination" account to use for transactions with NULL destination_account_id
    let now = chrono::Utc::now();
    let unknown_destination_id = Uuid::new_v4();

    // Check if the "Unknown Destination" account already exists
    let unknown_destination = sqlx::query!(
        "SELECT id FROM accounts WHERE name = 'Unknown Destination' AND account_type = 'DESTINATION'"
    )
    .fetch_optional(&mut *tx)
    .await?;

    let unknown_destination_id = if let Some(record) = unknown_destination {
        info!("Using existing 'Unknown Destination' account: {}", record.id);
        record.id
    } else {
        info!("Creating 'Unknown Destination' account: {}", unknown_destination_id);
        sqlx::query(
            r#"
            INSERT INTO accounts (id, name, account_type, balance, currency, created_at, updated_at)
            VALUES ($1, 'Unknown Destination', 'DESTINATION', 0.00, 'USD', $2, $3)
            "#,
        )
        .bind(unknown_destination_id)
        .bind(now)
        .bind(now)
        .execute(&mut *tx)
        .await?;
        unknown_destination_id
    };

    // 3. Update all transactions with NULL destination_account_id to use the "Unknown Destination" account
    info!("Updating transactions with NULL destination_account_id to use 'Unknown Destination' account...");
    let updated_count = sqlx::query(
        r#"
        UPDATE transactions
        SET destination_account_id = $1
        WHERE destination_account_id IS NULL
        "#,
    )
    .bind(unknown_destination_id)
    .execute(&mut *tx)
    .await?;

    info!("Updated {} transactions", updated_count.rows_affected());

    // 4. Update the "Unknown Destination" account balance
    info!("Updating 'Unknown Destination' account balance...");
    let total_amount = sqlx::query_scalar::<_, Option<f64>>(
        r#"
        SELECT SUM(amount)
        FROM transactions
        WHERE destination_account_id = $1
        "#,
    )
    .bind(unknown_destination_id)
    .fetch_one(&mut *tx)
    .await?;

    if let Some(amount) = total_amount {
        info!("Setting 'Unknown Destination' account balance to: {}", amount);
        sqlx::query(
            r#"
            UPDATE accounts
            SET balance = $1, updated_at = $2
            WHERE id = $3
            "#,
        )
        .bind(amount)
        .bind(now)
        .bind(unknown_destination_id)
        .execute(&mut *tx)
        .await?;
    }

    // 5. Verify that there are no more NULL destination_account_id values
    let null_count_after = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM transactions WHERE destination_account_id IS NULL"
    )
    .fetch_one(&mut *tx)
    .await?;

    if null_count_after > 0 {
        return Err(sqlx::Error::Protocol(format!(
            "Migration failed: {} transactions still have NULL destination_account_id",
            null_count_after
        )));
    }

    // Commit the transaction
    tx.commit().await?;
    info!("NULL destination_account_id fix migration completed successfully!");

    Ok(())
}
