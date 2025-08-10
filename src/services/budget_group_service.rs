use sqlx::{Pool, Postgres};
use uuid::Uuid;

use crate::models::{BudgetGroup, CreateBudgetGroupRequest, UpdateBudgetGroupRequest};

/// Service for handling budget group-related operations
pub struct BudgetGroupService {
    db: Pool<Postgres>,
}

impl BudgetGroupService {
    /// Create a new BudgetGroupService with the given database pool
    pub fn new(db: Pool<Postgres>) -> Self {
        Self { db }
    }

    /// Get all budget groups
    pub async fn get_budget_groups(&self) -> Result<Vec<BudgetGroup>, sqlx::Error> {
        sqlx::query_as::<_, BudgetGroup>("SELECT * FROM budget_groups ORDER BY name")
            .fetch_all(&self.db)
            .await
    }

    /// Get a budget group by ID
    pub async fn get_budget_group(&self, id: Uuid) -> Result<Option<BudgetGroup>, sqlx::Error> {
        sqlx::query_as::<_, BudgetGroup>("SELECT * FROM budget_groups WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.db)
            .await
    }

    /// Create a new budget group
    pub async fn create_budget_group(&self, req: CreateBudgetGroupRequest) -> Result<BudgetGroup, sqlx::Error> {
        let now = chrono::Utc::now();
        sqlx::query_as::<_, BudgetGroup>(
            r#"
            INSERT INTO budget_groups (id, name, description, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(&req.name)
        .bind(&req.description)
        .bind(now)
        .bind(now)
        .fetch_one(&self.db)
        .await
    }

    /// Update an existing budget group
    pub async fn update_budget_group(&self, id: Uuid, req: UpdateBudgetGroupRequest) -> Result<Option<BudgetGroup>, sqlx::Error> {
        // First, check if the budget group exists
        let group = self.get_budget_group(id).await?;
        if group.is_none() {
            return Ok(None);
        }

        // Build the update query using COALESCE for safety
        let now = chrono::Utc::now();
        let updated = sqlx::query_as::<_, BudgetGroup>(
            r#"
            UPDATE budget_groups
            SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                updated_at = $3
            WHERE id = $4
            RETURNING *
            "#,
        )
        .bind(req.name)
        .bind(req.description)
        .bind(now)
        .bind(id)
        .fetch_optional(&self.db)
        .await?;

        Ok(updated)
    }

    /// Delete a budget group
    pub async fn delete_budget_group(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        // Use a transaction: clear budgets.group_id then delete group
        let mut tx = self.db.begin().await?;

        sqlx::query("UPDATE budgets SET group_id = NULL WHERE group_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        let result = sqlx::query("DELETE FROM budget_groups WHERE id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(result.rows_affected() > 0)
    }

    /// Get all budgets in a specific group
    pub async fn get_budgets_by_group(&self, group_id: Uuid) -> Result<Vec<crate::models::Budget>, sqlx::Error> {
        sqlx::query_as::<_, crate::models::Budget>("SELECT * FROM budgets WHERE group_id = $1 ORDER BY name")
            .bind(group_id)
            .fetch_all(&self.db)
            .await
    }
}
