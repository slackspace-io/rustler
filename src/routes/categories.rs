use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
    Router,
    routing::{get, post, put, delete},
};
use uuid::Uuid;
use std::sync::Arc;

use crate::models::{Category, CreateCategoryRequest, UpdateCategoryRequest};
use crate::services::CategoryService;

pub fn router(category_service: Arc<CategoryService>) -> Router {
    Router::new()
        .route("/categories", get(get_categories))
        .route("/categories", post(create_category))
        .route("/categories/{id}", get(get_category))
        .route("/categories/{id}", put(update_category))
        .route("/categories/{id}", post(update_category))  // Add POST handler for category updates
        .route("/categories/{id}", delete(delete_category))
        .with_state(category_service)
}

// Handler to get all categories
async fn get_categories(
    State(state): State<Arc<CategoryService>>,
) -> Result<Json<Vec<Category>>, StatusCode> {
    // Call the category service to get all categories
    match state.get_categories().await {
        Ok(categories) => Ok(Json(categories)),
        Err(err) => {
            eprintln!("Error getting categories: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to create a new category
async fn create_category(
    State(state): State<Arc<CategoryService>>,
    Json(payload): Json<CreateCategoryRequest>,
) -> Result<(StatusCode, Json<Category>), StatusCode> {
    // Call the category service to create a new category
    match state.create_category(payload).await {
        Ok(category) => Ok((StatusCode::CREATED, Json(category))),
        Err(err) => {
            eprintln!("Error creating category: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to get a specific category by ID
async fn get_category(
    Path(id): Path<Uuid>,
    State(state): State<Arc<CategoryService>>,
) -> Result<Json<Category>, StatusCode> {
    // Call the category service to get the category by ID
    match state.get_category(id).await {
        Ok(Some(category)) => Ok(Json(category)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error getting category: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to update a category
async fn update_category(
    Path(id): Path<Uuid>,
    State(state): State<Arc<CategoryService>>,
    Json(payload): Json<UpdateCategoryRequest>,
) -> Result<Json<Category>, StatusCode> {
    // Call the category service to update the category
    match state.update_category(id, payload).await {
        Ok(Some(category)) => Ok(Json(category)),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(err) => {
            eprintln!("Error updating category: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// Handler to delete a category
async fn delete_category(
    Path(id): Path<Uuid>,
    State(state): State<Arc<CategoryService>>,
) -> StatusCode {
    // Call the category service to delete the category
    match state.delete_category(id).await {
        Ok(true) => StatusCode::NO_CONTENT,
        Ok(false) => StatusCode::NOT_FOUND,
        Err(err) => {
            eprintln!("Error deleting category: {:?}", err);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
