use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
    Router,
    routing::{get, post, put, delete},
};
use uuid::Uuid;
use std::sync::Arc;

use crate::models::{CategoryGroup, CreateCategoryGroupRequest, UpdateCategoryGroupRequest, Category};
use crate::services::CategoryGroupService;

pub fn router(category_group_service: Arc<CategoryGroupService>) -> Router {
    Router::new()
        .route("/category-groups", get(get_category_groups))
        .route("/category-groups", post(create_category_group))
        .route("/category-groups/{id}", get(get_category_group))
        .route("/category-groups/{id}", put(update_category_group))
        .route("/category-groups/{id}", post(update_category_group))  // Add POST handler for category group updates
        .route("/category-groups/{id}", delete(delete_category_group))
        .route("/category-groups/{id}/categories", get(get_categories_by_group))
        .with_state(category_group_service)
}

// Handler to get all category groups
async fn get_category_groups(
    State(state): State<Arc<CategoryGroupService>>,
) -> Result<Json<Vec<CategoryGroup>>, StatusCode> {
    // Call the category group service to get all category groups
    match state.get_category_groups().await {
        Ok(category_groups) => Ok(Json(category_groups)),
        Err(err) => {
            eprintln!("Error getting category groups: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to create a new category group
async fn create_category_group(
    State(state): State<Arc<CategoryGroupService>>,
    Json(payload): Json<CreateCategoryGroupRequest>,
) -> Result<(StatusCode, Json<CategoryGroup>), StatusCode> {
    // Call the category group service to create a new category group
    match state.create_category_group(payload).await {
        Ok(category_group) => Ok((StatusCode::CREATED, Json(category_group))),
        Err(err) => {
            eprintln!("Error creating category group: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to get a specific category group by ID
async fn get_category_group(
    Path(id): Path<Uuid>,
    State(state): State<Arc<CategoryGroupService>>,
) -> Result<Json<CategoryGroup>, StatusCode> {
    // Call the category group service to get the category group by ID
    match state.get_category_group(id).await {
        Ok(Some(category_group)) => Ok(Json(category_group)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error getting category group: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to update a category group
async fn update_category_group(
    Path(id): Path<Uuid>,
    State(state): State<Arc<CategoryGroupService>>,
    Json(payload): Json<UpdateCategoryGroupRequest>,
) -> Result<Json<CategoryGroup>, StatusCode> {
    // Call the category group service to update the category group
    match state.update_category_group(id, payload).await {
        Ok(Some(category_group)) => Ok(Json(category_group)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error updating category group: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to delete a category group
async fn delete_category_group(
    Path(id): Path<Uuid>,
    State(state): State<Arc<CategoryGroupService>>,
) -> StatusCode {
    // Call the category group service to delete the category group
    match state.delete_category_group(id).await {
        Ok(true) => StatusCode::NO_CONTENT,
        Ok(false) => StatusCode::NOT_FOUND,
        Err(err) => {
            eprintln!("Error deleting category group: {:?}", err);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

// Handler to get all categories in a specific group
async fn get_categories_by_group(
    Path(id): Path<Uuid>,
    State(state): State<Arc<CategoryGroupService>>,
) -> Result<Json<Vec<Category>>, StatusCode> {
    // Call the category group service to get all categories in the group
    match state.get_categories_by_group(id).await {
        Ok(categories) => Ok(Json(categories)),
        Err(err) => {
            eprintln!("Error getting categories by group: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
