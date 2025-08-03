mod accounts;
mod transactions;

use axum::{
    Router,
    routing::{get, post, put, delete},
};

pub fn create_router() -> Router {
    Router::new()
        .merge(accounts::router())
        .merge(transactions::router())
}
