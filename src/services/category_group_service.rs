use sqlx::{Pool, Postgres};
use uuid::Uuid;

use crate::models::{CategoryGroup, CreateCategoryGroupRequest, UpdateCategoryGroupRequest};

/// Service for handling category group-related operations
pub struct CategoryGroupService {
    db: Pool<Postgres>,
}

impl CategoryGroupService {
    /// Create a new CategoryGroupService with the given database pool
    pub fn new(db: Pool<Postgres>) -> Self {
        Self { db }
    }

    /// Get all category groups
    pub async fn get_category_groups(&self) -> Result<Vec<CategoryGroup>, sqlx::Error> {
        sqlx::query_as::<_, CategoryGroup>("SELECT * FROM category_groups ORDER BY name")
            .fetch_all(&self.db)
            .await
    }

    /// Get a category group by ID
    pub async fn get_category_group(&self, id: Uuid) -> Result<Option<CategoryGroup>, sqlx::Error> {
        sqlx::query_as::<_, CategoryGroup>("SELECT * FROM category_groups WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.db)
            .await
    }

    /// Create a new category group
    pub async fn create_category_group(&self, req: CreateCategoryGroupRequest) -> Result<CategoryGroup, sqlx::Error> {
        let now = chrono::Utc::now();

        sqlx::query_as::<_, CategoryGroup>(
            r#"
            INSERT INTO category_groups (id, name, description, created_at, updated_at)
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

    /// Update an existing category group
    pub async fn update_category_group(&self, id: Uuid, req: UpdateCategoryGroupRequest) -> Result<Option<CategoryGroup>, sqlx::Error> {
        // First, check if the category group exists
        let category_group = self.get_category_group(id).await?;

        if let Some(_) = category_group {
            // Build the update query dynamically based on which fields are provided
            let mut query = String::from("UPDATE category_groups SET updated_at = $1");
            let mut params: Vec<String> = vec![];
            let now = chrono::Utc::now();

            if let Some(name) = &req.name {
                params.push(format!("name = '{}'", name));
            }

            if let Some(description) = &req.description {
                params.push(format!("description = '{}'", description.replace("'", "''")));
            }

            if !params.is_empty() {
                query.push_str(", ");
                query.push_str(&params.join(", "));
            }

            query.push_str(" WHERE id = $2 RETURNING *");

            sqlx::query_as::<_, CategoryGroup>(&query)
                .bind(now)
                .bind(id)
                .fetch_optional(&self.db)
                .await
        } else {
            Ok(None)
        }
    }

    /// Delete a category group
    pub async fn delete_category_group(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        // First, check if the category group exists
        let category_group = self.get_category_group(id).await?;

        if category_group.is_none() {
            return Ok(false);
        }

        // Use a transaction to ensure atomicity
        let mut tx = self.db.begin().await?;

        // Update any categories that use this group to set group_id to NULL
        sqlx::query("UPDATE categories SET group_id = NULL WHERE group_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        // Now delete the category group
        let result = sqlx::query("DELETE FROM category_groups WHERE id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        let rows_affected = result.rows_affected();

        // Commit the transaction
        tx.commit().await?;

        Ok(rows_affected > 0)
    }

    /// Get all categories in a specific group
    pub async fn get_categories_by_group(&self, group_id: Uuid) -> Result<Vec<crate::models::Category>, sqlx::Error> {
        sqlx::query_as::<_, crate::models::Category>("SELECT * FROM categories WHERE group_id = $1 ORDER BY name")
            .bind(group_id)
            .fetch_all(&self.db)
            .await
    }
}
