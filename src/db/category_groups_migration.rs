use sqlx::{Pool, Postgres, Row};
use tracing::info;

/// Add category groups functionality
pub async fn add_category_groups(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    info!("Running migration to add category groups functionality...");

    // Check if the category_groups table already exists
    let table_exists = sqlx::query("SELECT to_regclass('public.category_groups')::text")
        .fetch_optional(pool)
        .await?;

    // Check if the table exists by safely handling the result
    let exists = match table_exists {
        Some(row) => match row.try_get::<Option<String>, _>(0) {
            Ok(Some(table_name)) if !table_name.is_empty() => true,
            _ => false,
        },
        None => false,
    };

    if exists {
        info!("category_groups table already exists. Migration not needed.");
        return Ok(());
    }

    // Start a transaction for the migration
    let mut tx = pool.begin().await?;

    // Create category_groups table
    info!("Creating category_groups table...");
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS category_groups (
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

    // Create unique index on category group name for faster lookups and to support ON CONFLICT
    sqlx::query(
        r#"
        CREATE UNIQUE INDEX IF NOT EXISTS idx_category_groups_name ON category_groups(name)
        "#,
    )
    .execute(&mut *tx)
    .await?;

    // Check if the group_id column already exists in the categories table
    let column_exists = sqlx::query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'group_id'"
    )
    .fetch_optional(&mut *tx)
    .await?;

    if column_exists.is_none() {
        // Add group_id column to categories table
        info!("Adding group_id column to categories table...");
        sqlx::query(
            r#"
            ALTER TABLE categories
            ADD COLUMN group_id UUID NULL
            "#,
        )
        .execute(&mut *tx)
        .await?;

        // Create foreign key constraint
        sqlx::query(
            r#"
            ALTER TABLE categories
            ADD CONSTRAINT fk_category_group FOREIGN KEY (group_id) REFERENCES category_groups(id) ON DELETE SET NULL
            "#,
        )
        .execute(&mut *tx)
        .await?;

        // Create index on group_id
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_categories_group_id ON categories(group_id)
            "#,
        )
        .execute(&mut *tx)
        .await?;
    }

    // Commit the transaction
    tx.commit().await?;
    info!("Category groups migration completed successfully!");

    Ok(())
}
