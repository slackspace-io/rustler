mod accounts;
mod transactions;
mod categories;
mod budgets;
mod web;

use axum::{
    Router,
    routing::{get, post, put, delete},
};

pub fn create_router(
    account_service: Arc<AccountService>,
    transaction_service: Arc<TransactionService>,
    category_service: Arc<CategoryService>,
    budget_service: Arc<BudgetService>
) -> Router {
    Router::new()
        .merge(accounts::router(account_service))
        .merge(transactions::router(transaction_service))
        .merge(categories::router(category_service))
        .merge(budgets::router(budget_service))
}

pub use web::router as web_router_impl;

use std::sync::Arc;
use crate::services::{AccountService, TransactionService, CategoryService, BudgetService};

pub fn web_router(
    account_service: Arc<AccountService>,
    transaction_service: Arc<TransactionService>,
    category_service: Arc<CategoryService>,
    budget_service: Arc<BudgetService>
) -> Router {
    web_router_impl(account_service, transaction_service, category_service, budget_service)
}
