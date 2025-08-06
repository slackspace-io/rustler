use axum::{
    extract::State,
    http::StatusCode,
    Json,
    Router,
    routing::post,
};
use std::sync::Arc;

use crate::services::FireflyImportService;
use crate::models::firefly_import::{FireflyImportOptions, ImportResult};

pub fn router(import_service: Arc<FireflyImportService>) -> Router {
    Router::new()
        .route("/imports/firefly", post(import_from_firefly))
        .with_state(import_service)
}

// Handler to import data from Firefly III
async fn import_from_firefly(
    State(state): State<Arc<FireflyImportService>>,
    Json(options): Json<FireflyImportOptions>,
) -> Result<Json<ImportResult>, (StatusCode, Json<String>)> {
    // Call the import service to import data from Firefly III
    match state.import(options).await {
        Ok(result) => Ok(Json(result)),
        Err(err) => {
            eprintln!("Error importing from Firefly III: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(format!("Import failed: {}", err)),
            ))
        }
    }
}
