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
            balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
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
            amount DECIMAL(15, 2) NOT NULL,
            category VARCHAR(100) NOT NULL,
            transaction_date TIMESTAMPTZ NOT NULL,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        )
        "#,
    )
    .execute(pool)
    .await?;

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
