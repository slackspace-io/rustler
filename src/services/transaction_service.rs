use chrono::{DateTime, Utc};
use sqlx::{Pool, Postgres, Row};
use uuid::Uuid;

use crate::models::{Transaction, CreateTransactionRequest, UpdateTransactionRequest};
use crate::services::category_service::CategoryService;

/// Service for handling transaction-related operations
pub struct TransactionService {
    db: Pool<Postgres>,
    category_service: CategoryService,
}

impl TransactionService {
    /// Get monthly incoming transactions to on-budget accounts, excluding on-budget to on-budget transfers
    pub async fn get_monthly_incoming_transactions(&self, year: i32, month: u32) -> Result<Vec<Transaction>, sqlx::Error> {
        // Calculate start and end of month in UTC
        let start_naive = chrono::NaiveDate::from_ymd_opt(year, month, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        let start_date = chrono::DateTime::<Utc>::from_naive_utc_and_offset(start_naive, Utc);
        let end_naive = if month == 12 {
            chrono::NaiveDate::from_ymd_opt(year + 1, 1, 1)
        } else {
            chrono::NaiveDate::from_ymd_opt(year, month + 1, 1)
        }
        .unwrap()
        .and_hms_opt(0, 0, 0)
        .unwrap();
        let end_date = chrono::DateTime::<Utc>::from_naive_utc_and_offset(end_naive, Utc);

        // Mirror BudgetService::get_monthly_incoming_funds selection criteria:
        // - Destination account is On Budget
        // - Source account is not On Budget (or NULL)
        // - Amount > 0 (consistent with existing monthly incoming funds query)
        // - Date within [start_date, end_date)
        let query = r#"
            SELECT t.*
            FROM transactions t
            JOIN accounts dst ON t.destination_account_id = dst.id
            LEFT JOIN accounts src ON t.source_account_id = src.id
            WHERE dst.account_type = 'On Budget'
              AND (src.account_type IS NULL OR src.account_type <> 'On Budget')
              AND t.amount > 0
              AND t.transaction_date >= $1
              AND t.transaction_date < $2
            ORDER BY t.transaction_date DESC
        "#;

        let rows = sqlx::query_as::<_, Transaction>(query)
            .bind(start_date)
            .bind(end_date)
            .fetch_all(&self.db)
            .await?;
        Ok(rows)
    }
    /// Create a new TransactionService with the given database pool
    pub fn new(db: Pool<Postgres>) -> Self {
        Self {
            db: db.clone(),
            category_service: CategoryService::new(db),
        }
    }

    /// Get spending by category group (or category), aggregated over time periods, from selected on-budget accounts
    pub async fn get_spending_over_time(
        &self,
        account_ids: Option<Vec<Uuid>>,
        start_date: Option<DateTime<Utc>>,
        end_date: Option<DateTime<Utc>>,
        group_by_group: bool,
        period: &str,
    ) -> Result<Vec<(String, String, f64)>, sqlx::Error> {
        // Determine period truncation
        let period_fn = match period {
            "week" => "week",
            "day" => "day",
            _ => "month",
        };

        // Base query joins source accounts and optional category/group by matching category_id (stable)
        let mut query = format!(
            "SELECT to_char(date_trunc('{period}', t.transaction_date), 'YYYY-MM-DD') AS period,
                    {{name_expr}} AS name,
                    SUM(t.amount) AS total_amount
             FROM transactions t
             JOIN accounts src ON t.source_account_id = src.id
             LEFT JOIN categories c ON c.id = t.category_id
             LEFT JOIN category_groups cg ON cg.id = c.group_id
             WHERE src.account_type = 'On Budget' AND t.amount > 0",
            period = period_fn
        );

        // Exclude transfers if present by category label (coalesce current category name or legacy string)
        query.push_str(" AND (COALESCE(c.name, t.category) IS NULL OR COALESCE(c.name, t.category) NOT IN ('Transfer', 'Transfers'))");

        if let Some(start) = start_date {
            query.push_str(&format!(" AND t.transaction_date >= '{}'", start));
        }
        if let Some(end) = end_date {
            query.push_str(&format!(" AND t.transaction_date <= '{}'", end));
        }

        if let Some(ids) = &account_ids {
            if !ids.is_empty() {
                // Build IN list safely by formatting UUIDs; sqlx query! macro not used due dynamic SQL elsewhere
                let id_list = ids.iter().map(|u| format!("'{}'", u)).collect::<Vec<_>>().join(",");
                query.push_str(&format!(" AND src.id IN ({})", id_list));
            }
        }

        // Name expression and group by
        if group_by_group {
            query = query.replace("{name_expr}", "COALESCE(cg.name, 'Ungrouped')");
        } else {
            // Prefer current category name via join; fall back to legacy transaction category if id is null
            query = query.replace("{name_expr}", "COALESCE(c.name, t.category, 'Uncategorized')");
        }

        query.push_str(" GROUP BY 1, 2 ORDER BY 1, 2");

        let rows = sqlx::query(&query).fetch_all(&self.db).await?;

        let mut result = Vec::new();
        for row in rows {
            let period_str: String = row.get("period");
            let name: String = row.get("name");
            let amount: f64 = row.get("total_amount");
            result.push((period_str, name, amount));
        }

        Ok(result)
    }

    /// Get spending by category, with optional filtering by date range
    pub async fn get_spending_by_category(
        &self,
        start_date: Option<DateTime<Utc>>,
        end_date: Option<DateTime<Utc>>,
    ) -> Result<Vec<(String, f64)>, sqlx::Error> {
        let mut query = String::from(
            "SELECT COALESCE(c.name, t.category, 'No category') as category, SUM(t.amount) as total_amount
             FROM transactions t
             LEFT JOIN categories c ON c.id = t.category_id
             WHERE 1=1"
        );

        if let Some(start_date) = start_date {
            query.push_str(&format!(" AND t.transaction_date >= '{}'", start_date));
        }

        if let Some(end_date) = end_date {
            query.push_str(&format!(" AND t.transaction_date <= '{}'", end_date));
        }

        query.push_str(" GROUP BY 1 ORDER BY total_amount DESC");

        let rows = sqlx::query(&query)
            .fetch_all(&self.db)
            .await?;

        let mut result = Vec::new();
        for row in rows {
            let category: String = row.get("category");
            let amount: f64 = row.get("total_amount");
            result.push((category, amount));
        }

        Ok(result)
    }

    /// Get all transactions, with optional filtering and pagination
    pub async fn get_transactions(
        &self,
        source_account_id: Option<Uuid>,
        category: Option<&str>,
        start_date: Option<DateTime<Utc>>,
        end_date: Option<DateTime<Utc>>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<Transaction>, sqlx::Error> {
        let mut query = String::from("SELECT * FROM transactions WHERE 1=1");

        if let Some(source_account_id) = source_account_id {
            query.push_str(&format!(" AND source_account_id = '{}'", source_account_id));
        }

        if let Some(category_name) = category {
            // Filter by resolved category name via join on category_id
            query.push_str(&format!(" AND COALESCE((SELECT name FROM categories WHERE id = transactions.category_id), transactions.category) = '{}'", category_name.replace("'","''")));
        }

        if let Some(start_date) = start_date {
            query.push_str(&format!(" AND transaction_date >= '{}'", start_date));
        }

        if let Some(end_date) = end_date {
            query.push_str(&format!(" AND transaction_date <= '{}'", end_date));
        }

        query.push_str(" ORDER BY transaction_date DESC");

        // Add pagination
        if let Some(limit_val) = limit {
            query.push_str(&format!(" LIMIT {}", limit_val));
        }

        if let Some(offset_val) = offset {
            query.push_str(&format!(" OFFSET {}", offset_val));
        }

        sqlx::query_as::<_, Transaction>(&query)
            .fetch_all(&self.db)
            .await
    }

    /// Get transactions for a specific account (both as source and destination) with pagination
    pub async fn get_account_transactions(
        &self,
        account_id: Uuid,
        limit: Option<i64>,
        offset: Option<i64>
    ) -> Result<Vec<Transaction>, sqlx::Error> {
        let mut query = String::from(
            r#"
            SELECT * FROM transactions
            WHERE source_account_id = $1 OR destination_account_id = $1
            ORDER BY transaction_date DESC
            "#
        );

        // Add pagination
        if let Some(limit_val) = limit {
            query.push_str(&format!(" LIMIT {}", limit_val));
        }

        if let Some(offset_val) = offset {
            query.push_str(&format!(" OFFSET {}", offset_val));
        }

        sqlx::query_as::<_, Transaction>(&query)
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

        // Find or create the category and get its ID
        let category = self.category_service.find_or_create_category(&req.category).await?;

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

        // Get the destination name if not provided
        let destination_name = if let Some(name) = &req.destination_name {
            name.clone()
        } else {
            // Look up the destination account name
            let dest_account = sqlx::query!(
                "SELECT name FROM accounts WHERE id = $1",
                destination_account_id
            )
            .fetch_optional(&mut *tx)
            .await?;

            dest_account.map(|a| a.name).unwrap_or_else(|| "".to_string())
        };

        // Validate double-entry invariants
        if !req.amount.is_finite() || req.amount == 0.0 {
            return Err(sqlx::Error::Protocol("Invalid amount: must be a finite, non-zero number".into()));
        }
        if req.source_account_id == destination_account_id {
            return Err(sqlx::Error::Protocol("Invalid transaction: source and destination accounts must differ".into()));
        }

        // Create the transaction record
        let transaction = sqlx::query_as::<_, Transaction>(
            r#"
            INSERT INTO transactions (id, account_id, source_account_id, destination_account_id, destination_name, description, amount, category, category_id, budget_id, transaction_date, created_at, updated_at)
            VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(req.source_account_id)
        .bind(destination_account_id)
        .bind(&destination_name)
        .bind(&req.description)
        .bind(req.amount)
        .bind(&req.category)
        .bind(category.id)
        .bind(req.budget_id)
        .bind(transaction_date)
        .bind(now)
        .bind(now)
        .fetch_one(&mut *tx)
        .await?;

        // Apply double-entry accounting:
        //
        // For a POSITIVE amount (expense/transfer out):
        // - Decrease source account balance by the amount (money leaving)
        // - Increase destination account balance by the amount (money arriving)
        //
        // For a NEGATIVE amount (income/transfer in):
        // - Increase source account balance by the absolute amount (money arriving)
        // - Decrease destination account balance by the absolute amount (money leaving)
        //
        // This ensures: source_change + destination_change = 0 (double-entry principle)

        let abs_amount = req.amount.abs();

        if req.amount >= 0.0 {
            // Positive amount: money flows FROM source TO destination
            // Source account loses money (decrease balance)
            let ra1 = sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance - $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(abs_amount)
            .bind(now)
            .bind(req.source_account_id)
            .execute(&mut *tx)
            .await?;
            if ra1.rows_affected() != 1 { return Err(sqlx::Error::Protocol("Invariant violation: source account update failed".into())); }

            // Destination account gains money (increase balance)
            let ra2 = sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance + $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(abs_amount)
            .bind(now)
            .bind(destination_account_id)
            .execute(&mut *tx)
            .await?;
            if ra2.rows_affected() != 1 { return Err(sqlx::Error::Protocol("Invariant violation: destination account update failed".into())); }
        } else {
            // Negative amount: money flows FROM destination TO source
            // Source account gains money (increase balance)
            let ra1 = sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance + $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(abs_amount)
            .bind(now)
            .bind(req.source_account_id)
            .execute(&mut *tx)
            .await?;
            if ra1.rows_affected() != 1 { return Err(sqlx::Error::Protocol("Invariant violation: source account update failed".into())); }

            // Destination account loses money (decrease balance)
            let ra2 = sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance - $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(abs_amount)
            .bind(now)
            .bind(destination_account_id)
            .execute(&mut *tx)
            .await?;
            if ra2.rows_affected() != 1 { return Err(sqlx::Error::Protocol("Invariant violation: destination account update failed".into())); }
        }

        // Commit the transaction
        tx.commit().await?;

        Ok(transaction)
    }

    /// Update an existing transaction
    pub async fn update_transaction(&self, id: Uuid, req: UpdateTransactionRequest) -> Result<Option<Transaction>, sqlx::Error> {
        // First, check if the transaction exists and get the original details
        let original_transaction = self.get_transaction(id).await?;

        if let Some(original) = original_transaction {
            // Start a database transaction
            let mut tx = self.db.begin().await?;
            let now = chrono::Utc::now();

            // First, reverse the original transaction's effect on account balances
            self.reverse_transaction_balance_effects(&mut tx, &original, now).await?;

            // Build the update query dynamically based on which fields are provided
            let mut query = String::from("UPDATE transactions SET updated_at = $1");
            let mut params: Vec<String> = vec![];

            // Track the new values (use original values if not updated)
            let new_amount = req.amount.unwrap_or(original.amount);
            let new_source_account_id = original.source_account_id; // Source account can't be changed
            let mut new_destination_account_id = original.destination_account_id;

            if let Some(amount) = req.amount {
                params.push(format!("amount = {}", amount));
            }

            if let Some(description) = &req.description {
                params.push(format!("description = '{}'", description));
            }

            if let Some(category_name) = &req.category {
                // Resolve category and set both legacy category name and stable category_id
                if let Ok(cat) = self.category_service.find_or_create_category(category_name).await {
                    params.push(format!("category = '{}'", category_name.replace("'", "''")));
                    params.push(format!("category_id = '{}'", cat.id));
                } else {
                    // Fall back to just updating the legacy string if resolution fails
                    params.push(format!("category = '{}'", category_name.replace("'", "''")));
                }
            }

            if let Some(budget_id) = req.budget_id {
                params.push(format!("budget_id = '{}'", budget_id));
            }

            if let Some(transaction_date) = req.transaction_date {
                params.push(format!("transaction_date = '{}'", transaction_date));
            }

            // Handle destination account updates
            if let Some(destination_account_id) = req.destination_account_id {
                // If destination_account_id is provided, use it directly
                params.push(format!("destination_account_id = '{}'", destination_account_id));
                new_destination_account_id = destination_account_id;

                // Look up the destination account name and update it
                if req.destination_name.is_none() {
                    let dest_account = sqlx::query!(
                        "SELECT name FROM accounts WHERE id = $1",
                        destination_account_id
                    )
                    .fetch_optional(&mut *tx)
                    .await?;

                    if let Some(account) = dest_account {
                        params.push(format!("destination_name = '{}'", account.name));
                    }
                }
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
                    new_destination_account_id = record.id;
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
                    new_destination_account_id = new_account_id;
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

            // Apply the new transaction's effect on account balances
            self.apply_transaction_balance_effects(&mut tx, new_source_account_id, new_destination_account_id, new_amount, now).await?;

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

            // Delete the transaction record
            let result = sqlx::query("DELETE FROM transactions WHERE id = $1")
                .bind(id)
                .execute(&mut *tx)
                .await?;

            // Reverse the transaction's effect on account balances
            self.reverse_transaction_balance_effects(&mut tx, &transaction, now).await?;

            // Commit the transaction
            tx.commit().await?;

            Ok(result.rows_affected() > 0)
        } else {
            Ok(false)
        }
    }

    /// Helper method to reverse the balance effects of a transaction
    async fn reverse_transaction_balance_effects(
        &self,
        tx: &mut sqlx::Transaction<'_, Postgres>,
        transaction: &Transaction,
        now: DateTime<Utc>
    ) -> Result<(), sqlx::Error> {
        let abs_amount = transaction.amount.abs();

        if transaction.amount >= 0.0 {
            // Original was positive: source lost money, destination gained money
            // Reverse: source gains money back, destination loses money
            sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance + $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(abs_amount)
            .bind(now)
            .bind(transaction.source_account_id)
            .execute(&mut **tx)
            .await?;

            sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance - $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(abs_amount)
            .bind(now)
            .bind(transaction.destination_account_id)
            .execute(&mut **tx)
            .await?;
        } else {
            // Original was negative: source gained money, destination lost money
            // Reverse: source loses money, destination gains money back
            sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance - $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(abs_amount)
            .bind(now)
            .bind(transaction.source_account_id)
            .execute(&mut **tx)
            .await?;

            sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance + $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(abs_amount)
            .bind(now)
            .bind(transaction.destination_account_id)
            .execute(&mut **tx)
            .await?;
        }

        Ok(())
    }

    /// Helper method to apply the balance effects of a transaction
    async fn apply_transaction_balance_effects(
        &self,
        tx: &mut sqlx::Transaction<'_, Postgres>,
        source_account_id: Uuid,
        destination_account_id: Uuid,
        amount: f64,
        now: DateTime<Utc>
    ) -> Result<(), sqlx::Error> {
        let abs_amount = amount.abs();

        if amount >= 0.0 {
            // Positive amount: money flows FROM source TO destination
            // Source account loses money (decrease balance)
            sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance - $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(abs_amount)
            .bind(now)
            .bind(source_account_id)
            .execute(&mut **tx)
            .await?;

            // Destination account gains money (increase balance)
            sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance + $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(abs_amount)
            .bind(now)
            .bind(destination_account_id)
            .execute(&mut **tx)
            .await?;
        } else {
            // Negative amount: money flows FROM destination TO source
            // Source account gains money (increase balance)
            sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance + $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(abs_amount)
            .bind(now)
            .bind(source_account_id)
            .execute(&mut **tx)
            .await?;

            // Destination account loses money (decrease balance)
            sqlx::query(
                r#"
                UPDATE accounts
                SET balance = balance - $1, updated_at = $2
                WHERE id = $3
                "#,
            )
            .bind(abs_amount)
            .bind(now)
            .bind(destination_account_id)
            .execute(&mut **tx)
            .await?;
        }

        Ok(())
    }
}
