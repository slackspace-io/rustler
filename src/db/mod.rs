use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use std::time::Duration;

mod migrations;
mod double_entry_migration;
mod fix_null_destination_migration;
mod add_destination_name_migration;

pub use migrations::run_migrations;
pub use double_entry_migration::migrate_to_double_entry;
pub use fix_null_destination_migration::fix_null_destination_accounts;
pub use add_destination_name_migration::add_destination_name_column;

/// Initialize a connection pool to the database
pub async fn init_db_pool(database_url: &str) -> Result<Pool<Postgres>, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(database_url)
        .await
}

/// Check if the database connection is working
pub async fn check_db_connection(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    // Simple query to check if the connection is working
    sqlx::query("SELECT 1")
        .execute(pool)
        .await
        .map(|_| ())
}
