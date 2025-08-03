use chrono::{DateTime, Utc};
use sqlx::{Pool, Postgres};
use uuid::Uuid;

use crate::models::{Transaction, CreateTransactionRequest, UpdateTransactionRequest};

/// Service for handling transaction-related operations
pub struct TransactionService {
    db: Pool<Postgres>,
}

impl TransactionService {
    /// Create a new TransactionService with the given database pool
    pub fn new(db: Pool<Postgres>) -> Self {
        Self { db }
    }

    /// Get all transactions, with optional filtering
    pub async fn get_transactions(
        &self,
        account_id: Option<Uuid>,
        category: Option<&str>,
        start_date: Option<DateTime<Utc>>,
        end_date: Option<DateTime<Utc>>,
    ) -> Result<Vec<Transaction>, sqlx::Error> {
        let mut query = String::from("SELECT * FROM transactions WHERE 1=1");

        if let Some(account_id) = account_id {
            query.push_str(&format!(" AND account_id = '{}'", account_id));
        }

        if let Some(category) = category {
            query.push_str(&format!(" AND category = '{}'", category));
        }

        if let Some(start_date) = start_date {
            query.push_str(&format!(" AND transaction_date >= '{}'", start_date));
        }

        if let Some(end_date) = end_date {
            query.push_str(&format!(" AND transaction_date <= '{}'", end_date));
        }

        query.push_str(" ORDER BY transaction_date DESC");

        sqlx::query_as::<_, Transaction>(&query)
            .fetch_all(&self.db)
            .await
    }

    /// Get transactions for a specific account
    pub async fn get_account_transactions(&self, account_id: Uuid) -> Result<Vec<Transaction>, sqlx::Error> {
        sqlx::query_as::<_, Transaction>("SELECT * FROM transactions WHERE account_id = $1 ORDER BY transaction_date DESC")
            .bind(account_id)
            .fetch_all(&self.db)
            .await
    }

    /// Get a transaction by ID
    pub async fn get_transaction(&self, id: Uuid) -> Result<Option<Transaction>, sqlx::Error> {
        sqlx::query_as::<_, Transaction>("SELECT * FROM transactions WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.db)
            .await
    }

    /// Create a new transaction
    pub async fn create_transaction(&self, req: CreateTransactionRequest) -> Result<Transaction, sqlx::Error> {
        let now = chrono::Utc::now();
        let transaction_date = req.transaction_date.unwrap_or(now);

        // Start a transaction to update both the transaction table and the account balance
        let mut tx = self.db.begin().await?;

        // Create the transaction
        let transaction = sqlx::query_as::<_, Transaction>(
            r#"
            INSERT INTO transactions (id, account_id, description, amount, category, transaction_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(req.account_id)
        .bind(&req.description)
        .bind(req.amount)
        .bind(&req.category)
        .bind(transaction_date)
        .bind(now)
        .bind(now)
        .fetch_one(&mut *tx)
        .await?;

        // Update the account balance
        sqlx::query(
            r#"
            UPDATE accounts
            SET balance = balance + $1, updated_at = $2
            WHERE id = $3
            "#,
        )
        .bind(req.amount)
        .bind(now)
        .bind(req.account_id)
        .execute(&mut *tx)
        .await?;

        // Commit the transaction
        tx.commit().await?;

        Ok(transaction)
    }

    /// Update an existing transaction
    pub async fn update_transaction(&self, id: Uuid, req: UpdateTransactionRequest) -> Result<Option<Transaction>, sqlx::Error> {
        // First, check if the transaction exists and get the original amount
        let transaction = self.get_transaction(id).await?;

        if let Some(transaction) = transaction {
            // Start a database transaction
            let mut tx = self.db.begin().await?;

            // Build the update query dynamically based on which fields are provided
            let mut query = String::from("UPDATE transactions SET updated_at = $1");
            let mut params: Vec<String> = vec![];
            let now = chrono::Utc::now();

            // Calculate the difference in amount if it's being updated
            let amount_diff = if let Some(new_amount) = req.amount {
                let diff = new_amount - transaction.amount;
                params.push(format!("amount = {}", new_amount));
                Some(diff)
            } else {
                None
            };

            if let Some(description) = &req.description {
                params.push(format!("description = '{}'", description));
            }

            if let Some(category) = &req.category {
                params.push(format!("category = '{}'", category));
            }

            if let Some(transaction_date) = req.transaction_date {
                params.push(format!("transaction_date = '{}'", transaction_date));
            }

            if !params.is_empty() {
                query.push_str(", ");
                query.push_str(&params.join(", "));
            }

            query.push_str(" WHERE id = $2 RETURNING *");

            // Update the transaction
            let updated_transaction = sqlx::query_as::<_, Transaction>(&query)
                .bind(now)
                .bind(id)
                .fetch_optional(&mut *tx)
                .await?;

            // If the amount changed, update the account balance
            if let Some(diff) = amount_diff {
                if diff != 0.0 {
                    sqlx::query(
                        r#"
                        UPDATE accounts
                        SET balance = balance + $1, updated_at = $2
                        WHERE id = $3
                        "#,
                    )
                    .bind(diff)
                    .bind(now)
                    .bind(transaction.account_id)
                    .execute(&mut *tx)
                    .await?;
                }
            }

            // Commit the transaction
            tx.commit().await?;

            Ok(updated_transaction)
        } else {
            Ok(None)
        }
    }

    /// Delete a transaction
    pub async fn delete_transaction(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        // First, check if the transaction exists and get its details
        let transaction = self.get_transaction(id).await?;

        if let Some(transaction) = transaction {
            // Start a database transaction
            let mut tx = self.db.begin().await?;

            // Delete the transaction
            let result = sqlx::query("DELETE FROM transactions WHERE id = $1")
                .bind(id)
                .execute(&mut *tx)
                .await?;

            // Update the account balance (subtract the transaction amount)
            sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance - $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(transaction.amount)
            .bind(chrono::Utc::now())
            .bind(transaction.account_id)
            .execute(&mut *tx)
            .await?;

            // Commit the transaction
            tx.commit().await?;

            Ok(result.rows_affected() > 0)
        } else {
            Ok(false)
        }
    }
}
