use sqlx::{Pool, Postgres};
use uuid::Uuid;

use crate::models::{Account, CreateAccountRequest, UpdateAccountRequest};

/// Service for handling account-related operations
pub struct AccountService {
    db: Pool<Postgres>,
}

impl AccountService {
    /// Create a new AccountService with the given database pool
    pub fn new(db: Pool<Postgres>) -> Self {
        Self { db }
    }

    /// Get all accounts
    pub async fn get_accounts(&self) -> Result<Vec<Account>, sqlx::Error> {
        sqlx::query_as::<_, Account>("SELECT * FROM accounts ORDER BY name")
            .fetch_all(&self.db)
            .await
    }

    /// Get an account by ID
    pub async fn get_account(&self, id: Uuid) -> Result<Option<Account>, sqlx::Error> {
        sqlx::query_as::<_, Account>("SELECT * FROM accounts WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.db)
            .await
    }

    /// Create a new account
    pub async fn create_account(&self, req: CreateAccountRequest) -> Result<Account, sqlx::Error> {
        let now = chrono::Utc::now();

        sqlx::query_as::<_, Account>(
            r#"
            INSERT INTO accounts (id, name, account_type, balance, currency, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(&req.name)
        .bind(&req.account_type)
        .bind(req.balance)
        .bind(&req.currency)
        .bind(now)
        .bind(now)
        .fetch_one(&self.db)
        .await
    }

    /// Update an existing account
    pub async fn update_account(&self, id: Uuid, req: UpdateAccountRequest) -> Result<Option<Account>, sqlx::Error> {
        // First, check if the account exists
        let account = self.get_account(id).await?;

        if let Some(account) = account {
            // Build the update query dynamically based on which fields are provided
            let mut query = String::from("UPDATE accounts SET updated_at = $1");
            let mut params: Vec<String> = vec![];
            let now = chrono::Utc::now();

            if let Some(name) = &req.name {
                params.push(format!("name = '{}'", name));
            }

            if let Some(account_type) = &req.account_type {
                params.push(format!("account_type = '{}'", account_type));
            }

            if let Some(balance) = req.balance {
                params.push(format!("balance = {}", balance));
            }

            if let Some(currency) = &req.currency {
                params.push(format!("currency = '{}'", currency));
            }

            if !params.is_empty() {
                query.push_str(", ");
                query.push_str(&params.join(", "));
            }

            query.push_str(" WHERE id = $2 RETURNING *");

            sqlx::query_as::<_, Account>(&query)
                .bind(now)
                .bind(id)
                .fetch_optional(&self.db)
                .await
        } else {
            Ok(None)
        }
    }

    /// Delete an account
    pub async fn delete_account(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        // First, check if the account exists
        let account = self.get_account(id).await?;

        if account.is_none() {
            println!("Account with id {} not found, cannot delete", id);
            return Ok(false);
        }

        println!("Attempting to delete account with id: {}", id);

        // Check if there are any transactions where this account is used as source or destination
        let source_transactions_count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM transactions WHERE source_account_id = $1"
        )
        .bind(id)
        .fetch_one(&self.db)
        .await?;

        let destination_transactions_count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM transactions WHERE destination_account_id = $1"
        )
        .bind(id)
        .fetch_one(&self.db)
        .await?;

        let total_transactions = source_transactions_count + destination_transactions_count;
        println!("Found {} transactions for account {} ({} as source, {} as destination)",
                 total_transactions, id, source_transactions_count, destination_transactions_count);

        if total_transactions > 0 {
            println!("Cannot delete account with existing transactions");
            return Ok(false);
        }

        // Use a transaction to ensure atomicity
        let mut tx = self.db.begin().await?;

        // Delete the account
        let result = sqlx::query("DELETE FROM accounts WHERE id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        let rows_affected = result.rows_affected();
        println!("Delete query affected {} rows for account {}", rows_affected, id);

        // Commit the transaction
        println!("Committing transaction...");
        tx.commit().await?;
        println!("Transaction committed successfully");

        Ok(rows_affected > 0)
    }
}
