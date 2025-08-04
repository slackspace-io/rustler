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

    /// Get transactions for a specific account (both as source and destination)
    pub async fn get_account_transactions(&self, account_id: Uuid) -> Result<Vec<Transaction>, sqlx::Error> {
        sqlx::query_as::<_, Transaction>(
            r#"
            SELECT * FROM transactions
            WHERE source_account_id = $1 OR destination_account_id = $1
            ORDER BY transaction_date DESC
            "#
        )
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

        // Start a transaction to update both the transaction table and the account balance(s)
        let mut tx = self.db.begin().await?;

        // Determine if this is a transfer (destination matches an on or off budget account)
        // or an external account (which should be created if it doesn't exist)
        let destination_account_id = if let Some(dest_id) = req.destination_account_id {
            // If destination_account_id is provided, use it directly
            dest_id
        } else {
            // Get the destination name to use for matching or creating an account
            let dest_name = req.destination_name.as_ref().map(|s| s.as_str()).unwrap_or(&req.description);

            // Check if there's an existing account that matches the destination name
            let existing_account = sqlx::query!(
                "SELECT id FROM accounts WHERE name = $1",
                dest_name
            )
            .fetch_optional(&mut *tx)
            .await?;

            if let Some(record) = existing_account {
                // Use the existing account
                record.id
            } else {
                // Create a new external account
                let new_account_id = Uuid::new_v4();
                sqlx::query(
                    r#"
                    INSERT INTO accounts (id, name, account_type, balance, currency, created_at, updated_at)
                    VALUES ($1, $2, 'External', 0.00, 'USD', $3, $4)
                    "#,
                )
                .bind(new_account_id)
                .bind(dest_name)
                .bind(now)
                .bind(now)
                .execute(&mut *tx)
                .await?;

                new_account_id
            }
        };

        // Create the transaction
        let transaction = sqlx::query_as::<_, Transaction>(
            r#"
            INSERT INTO transactions (id, account_id, source_account_id, destination_account_id, description, amount, category, budget_id, transaction_date, created_at, updated_at)
            VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(req.source_account_id)
        .bind(destination_account_id)
        .bind(&req.description)
        .bind(req.amount)
        .bind(&req.category)
        .bind(req.budget_id)
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

        // Update the destination account balance (add the amount)
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

            if let Some(budget_id) = req.budget_id {
                params.push(format!("budget_id = '{}'", budget_id));
            }

            if let Some(transaction_date) = req.transaction_date {
                params.push(format!("transaction_date = '{}'", transaction_date));
            }

            // Handle destination account updates
            let mut new_destination_id = None;

            if let Some(destination_account_id) = req.destination_account_id {
                // If destination_account_id is provided, use it directly
                params.push(format!("destination_account_id = '{}'", destination_account_id));
                new_destination_id = Some(destination_account_id);
            } else if let Some(dest_name) = &req.destination_name {
                // If destination_name is provided but not destination_account_id,
                // check if there's an existing account that matches the destination name
                let existing_account = sqlx::query!(
                    "SELECT id FROM accounts WHERE name = $1",
                    dest_name
                )
                .fetch_optional(&mut *tx)
                .await?;

                if let Some(record) = existing_account {
                    // Use the existing account
                    params.push(format!("destination_account_id = '{}'", record.id));
                    new_destination_id = Some(record.id);
                } else {
                    // Create a new external account
                    let new_account_id = Uuid::new_v4();
                    sqlx::query(
                        r#"
                        INSERT INTO accounts (id, name, account_type, balance, currency, created_at, updated_at)
                        VALUES ($1, $2, 'External', 0.00, 'USD', $3, $4)
                        "#,
                    )
                    .bind(new_account_id)
                    .bind(dest_name)
                    .bind(now)
                    .bind(now)
                    .execute(&mut *tx)
                    .await?;

                    params.push(format!("destination_account_id = '{}'", new_account_id));
                    new_destination_id = Some(new_account_id);
                }

                // Also update the destination_name field in the transaction
                params.push(format!("destination_name = '{}'", dest_name));
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
                    .bind(transaction.destination_account_id)
                    .execute(&mut *tx)
                    .await?;

                    // Determine the destination account ID to use
                    // If a new destination account ID is provided in the request, use that
                    // Otherwise, use the original destination account ID
                    let dest_id = req.destination_account_id.unwrap_or(transaction.destination_account_id);

                    // Add the new amount to the destination account
                    sqlx::query(
                        r#"
                        UPDATE accounts
                        SET balance = balance + $1, updated_at = $2
                        WHERE id = $3
                        "#,
                    )
                    .bind(new_amount)
                    .bind(now)
                    .bind(dest_id)
                    .execute(&mut *tx)
                    .await?;
                }
            } else if let Some(new_dest_id) = req.destination_account_id {
                // If only the destination account changed (not the amount)
                // Compare the new destination account ID with the original one
                if new_dest_id != transaction.destination_account_id {
                    // Reverse the effect on the original destination account
                    sqlx::query(
                        r#"
                        UPDATE accounts
                        SET balance = balance - $1, updated_at = $2
                        WHERE id = $3
                        "#,
                    )
                    .bind(transaction.amount)
                    .bind(now)
                    .bind(transaction.destination_account_id)
                    .execute(&mut *tx)
                    .await?;

                    // Add the amount to the new destination account
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
            let now = chrono::Utc::now();

            // Delete the transaction
            let result = sqlx::query("DELETE FROM transactions WHERE id = $1")
                .bind(id)
                .execute(&mut *tx)
                .await?;

            // Update the source account balance (reverse the effect)
            // If amount is positive, add it back (it was subtracted when created)
            // If amount is negative, subtract it (it was added when created)
            sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance - $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(-transaction.amount) // Negate the amount to reverse the effect
            .bind(now)
            .bind(transaction.source_account_id)
            .execute(&mut *tx)
            .await?;

            // Update the destination account balance (reverse the effect)
            // Subtract the amount from the destination account
            sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance - $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(transaction.amount)
            .bind(now)
            .bind(transaction.destination_account_id)
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
