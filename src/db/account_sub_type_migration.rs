use sqlx::{Pool, Postgres, Row};
use tracing::info;

/// Migrate the database to add account_sub_type field and split existing account_type values
pub async fn add_account_sub_type(pool: &Pool<Postgres>) -> Result<(), sqlx::Error> {
    info!("Running migration to add account_sub_type field and split existing account_type values...");

    // 1. Check if the account_sub_type column already exists
    let column_exists = sqlx::query(
        "SELECT column_name FROM information_schema.columns
         WHERE table_name = 'accounts' AND column_name = 'account_sub_type'"
    )
    .fetch_optional(pool)
    .await?;

    if column_exists.is_some() {
        info!("account_sub_type column already exists. Migration not needed.");
        return Ok(());
    }

    // 2. Add the account_sub_type column to the accounts table
    info!("Adding account_sub_type column to accounts table...");
    sqlx::query(
        "ALTER TABLE accounts
         ADD COLUMN account_sub_type VARCHAR(50) NULL"
    )
    .execute(pool)
    .await?;

    // 3. Get all accounts to update their account_sub_type
    let accounts = sqlx::query("SELECT id, account_type FROM accounts")
        .fetch_all(pool)
        .await?;

    info!("Found {} accounts to update", accounts.len());

    // 4. Update each account with the parsed account_sub_type
    let mut updated_count = 0;
    for account in accounts {
        let id: uuid::Uuid = account.get("id");
        let account_type: String = account.get("account_type");

        // Parse the account type and subtype
        let (main_type, sub_type) = parse_account_type(&account_type);

        // Update the account with the parsed values
        let result = sqlx::query(
            "UPDATE accounts
             SET account_type = $1, account_sub_type = $2
             WHERE id = $3"
        )
        .bind(main_type)
        .bind(sub_type)
        .bind(id)
        .execute(pool)
        .await?;

        if result.rows_affected() > 0 {
            updated_count += 1;
        }
    }

    info!("Updated {} accounts with parsed account_sub_type values", updated_count);

    // 5. Verify that all accounts have been updated correctly
    let null_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM accounts WHERE account_sub_type IS NULL AND account_type != 'External'"
    )
    .fetch_one(pool)
    .await?;

    if null_count > 0 {
        info!(
            "Migration warning: {} non-External accounts still have NULL account_sub_type",
            null_count
        );
    } else {
        info!("Account sub-type migration completed successfully!");
    }

    Ok(())
}

/// Parse account type and subtype from combined string
/// Format: "On Budget - Credit Card" -> ("On Budget", "Credit Card")
fn parse_account_type(full_type: &str) -> (String, Option<String>) {
    if full_type.is_empty() {
        return (String::from(""), None);
    }

    // Trim the input string to handle any extra whitespace
    let trimmed_type = full_type.trim();

    // Special case for External accounts - they don't have subtypes
    if trimmed_type == "External" {
        return (String::from("External"), None);
    }

    // Check if the account type contains a subtype (format: "Type - Subtype")
    // Use a regex that handles variable whitespace around the separator
    let parts: Vec<&str> = trimmed_type.split(" - ").collect();

    // Filter out any empty parts that might result from extra separators
    let filtered_parts: Vec<&str> = parts.iter()
        .map(|part| part.trim())
        .filter(|part| !part.is_empty())
        .collect();

    if filtered_parts.len() > 1 {
        // If it has a subtype, return the main type and subtype separately
        (
            filtered_parts[0].to_string(),
            Some(filtered_parts[1].to_string())
        )
    } else {
        // If it doesn't have a subtype, return just the main type
        (trimmed_type.to_string(), None)
    }
}
