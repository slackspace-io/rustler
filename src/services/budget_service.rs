use chrono::Utc;
use sqlx::{Pool, Postgres};
use uuid::Uuid;

use crate::models::{Budget, CreateBudgetRequest, UpdateBudgetRequest};

pub struct BudgetService {
    db: Pool<Postgres>,
}

impl BudgetService {
    pub fn new(db: Pool<Postgres>) -> Self {
        Self { db }
    }

    /// Get all budgets
    pub async fn get_budgets(&self) -> Result<Vec<Budget>, sqlx::Error> {
        let budgets = sqlx::query_as::<_, Budget>(
            r#"
            SELECT * FROM budgets
            ORDER BY name ASC
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        Ok(budgets)
    }

    /// Get active budgets (current date is between start_date and end_date, or end_date is null)
    pub async fn get_active_budgets(&self) -> Result<Vec<Budget>, sqlx::Error> {
        let now = Utc::now();
        let budgets = sqlx::query_as::<_, Budget>(
            r#"
            SELECT * FROM budgets
            WHERE start_date <= $1 AND (end_date IS NULL OR end_date >= $1)
            ORDER BY name ASC
            "#,
        )
        .bind(now)
        .fetch_all(&self.db)
        .await?;

        Ok(budgets)
    }

    /// Get a budget by ID
    pub async fn get_budget(&self, id: Uuid) -> Result<Option<Budget>, sqlx::Error> {
        let budget = sqlx::query_as::<_, Budget>(
            r#"
            SELECT * FROM budgets
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.db)
        .await?;

        Ok(budget)
    }

    /// Create a new budget
    pub async fn create_budget(&self, req: CreateBudgetRequest) -> Result<Budget, sqlx::Error> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        let start_date = req.start_date;
        let end_date = req.end_date;

        let budget = sqlx::query_as::<_, Budget>(
            r#"
            INSERT INTO budgets (id, name, description, amount, start_date, end_date, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(req.name)
        .bind(req.description)
        .bind(req.amount)
        .bind(start_date)
        .bind(end_date)
        .bind(now)
        .bind(now)
        .fetch_one(&self.db)
        .await?;

        Ok(budget)
    }

    /// Update an existing budget
    pub async fn update_budget(
        &self,
        id: Uuid,
        req: UpdateBudgetRequest,
    ) -> Result<Option<Budget>, sqlx::Error> {
        let now = Utc::now();

        // First check if the budget exists
        let budget = self.get_budget(id).await?;
        if budget.is_none() {
            return Ok(None);
        }

        // Update the budget
        let updated_budget = sqlx::query_as::<_, Budget>(
            r#"
            UPDATE budgets
            SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                amount = COALESCE($3, amount),
                start_date = COALESCE($4, start_date),
                end_date = $5,
                updated_at = $6
            WHERE id = $7
            RETURNING *
            "#,
        )
        .bind(req.name)
        .bind(req.description)
        .bind(req.amount)
        .bind(req.start_date)
        .bind(req.end_date) // We allow setting end_date to NULL
        .bind(now)
        .bind(id)
        .fetch_one(&self.db)
        .await?;

        Ok(Some(updated_budget))
    }

    /// Delete a budget
    pub async fn delete_budget(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            r#"
            DELETE FROM budgets
            WHERE id = $1
            "#,
        )
        .bind(id)
        .execute(&self.db)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Get the total spent amount for a budget
    pub async fn get_budget_spent(&self, budget_id: Uuid) -> Result<f64, sqlx::Error> {
        let spent = sqlx::query_scalar::<_, f64>(
            r#"
            SELECT COALESCE(SUM(amount), 0.0)
            FROM transactions
            WHERE budget_id = $1
            "#,
        )
        .bind(budget_id)
        .fetch_one(&self.db)
        .await?;

        Ok(spent)
    }

    /// Get the remaining amount for a budget
    pub async fn get_budget_remaining(&self, budget_id: Uuid) -> Result<f64, sqlx::Error> {
        let budget = self.get_budget(budget_id).await?;
        if let Some(budget) = budget {
            let spent = self.get_budget_spent(budget_id).await?;
            Ok(budget.amount - spent)
        } else {
            Ok(0.0)
        }
    }

    /// Get the total monthly incoming funds to on-budget accounts
    pub async fn get_monthly_incoming_funds(&self, year: i32, month: u32) -> Result<f64, sqlx::Error> {
        // Calculate the start and end dates for the specified month
        let start_date = chrono::NaiveDate::from_ymd_opt(year, month, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        let start_date = chrono::DateTime::<Utc>::from_naive_utc_and_offset(start_date, Utc);

        // Calculate the end date (first day of next month)
        let end_date = if month == 12 {
            chrono::NaiveDate::from_ymd_opt(year + 1, 1, 1)
        } else {
            chrono::NaiveDate::from_ymd_opt(year, month + 1, 1)
        }
        .unwrap()
        .and_hms_opt(0, 0, 0)
        .unwrap();
        let end_date = chrono::DateTime::<Utc>::from_naive_utc_and_offset(end_date, Utc);

        // There are two cases to consider for incoming funds:
        // 1. Money coming into on-budget accounts from external/off-budget accounts (positive amount)
        // 2. Money going out of external/off-budget accounts to on-budget accounts (negative amount)

        // First, get incoming transactions where destination is on-budget and source is not
        let incoming_positive = sqlx::query_scalar::<_, f64>(
            r#"
            SELECT COALESCE(SUM(t.amount), 0.0)
            FROM transactions t
            JOIN accounts dest ON t.destination_account_id = dest.id
            JOIN accounts src ON t.source_account_id = src.id
            WHERE dest.account_type = 'On Budget'
            AND src.account_type != 'On Budget'
            AND t.amount > 0
            AND t.transaction_date >= $1
            AND t.transaction_date < $2
            "#,
        )
        .bind(start_date.clone())
        .bind(end_date.clone())
        .fetch_one(&self.db)
        .await?;

        // Second, get outgoing transactions (negative amounts) where:
        // 1. destination is on-budget and source is not on-budget, OR
        // 2. source is on-budget and destination is not on-budget
        let incoming_negative = sqlx::query_scalar::<_, f64>(
            r#"
            SELECT COALESCE(SUM(ABS(t.amount)), 0.0)
            FROM transactions t
            JOIN accounts dest ON t.destination_account_id = dest.id
            JOIN accounts src ON t.source_account_id = src.id
            WHERE (
                (dest.account_type = 'On Budget' AND src.account_type != 'On Budget')
                OR
                (src.account_type = 'On Budget' AND dest.account_type != 'On Budget')
            )
            AND t.amount < 0
            AND t.transaction_date >= $1
            AND t.transaction_date < $2
            "#,
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_one(&self.db)
        .await?;

        // Total incoming funds is the sum of both types
        let incoming_funds = incoming_positive + incoming_negative;

        Ok(incoming_funds)
    }

    /// Get the total budgeted amount for a specific month
    pub async fn get_monthly_budgeted_amount(&self, year: i32, month: u32) -> Result<f64, sqlx::Error> {
        // Calculate the start and end dates for the specified month
        let start_date = chrono::NaiveDate::from_ymd_opt(year, month, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        let start_date = chrono::DateTime::<Utc>::from_naive_utc_and_offset(start_date, Utc);

        // Calculate the end date (first day of next month)
        let end_date = if month == 12 {
            chrono::NaiveDate::from_ymd_opt(year + 1, 1, 1)
        } else {
            chrono::NaiveDate::from_ymd_opt(year, month + 1, 1)
        }
        .unwrap()
        .and_hms_opt(0, 0, 0)
        .unwrap();
        let end_date = chrono::DateTime::<Utc>::from_naive_utc_and_offset(end_date, Utc);

        // Query for budgets that are active during the specified month
        let budgeted_amount = sqlx::query_scalar::<_, f64>(
            r#"
            SELECT COALESCE(SUM(amount), 0.0)
            FROM budgets
            WHERE (start_date <= $2 AND (end_date IS NULL OR end_date >= $1))
            "#,
        )
        .bind(start_date)
        .bind(end_date)
        .fetch_one(&self.db)
        .await?;

        Ok(budgeted_amount)
    }

    /// Get the budget status for a specific month
    /// Returns a tuple with (incoming_funds, budgeted_amount, remaining_to_budget)
    /// If remaining_to_budget is positive, there are funds left to budget
    /// If remaining_to_budget is negative, the budgeted amount exceeds the incoming funds
    pub async fn get_monthly_budget_status(&self, year: i32, month: u32) -> Result<(f64, f64, f64), sqlx::Error> {
        let incoming_funds = self.get_monthly_incoming_funds(year, month).await?;
        let budgeted_amount = self.get_monthly_budgeted_amount(year, month).await?;
        let remaining_to_budget = incoming_funds - budgeted_amount;

        Ok((incoming_funds, budgeted_amount, remaining_to_budget))
    }

    /// Get the total spent amount not associated with any budget
    pub async fn get_unbudgeted_spent(&self) -> Result<f64, sqlx::Error> {
        let spent = sqlx::query_scalar::<_, f64>(
            r#"
            SELECT COALESCE(SUM(amount), 0.0)
            FROM transactions
            WHERE budget_id IS NULL
            "#,
        )
        .fetch_one(&self.db)
        .await?;

        Ok(spent)
    }
}
