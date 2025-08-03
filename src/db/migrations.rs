use sqlx::{Pool, Postgres};
use tracing::info;

/// Run database migrations to set up the schema
pub async fn run_migrations(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    info!("Running database migrations...");

    // Create accounts table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS accounts (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            account_type VARCHAR(50) NOT NULL,
            balance FLOAT8 NOT NULL DEFAULT 0.00,
            currency VARCHAR(10) NOT NULL DEFAULT 'USD',
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create transactions table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS transactions (
            id UUID PRIMARY KEY,
            account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            description VARCHAR(255) NOT NULL,
            amount FLOAT8 NOT NULL,
            category VARCHAR(100) NOT NULL,
            transaction_date TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Alter column types if they exist with incompatible types
    // This handles the case where the database was created with NUMERIC types
    // but the Rust code expects FLOAT8 (f64)
    info!("Checking and updating column types if needed...");

    // Try to alter the balance column in accounts table
    let alter_accounts_result = sqlx::query(
        r#"
        ALTER TABLE accounts
        ALTER COLUMN balance TYPE FLOAT8
        USING balance::FLOAT8
        "#,
    )
    .execute(pool)
    .await;

    // Log the result but don't fail if it errors (might already be the right type)
    match alter_accounts_result {
        Ok(_) => info!("Successfully altered accounts.balance to FLOAT8"),
        Err(e) => info!("Note: Could not alter accounts.balance: {}", e),
    }

    // Try to alter the amount column in transactions table
    let alter_transactions_result = sqlx::query(
        r#"
        ALTER TABLE transactions
        ALTER COLUMN amount TYPE FLOAT8
        USING amount::FLOAT8
        "#,
    )
    .execute(pool)
    .await;

    // Log the result but don't fail if it errors
    match alter_transactions_result {
        Ok(_) => info!("Successfully altered transactions.amount to FLOAT8"),
        Err(e) => info!("Note: Could not alter transactions.amount: {}", e),
    };

    // Create index on account_id for faster lookups
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id)
        "#,
    )
    .execute(pool)
    .await?;

    // Create index on transaction_date for faster date-based queries
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)
        "#,
    )
    .execute(pool)
    .await?;

    info!("Database migrations completed successfully");
    Ok(())
}
