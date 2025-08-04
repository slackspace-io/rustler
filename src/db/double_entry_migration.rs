use sqlx::{Pool, Postgres};
use tracing::info;
use uuid::Uuid;

/// Migrate the database to support full double entry accounting
pub async fn migrate_to_double_entry(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    info!("Running migration to implement full double entry accounting...");

    // Start a transaction for the entire migration
    let mut tx = pool.begin().await?;

    // 1. Create a temporary table to store unique payee names
    info!("Creating temporary table for unique payees...");
    sqlx::query(
        r#"
        CREATE TEMPORARY TABLE unique_payees AS
        SELECT DISTINCT payee_name
        FROM transactions
        WHERE payee_name IS NOT NULL AND destination_account_id IS NULL
        "#,
    )
    .execute(&mut *tx)
    .await?;

    // 2. Create accounts for each unique payee
    info!("Creating accounts for each unique payee...");
    let payees = sqlx::query_scalar::<_, String>("SELECT payee_name FROM unique_payees")
        .fetch_all(&mut *tx)
        .await?;

    for payee_name in payees {
        let now = chrono::Utc::now();
        let payee_id = Uuid::new_v4();

        info!("Creating account for payee: {}", payee_name);
        sqlx::query(
            r#"
            INSERT INTO accounts (id, name, account_type, balance, currency, created_at, updated_at)
            VALUES ($1, $2, 'PAYEE', 0.00, 'USD', $3, $4)
            "#,
        )
        .bind(payee_id)
        .bind(&payee_name)
        .bind(now)
        .bind(now)
        .execute(&mut *tx)
        .await?;

        // Update transactions to use the new payee account
        info!("Updating transactions for payee: {}", payee_name);
        sqlx::query(
            r#"
            UPDATE transactions
            SET destination_account_id = $1
            WHERE payee_name = $2
            "#,
        )
        .bind(payee_id)
        .bind(&payee_name)
        .execute(&mut *tx)
        .await?;
    }

    // 3. Drop the temporary table
    info!("Dropping temporary payees table...");
    sqlx::query("DROP TABLE unique_payees")
        .execute(&mut *tx)
        .await?;

    // 4. Update transaction balances for payee accounts
    info!("Updating balances for payee accounts...");
    let payee_transactions = sqlx::query!(
        r#"
        SELECT t.destination_account_id, SUM(t.amount) as total_amount
        FROM transactions t
        JOIN accounts a ON t.destination_account_id = a.id
        WHERE a.account_type = 'PAYEE'
        GROUP BY t.destination_account_id
        "#
    )
    .fetch_all(&mut *tx)
    .await?;

    for record in payee_transactions {
        if let (Some(payee_id), Some(total_amount)) = (record.destination_account_id, record.total_amount) {
            info!("Updating balance for payee account: {}", payee_id);
            sqlx::query(
                r#"
                UPDATE accounts
                SET balance = $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(total_amount)
            .bind(chrono::Utc::now())
            .bind(payee_id)
            .execute(&mut *tx)
            .await?;
        }
    }

    // 5. Make destination_account_id NOT NULL
    info!("Making destination_account_id NOT NULL...");

    // First check if there are any NULL destination_account_id values left
    let null_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM transactions WHERE destination_account_id IS NULL"
    )
    .fetch_one(&mut *tx)
    .await?;

    if null_count > 0 {
        return Err(sqlx::Error::Protocol(format!(
            "Cannot complete migration: {} transactions still have NULL destination_account_id",
            null_count
        )));
    }

    // Alter the table to make destination_account_id NOT NULL
    sqlx::query(
        r#"
        ALTER TABLE transactions
        ALTER COLUMN destination_account_id SET NOT NULL
        "#,
    )
    .execute(&mut *tx)
    .await?;

    // 6. Drop the payee_name column
    info!("Dropping payee_name column...");
    sqlx::query(
        r#"
        ALTER TABLE transactions
        DROP COLUMN payee_name
        "#,
    )
    .execute(&mut *tx)
    .await?;

    // Commit the transaction
    tx.commit().await?;
    info!("Double entry accounting migration completed successfully!");

    Ok(())
}
