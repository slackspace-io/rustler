use sqlx::{Pool, Postgres, Row};
use tracing::info;

/// Add budget groups functionality
pub async fn add_budget_groups(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    info!("Running migration to add budget groups functionality...");

    // Check if the budget_groups table already exists
    let table_exists = sqlx::query("SELECT to_regclass('public.budget_groups')::text")
        .fetch_optional(pool)
        .await?;

    let exists = match table_exists {
        Some(row) => match row.try_get::<Option<String>, _>(0) {
            Ok(Some(table_name)) if !table_name.is_empty() => true,
            _ => false,
        },
        None => false,
    };

    if exists {
        info!("budget_groups table already exists. Checking budgets.group_id column...");
    } else {
        // Start a transaction for creating table and constraints
        let mut tx = pool.begin().await?;

        // Create budget_groups table
        info!("Creating budget_groups table...");
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS budget_groups (
                id UUID PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL
            )
            "#,
        )
        .execute(&mut *tx)
        .await?;

        // Create unique index on name
        sqlx::query(
            r#"
            CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_groups_name ON budget_groups(name)
            "#,
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
    }

    // Ensure budgets.group_id column exists and is wired
    let mut tx = pool.begin().await?;

    let column_exists = sqlx::query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'group_id'",
    )
    .fetch_optional(&mut *tx)
    .await?;

    if column_exists.is_none() {
        info!("Adding group_id column to budgets table...");
        sqlx::query(
            r#"
            ALTER TABLE budgets
            ADD COLUMN group_id UUID NULL
            "#,
        )
        .execute(&mut *tx)
        .await?;

        // Add FK constraint to budget_groups (create table if not exists again defensively)
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS budget_groups (
                id UUID PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL
            )
            "#,
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query(
            r#"
            ALTER TABLE budgets
            ADD CONSTRAINT fk_budget_group FOREIGN KEY (group_id) REFERENCES budget_groups(id) ON DELETE SET NULL
            "#,
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_budgets_group_id ON budgets(group_id)
            "#,
        )
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    info!("Budget groups migration completed successfully!");
    Ok(())
}
