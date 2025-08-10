use sqlx::{Pool, Postgres, Row};
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

    // Create transactions table with original schema
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

    // Check if we need to update the transactions table schema
    let column_exists = sqlx::query("SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'source_account_id'")
        .fetch_optional(pool)
        .await?;

    if column_exists.is_none() {
        info!("Updating transactions table schema to support source and destination accounts...");

        // Add new columns
        sqlx::query(
            r#"
            ALTER TABLE transactions
            ADD COLUMN source_account_id UUID,
            ADD COLUMN destination_account_id UUID NULL,
            ADD COLUMN payee_name VARCHAR(255) NULL
            "#,
        )
        .execute(pool)
        .await?;

        // Migrate existing data: set source_account_id to the current account_id
        sqlx::query(
            r#"
            UPDATE transactions
            SET source_account_id = account_id
            "#,
        )
        .execute(pool)
        .await?;

        // Make source_account_id NOT NULL after data migration
        sqlx::query(
            r#"
            ALTER TABLE transactions
            ALTER COLUMN source_account_id SET NOT NULL,
            ADD CONSTRAINT fk_source_account FOREIGN KEY (source_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
            ADD CONSTRAINT fk_destination_account FOREIGN KEY (destination_account_id) REFERENCES accounts(id) ON DELETE SET NULL
            "#,
        )
        .execute(pool)
        .await?;

        // Create index on source_account_id
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_transactions_source_account_id ON transactions(source_account_id)
            "#,
        )
        .execute(pool)
        .await?;

        // Create index on destination_account_id
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_transactions_destination_account_id ON transactions(destination_account_id)
            "#,
        )
        .execute(pool)
        .await?;
    }

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

    // Check if categories table exists
    let categories_table_exists = sqlx::query("SELECT to_regclass('public.categories')::text")
        .fetch_optional(pool)
        .await?;

    // Check if the table exists by safely handling the result
    let table_exists = match categories_table_exists {
        Some(row) => match row.try_get::<Option<String>, _>(0) {
            Ok(Some(table_name)) if !table_name.is_empty() => true,
            _ => false,
        },
        None => false,
    };

    if !table_exists {
        info!("Creating categories table...");

        // Create categories table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS categories (
                id UUID PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL
            )
            "#,
        )
        .execute(pool)
        .await?;

        // Create unique index on category name for faster lookups and to support ON CONFLICT
        sqlx::query(
            r#"
            CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories(name)
            "#,
        )
        .execute(pool)
        .await?;

        // Migrate existing categories from transactions table
        info!("Migrating existing categories...");

        // Get distinct categories from transactions
        let categories = sqlx::query("SELECT DISTINCT category FROM transactions")
            .fetch_all(pool)
            .await?;

        // Insert each category into the categories table
        let now = chrono::Utc::now();
        for row in categories {
            let category_name: String = row.get(0);
            let category_id = uuid::Uuid::new_v4();

            sqlx::query(
                r#"
                INSERT INTO categories (id, name, description, created_at, updated_at)
                VALUES ($1, $2, NULL, $3, $4)
                ON CONFLICT (name) DO NOTHING
                "#,
            )
            .bind(category_id)
            .bind(&category_name)
            .bind(now)
            .bind(now)
            .execute(pool)
            .await?;
        }
    }

    // Check if transactions table has category_id column
    let category_id_exists = sqlx::query("SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'category_id'")
        .fetch_optional(pool)
        .await?;

    if category_id_exists.is_none() {
        info!("Adding category_id to transactions table...");

        // Add category_id column to transactions table
        sqlx::query(
            r#"
            ALTER TABLE transactions
            ADD COLUMN category_id UUID NULL
            "#,
        )
        .execute(pool)
        .await?;

        // Create foreign key constraint
        sqlx::query(
            r#"
            ALTER TABLE transactions
            ADD CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
            "#,
        )
        .execute(pool)
        .await?;

        // Create index on category_id
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id)
            "#,
        )
        .execute(pool)
        .await?;

        // Backfill category_id from existing category names
        info!("Backfilling transactions.category_id from category names...");
        // Ensure categories exist for all names in transactions
        let rows = sqlx::query("SELECT DISTINCT category FROM transactions")
            .fetch_all(pool)
            .await?;
        let now = chrono::Utc::now();
        for row in rows {
            let cat_name: String = row.get(0);
            // Insert if missing
            let _ = sqlx::query(
                r#"
                INSERT INTO categories (id, name, description, created_at, updated_at)
                VALUES ($1, $2, NULL, $3, $4)
                ON CONFLICT (name) DO NOTHING
                "#,
            )
            .bind(uuid::Uuid::new_v4())
            .bind(&cat_name)
            .bind(now)
            .bind(now)
            .execute(pool)
            .await;
        }
        // Now set category_id where possible
        sqlx::query(
            r#"
            UPDATE transactions t
            SET category_id = c.id
            FROM categories c
            WHERE t.category_id IS NULL AND t.category = c.name
            "#,
        )
        .execute(pool)
        .await?;
    }

    // Check if budgets table exists
    let budgets_table_exists = sqlx::query("SELECT to_regclass('public.budgets')::text")
        .fetch_optional(pool)
        .await?;

    // Check if the table exists by safely handling the result
    let table_exists = match budgets_table_exists {
        Some(row) => match row.try_get::<Option<String>, _>(0) {
            Ok(Some(table_name)) if !table_name.is_empty() => true,
            _ => false,
        },
        None => false,
    };

    if !table_exists {
        info!("Creating budgets table...");

        // Create budgets table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS budgets (
                id UUID PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                amount FLOAT8 NOT NULL DEFAULT 0.00,
                start_date TIMESTAMPTZ NOT NULL,
                end_date TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL
            )
            "#,
        )
        .execute(pool)
        .await?;

        // Create index on budget name for faster lookups
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_budgets_name ON budgets(name)
            "#,
        )
        .execute(pool)
        .await?;

        // Create index on budget dates for faster date-based queries
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_budgets_dates ON budgets(start_date, end_date)
            "#,
        )
        .execute(pool)
        .await?;
    }

    // Check if transactions table has budget_id column
    let budget_id_exists = sqlx::query("SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'budget_id'")
        .fetch_optional(pool)
        .await?;

    if budget_id_exists.is_none() {
        info!("Adding budget_id to transactions table...");

        // Add budget_id column to transactions table
        sqlx::query(
            r#"
            ALTER TABLE transactions
            ADD COLUMN budget_id UUID NULL
            "#,
        )
        .execute(pool)
        .await?;

        // Create foreign key constraint
        sqlx::query(
            r#"
            ALTER TABLE transactions
            ADD CONSTRAINT fk_budget FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE SET NULL
            "#,
        )
        .execute(pool)
        .await?;

        // Create index on budget_id
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_transactions_budget_id ON transactions(budget_id)
            "#,
        )
        .execute(pool)
        .await?;
    }

    // Check if rules table exists
    let rules_table_exists = sqlx::query("SELECT to_regclass('public.rules')::text")
        .fetch_optional(pool)
        .await?;

    // Check if the table exists by safely handling the result
    let table_exists = match rules_table_exists {
        Some(row) => match row.try_get::<Option<String>, _>(0) {
            Ok(Some(table_name)) if !table_name.is_empty() => true,
            _ => false,
        },
        None => false,
    };

    if !table_exists {
        info!("Creating rules table...");

        // Create rules table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS rules (
                id UUID PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                priority INTEGER NOT NULL DEFAULT 100,
                conditions_json TEXT NOT NULL,
                actions_json TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL
            )
            "#,
        )
        .execute(pool)
        .await?;

        // Create index on rule name for faster lookups
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_rules_name ON rules(name)
            "#,
        )
        .execute(pool)
        .await?;

        // Create index on is_active and priority for faster rule application
        sqlx::query(
            r#"
            CREATE INDEX IF NOT EXISTS idx_rules_active_priority ON rules(is_active, priority)
            "#,
        )
        .execute(pool)
        .await?;
    }

    // Add is_default column to accounts table if it doesn't exist
    let is_default_column_exists = sqlx::query("SELECT column_name FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'is_default'")
        .fetch_optional(pool)
        .await?;

    if is_default_column_exists.is_none() {
        info!("Adding is_default column to accounts table...");

        // Add is_default column with default value of false
        sqlx::query(
            r#"
            ALTER TABLE accounts
            ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false
            "#,
        )
        .execute(pool)
        .await?;

        // Add a constraint to ensure only one account can be default
        sqlx::query(
            r#"
            CREATE UNIQUE INDEX idx_accounts_is_default
            ON accounts (is_default)
            WHERE is_default = true
            "#,
        )
        .execute(pool)
        .await?;
    }

    info!("Database migrations completed successfully");
    Ok(())
}
