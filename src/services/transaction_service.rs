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
        source_account_id: Option<Uuid>,
        category: Option<&str>,
        start_date: Option<DateTime<Utc>>,
        end_date: Option<DateTime<Utc>>,
    ) -> Result<Vec<Transaction>, sqlx::Error> {
        let mut query = String::from("SELECT * FROM transactions WHERE 1=1");

        if let Some(source_account_id) = source_account_id {
            query.push_str(&format!(" AND source_account_id = '{}'", source_account_id));
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
    pub async fn get_account_transactions(&self, source_account_id: Uuid) -> Result<Vec<Transaction>, sqlx::Error> {
        sqlx::query_as::<_, Transaction>("SELECT * FROM transactions WHERE source_account_id = $1 ORDER BY transaction_date DESC")
            .bind(source_account_id)
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

        // Start a transaction to update both the transaction table and the account balance(s)
        let mut tx = self.db.begin().await?;

        // Create the transaction
        let transaction = sqlx::query_as::<_, Transaction>(
            r#"
            INSERT INTO transactions (id, account_id, source_account_id, destination_account_id, payee_name, description, amount, category, transaction_date, created_at, updated_at)
            VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(req.source_account_id)
        .bind(req.destination_account_id)
        .bind(req.payee_name)
        .bind(&req.description)
        .bind(req.amount)
        .bind(&req.category)
        .bind(transaction_date)
        .bind(now)
        .bind(now)
        .fetch_one(&mut *tx)
        .await?;

        // Update the source account balance
        // If amount is positive, subtract it (outgoing)
        // If amount is negative, add the absolute value (incoming)
        let amount_to_adjust = req.amount.abs();
        let adjustment = if req.amount >= 0.0 { -amount_to_adjust } else { amount_to_adjust };

        sqlx::query(
            r#"
            UPDATE accounts
            SET balance = balance + $1, updated_at = $2
            WHERE id = $3
            "#,
        )
        .bind(adjustment)
        .bind(now)
        .bind(req.source_account_id)
        .execute(&mut *tx)
        .await?;

        // If there's a destination account, update its balance (add the amount)
        if let Some(destination_account_id) = req.destination_account_id {
            sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance + $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(req.amount)
            .bind(now)
            .bind(destination_account_id)
            .execute(&mut *tx)
            .await?;
        }

        // Commit the transaction
        tx.commit().await?;

        Ok(transaction)
    }

    /// Update an existing transaction
    pub async fn update_transaction(&self, id: Uuid, req: UpdateTransactionRequest) -> Result<Option<Transaction>, sqlx::Error> {
        // First, check if the transaction exists and get the original details
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
                Some((diff, new_amount))
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

            // Handle destination account and payee name updates
            if let Some(destination_account_id) = req.destination_account_id {
                params.push(format!("destination_account_id = '{}'", destination_account_id));
                params.push("payee_name = NULL".to_string());
            } else if let Some(payee_name) = &req.payee_name {
                params.push("destination_account_id = NULL".to_string());
                params.push(format!("payee_name = '{}'", payee_name));
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

            // If the amount changed, update the source account balance
            if let Some((diff, new_amount)) = amount_diff {
                if diff != 0.0 {
                    // Update source account (add the negative diff to reverse the original transaction)
                    sqlx::query(
                        r#"
                        UPDATE accounts
                        SET balance = balance + $1, updated_at = $2
                        WHERE id = $3
                        "#,
                    )
                    .bind(diff)
                    .bind(now)
                    .bind(transaction.source_account_id)
                    .execute(&mut *tx)
                    .await?;

                    // If there was a destination account, update its balance too
                    if let Some(dest_id) = transaction.destination_account_id {
                        // Reverse the effect on the destination account
                        sqlx::query(
                            r#"
                            UPDATE accounts
                            SET balance = balance - $1, updated_at = $2
                            WHERE id = $3
                            "#,
                        )
                        .bind(transaction.amount)
                        .bind(now)
                        .bind(dest_id)
                        .execute(&mut *tx)
                        .await?;

                        // If there's still a destination account (might be different), add the new amount
                        if let Some(new_dest_id) = req.destination_account_id.or(transaction.destination_account_id) {
                            sqlx::query(
                                r#"
                                UPDATE accounts
                                SET balance = balance + $1, updated_at = $2
                                WHERE id = $3
                                "#,
                            )
                            .bind(new_amount)
                            .bind(now)
                            .bind(new_dest_id)
                            .execute(&mut *tx)
                            .await?;
                        }
                    } else if let Some(new_dest_id) = req.destination_account_id {
                        // If there's a new destination account, add the amount
                        sqlx::query(
                            r#"
                            UPDATE accounts
                            SET balance = balance + $1, updated_at = $2
                            WHERE id = $3
                            "#,
                        )
                        .bind(new_amount)
                        .bind(now)
                        .bind(new_dest_id)
                        .execute(&mut *tx)
                        .await?;
                    }
                }
            } else if req.destination_account_id.is_some() && req.destination_account_id != transaction.destination_account_id {
                // If only the destination account changed (not the amount)

                // If there was a previous destination account, reverse its balance change
                if let Some(old_dest_id) = transaction.destination_account_id {
                    sqlx::query(
                        r#"
                        UPDATE accounts
                        SET balance = balance - $1, updated_at = $2
                        WHERE id = $3
                        "#,
                    )
                    .bind(transaction.amount)
                    .bind(now)
                    .bind(old_dest_id)
                    .execute(&mut *tx)
                    .await?;
                }

                // Add the amount to the new destination account
                if let Some(new_dest_id) = req.destination_account_id {
                    sqlx::query(
                        r#"
                        UPDATE accounts
                        SET balance = balance + $1, updated_at = $2
                        WHERE id = $3
                        "#,
                    )
                    .bind(transaction.amount)
                    .bind(now)
                    .bind(new_dest_id)
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
            .bind(transaction.source_account_id)
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
