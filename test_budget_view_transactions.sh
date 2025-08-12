#!/usr/bin/env bash
set -euo pipefail

# Simple test: fetch transactions for the month linked to a given budget ID
# Usage: BUDGET_ID=<uuid> ./test_budget_view_transactions.sh

BASE_URL="http://localhost:3000/api"

if [[ -z "${BUDGET_ID:-}" ]]; then
  echo "Please provide a budget ID via BUDGET_ID env var"
  echo "Example: BUDGET_ID=2eab8c36-8ccd-4baf-8b60-7041e291dbf5 $0"
  exit 1
fi

echo "Fetching budget details..."
curl -s "$BASE_URL/budgets/$BUDGET_ID" | jq .

echo "Fetching transactions for budget's month..."
curl -s "$BASE_URL/budgets/$BUDGET_ID/transactions" | jq 'length as $n | . as $tx | {count:$n, sample: ($tx | .[:5])}'

echo "OK"
