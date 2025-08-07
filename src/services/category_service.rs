use sqlx::{Pool, Postgres};
use uuid::Uuid;

use crate::models::{Category, CreateCategoryRequest, UpdateCategoryRequest};

/// Service for handling category-related operations
pub struct CategoryService {
    db: Pool<Postgres>,
}

impl CategoryService {
    /// Create a new CategoryService with the given database pool
    pub fn new(db: Pool<Postgres>) -> Self {
        Self { db }
    }

    /// Get all categories
    pub async fn get_categories(&self) -> Result<Vec<Category>, sqlx::Error> {
        sqlx::query_as::<_, Category>("SELECT * FROM categories ORDER BY name")
            .fetch_all(&self.db)
            .await
    }

    /// Find a category by name, or create it if it doesn't exist
    pub async fn find_or_create_category(&self, name: &str) -> Result<Category, sqlx::Error> {
        // First, try to find the category by name
        let existing_category = sqlx::query_as::<_, Category>("SELECT * FROM categories WHERE name = $1")
            .bind(name)
            .fetch_optional(&self.db)
            .await?;

        if let Some(category) = existing_category {
            // Category exists, return it
            Ok(category)
        } else {
            // Category doesn't exist, create it
            let create_request = CreateCategoryRequest {
                name: name.to_string(),
                description: None,
                group_id: None,
            };

            self.create_category(create_request).await
        }
    }

    /// Get a category by ID
    pub async fn get_category(&self, id: Uuid) -> Result<Option<Category>, sqlx::Error> {
        sqlx::query_as::<_, Category>("SELECT * FROM categories WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.db)
            .await
    }

    /// Create a new category
    pub async fn create_category(&self, req: CreateCategoryRequest) -> Result<Category, sqlx::Error> {
        let now = chrono::Utc::now();

        sqlx::query_as::<_, Category>(
            r#"
            INSERT INTO categories (id, name, description, group_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.group_id)
        .bind(now)
        .bind(now)
        .fetch_one(&self.db)
        .await
    }

    /// Update an existing category
    pub async fn update_category(&self, id: Uuid, req: UpdateCategoryRequest) -> Result<Option<Category>, sqlx::Error> {
        // First, check if the category exists
        let category = self.get_category(id).await?;

        if let Some(_) = category {
            // Build the update query dynamically based on which fields are provided
            let mut query = String::from("UPDATE categories SET updated_at = $1");
            let mut params: Vec<String> = vec![];
            let now = chrono::Utc::now();

            if let Some(name) = &req.name {
                params.push(format!("name = '{}'", name));
            }

            if let Some(description) = &req.description {
                params.push(format!("description = '{}'", description.replace("'", "''")));
            }

            if let Some(group_id) = &req.group_id {
                params.push(format!("group_id = '{}'", group_id));
            }

            if !params.is_empty() {
                query.push_str(", ");
                query.push_str(&params.join(", "));
            }

            query.push_str(" WHERE id = $2 RETURNING *");

            sqlx::query_as::<_, Category>(&query)
                .bind(now)
                .bind(id)
                .fetch_optional(&self.db)
                .await
        } else {
            Ok(None)
        }
    }

    /// Delete a category
    pub async fn delete_category(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        // First, check if the category exists
        let category = self.get_category(id).await?;

        if category.is_none() {
            return Ok(false);
        }

        // Use a transaction to ensure atomicity
        let mut tx = self.db.begin().await?;

        // Update any transactions that use this category to set category_id to NULL
        sqlx::query("UPDATE transactions SET category_id = NULL WHERE category_id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        // Now delete the category
        let result = sqlx::query("DELETE FROM categories WHERE id = $1")
            .bind(id)
            .execute(&mut *tx)
            .await?;

        let rows_affected = result.rows_affected();

        // Commit the transaction
        tx.commit().await?;

        Ok(rows_affected > 0)
    }
}
