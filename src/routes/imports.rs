use axum::{
    extract::{Multipart, State},
    http::{StatusCode, HeaderMap},
    Json,
    Router,
    routing::post,
};
use std::sync::Arc;
use std::env;
use axum::extract::DefaultBodyLimit;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;
use tracing::{info, error, debug};

use crate::services::FireflyImportService;
use crate::models::firefly_import::{FireflyImportOptions, ImportResult};

pub fn router(import_service: Arc<FireflyImportService>) -> Router {
    Router::new()
        .route("/imports/firefly", post(import_from_firefly))
        .route("/imports/firefly/upload", post(upload_firefly_csv))
        .layer(DefaultBodyLimit::max(50 * 1024 * 1024)) // 50MB limit
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

// Handler to upload CSV files for Firefly import
async fn upload_firefly_csv(
    State(state): State<Arc<FireflyImportService>>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<Json<ImportResult>, (StatusCode, Json<String>)> {
    // Check content type
    let content_type = headers.get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    // Log all headers for debugging
    debug!("Request headers:");
    for (name, value) in headers.iter() {
        debug!("  {}: {}", name, value.to_str().unwrap_or("<binary>"));
    }

    if !content_type.starts_with("multipart/form-data") {
        error!("Invalid content type: {}", content_type);
        return Err((
            StatusCode::BAD_REQUEST,
            Json("Invalid content type. Expected multipart/form-data".to_string()),
        ));
    }

    info!("Processing multipart form data upload");

    // Create a temporary directory for the uploaded files
    let temp_dir = env::temp_dir().join("rustler_uploads").join(Uuid::new_v4().to_string());
    debug!("Creating temporary directory: {:?}", temp_dir);

    fs::create_dir_all(&temp_dir).await.map_err(|e| {
        error!("Failed to create temporary directory: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(format!("Failed to create temporary directory: {}", e)),
        )
    })?;

    let mut accounts_path = None;
    let mut transactions_path = None;

    // Process each part of the multipart form
    debug!("Starting to process multipart form fields");
    let mut field_count = 0;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        error!("Failed to process multipart form: {}", e);
        (
            StatusCode::BAD_REQUEST,
            Json(format!("Failed to process multipart form: {}", e)),
        )
    })? {
        field_count += 1;
        debug!("Processing field #{}", field_count);

        let name = field.name().unwrap_or("").to_string();
        let file_name = field.file_name().unwrap_or("unknown").to_string();
        let content_type = field.content_type().unwrap_or("").to_string();

        debug!("Field details: name={}, file_name={}, content_type={}", name, file_name, content_type);

        // Determine the file path based on the field name
        let file_path = temp_dir.join(&file_name);
        debug!("Target file path: {:?}", file_path);

        // Create file for streaming
        debug!("Creating file...");
        let mut file = fs::File::create(&file_path).await.map_err(|e| {
            error!("Failed to create file: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(format!("Failed to create file: {}", e)),
            )
        })?;
        debug!("File created successfully");

        // Read the field data
        debug!("Reading field data...");

        // Use a simpler, more direct approach to read field data
        let data = field.bytes().await.map_err(|e| {
            // Log detailed error information
            error!("Failed to read field data: {}", e);
            error!("Error details: {:?}", e);
            error!("Field name: {}, file name: {}", name, file_name);

            // Return a more descriptive error with field information
            (
                StatusCode::BAD_REQUEST,
                Json(format!("Failed to read file data from field '{}': {}", name, e)),
            )
        })?;

        debug!("Successfully read {} bytes of data", data.len());
        debug!("Processing {} bytes of data for field '{}'", data.len(), name);

        // Log the first few bytes of data for debugging
        if data.len() > 0 {
            let preview_size = std::cmp::min(data.len(), 100);
            let preview = String::from_utf8_lossy(&data[0..preview_size]);
            debug!("Data preview for '{}': {}", name, preview);
        } else {
            error!("Empty data received for field '{}'", name);
        }

        // Write the data to the file
        file.write_all(&data).await.map_err(|e| {
            error!("Failed to write file: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(format!("Failed to write file: {}", e)),
            )
        })?;

        // Flush and close the file
        file.flush().await.map_err(|e| {
            error!("Failed to flush file: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(format!("Failed to write file: {}", e)),
            )
        })?;

        info!("Successfully wrote file: {:?}", file_path);

        // Store the file path based on the field name
        if name == "accounts" {
            accounts_path = Some(file_path.to_string_lossy().to_string());
        } else if name == "transactions" {
            transactions_path = Some(file_path.to_string_lossy().to_string());
        }
    }

    // Check if both files were uploaded
    if accounts_path.is_none() || transactions_path.is_none() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json("Both accounts and transactions files are required".to_string()),
        ));
    }

    // Create import options
    let options = FireflyImportOptions {
        import_method: "csv".to_string(),
        api_url: None,
        api_token: None,
        accounts_csv_path: accounts_path,
        transactions_csv_path: transactions_path,
        account_type_mapping: Default::default(),
    };

    // Call the import service
    match state.import(options).await {
        Ok(result) => {
            // Clean up temporary files
            let _ = fs::remove_dir_all(&temp_dir).await;
            Ok(Json(result))
        }
        Err(err) => {
            // Clean up temporary files
            let _ = fs::remove_dir_all(&temp_dir).await;
            eprintln!("Error importing from Firefly III CSV: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(format!("Import failed: {}", err)),
            ))
        }
    }
}
