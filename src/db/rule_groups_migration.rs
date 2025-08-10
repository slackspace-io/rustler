use sqlx::{Pool, Postgres, Row};
use tracing::info;

/// Add rule groups functionality
pub async fn add_rule_groups(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    info!("Running migration to add rule groups functionality...");

    // Check if the rule_groups table already exists
    let table_exists = sqlx::query("SELECT to_regclass('public.rule_groups')::text")
        .fetch_optional(pool)
        .await?;

    let exists = match table_exists {
        Some(row) => match row.try_get::<Option<String>, _>(0) {
            Ok(Some(table_name)) if !table_name.is_empty() => true,
            _ => false,
        },
        None => false,
    };

    // Start a transaction for the migration
    let mut tx = pool.begin().await?;

    if !exists {
        // Create rule_groups table
        info!("Creating rule_groups table...");
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS rule_groups (
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

        // Create unique index on rule group name
        sqlx::query(
            r#"
            CREATE UNIQUE INDEX IF NOT EXISTS idx_rule_groups_name ON rule_groups(name)
            "#,
        )
        .execute(&mut *tx)
        .await?;
    } else {
        info!("rule_groups table already exists. Migration not needed for table creation.");
    }

    // Check if group_id column exists on rules
    let column_exists = sqlx::query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'rules' AND column_name = 'group_id'",
    )
    .fetch_optional(&mut *tx)
    .await?;

    if column_exists.is_none() {
        info!("Adding group_id column to rules table...");
        sqlx::query(
            r#"
            ALTER TABLE rules
            ADD COLUMN group_id UUID NULL
            "#,
        )
        .execute(&mut *tx)
        .await?;

        // Ensure rule_groups table exists before adding FK (defensive)
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS rule_groups (
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

        // Add foreign key constraint
        sqlx::query(
            r#"
            ALTER TABLE rules
            ADD CONSTRAINT fk_rule_group FOREIGN KEY (group_id) REFERENCES rule_groups(id) ON DELETE SET NULL
            "#,
        )
        .execute(&mut *tx)
        .await?;

        // Create index on rules.group_id
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_rules_group_id ON rules(group_id)
            "#,
        )
        .execute(&mut *tx)
        .await?;
    } else {
        info!("rules.group_id column already exists.");
    }

    // Commit the transaction
    tx.commit().await?;
    info!("Rule groups migration completed successfully!");

    Ok(())
}
