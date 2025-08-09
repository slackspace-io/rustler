use axum::{Router, routing::get, Json};
use serde::Serialize;

#[derive(Serialize, Clone, Copy)]
pub struct FeaturesResponse {
    pub firefly_import: bool,
}

async fn get_features(features: FeaturesResponse) -> Json<FeaturesResponse> {
    Json(features)
}

pub fn router(firefly_import_enabled: bool) -> Router {
    let features = FeaturesResponse { firefly_import: firefly_import_enabled };
    Router::new().route("/features", get(move || get_features(features)))
}
