use sqlx::{Pool, Postgres};
use uuid::Uuid;

use crate::models::{RuleGroup, CreateRuleGroupRequest, UpdateRuleGroupRequest};

/// Service for handling rule group-related operations
pub struct RuleGroupService {
    db: Pool<Postgres>,
}

impl RuleGroupService {
    /// Create a new RuleGroupService with the given database pool
    pub fn new(db: Pool<Postgres>) -> Self {
        Self { db }
    }

    /// Get all rule groups
    pub async fn get_rule_groups(&self) -> Result<Vec<RuleGroup>, sqlx::Error> {
        sqlx::query_as::<_, RuleGroup>("SELECT * FROM rule_groups ORDER BY name")
            .fetch_all(&self.db)
            .await
    }

    /// Get a rule group by ID
    pub async fn get_rule_group(&self, id: Uuid) -> Result<Option<RuleGroup>, sqlx::Error> {
        sqlx::query_as::<_, RuleGroup>("SELECT * FROM rule_groups WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.db)
            .await
    }

    /// Create a new rule group
    pub async fn create_rule_group(&self, req: CreateRuleGroupRequest) -> Result<RuleGroup, sqlx::Error> {
        let now = chrono::Utc::now();
        sqlx::query_as::<_, RuleGroup>(
            r#"
            INSERT INTO rule_groups (id, name, description, created_at, updated_at)
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

    /// Update an existing rule group
    pub async fn update_rule_group(&self, id: Uuid, req: UpdateRuleGroupRequest) -> Result<Option<RuleGroup>, sqlx::Error> {
        // First, check if the rule group exists
        let group = self.get_rule_group(id).await?;
        if group.is_none() {
            return Ok(None);
        }

        // Build the update query using COALESCE for safety
        let now = chrono::Utc::now();
        let updated = sqlx::query_as::<_, RuleGroup>(
            r#"
            UPDATE rule_groups
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

    /// Delete a rule group
    pub async fn delete_rule_group(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        // Use a transaction: clear rules.group_id then delete group
        let mut tx = self.db.begin().await?;

        sqlx::query("UPDATE rules SET group_id = NULL WHERE group_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        let result = sqlx::query("DELETE FROM rule_groups WHERE id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;
        Ok(result.rows_affected() > 0)
    }

    /// Get all rules in a specific group
    pub async fn get_rules_by_group(&self, group_id: Uuid) -> Result<Vec<crate::models::Rule>, sqlx::Error> {
        sqlx::query_as::<_, crate::models::Rule>("SELECT * FROM rules WHERE group_id = $1 ORDER BY priority ASC, name ASC")
            .bind(group_id)
            .fetch_all(&self.db)
            .await
    }
}
