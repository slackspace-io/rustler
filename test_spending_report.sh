#!/bin/bash
set -e

# Simple test for the spending report API
BASE_URL="http://localhost:3000"

echo "Testing spending report (default: month, grouped by category group, all on-budget accounts)..."
curl -s "${BASE_URL}/api/reports/spending?start_date=2025-01-01&end_date=2025-12-31" | jq . | head -n 50

echo "Testing spending report (week period, ungrouped/categories, specific accounts if provided via ACCOUNTS env var)..."
if [ -n "$ACCOUNTS" ]; then
  curl -s "${BASE_URL}/api/reports/spending?period=week&group=false&account_ids=${ACCOUNTS}&start_date=2025-01-01&end_date=2025-12-31" | jq . | head -n 50
else
  echo "ACCOUNTS env var not provided; skipping account-specific test."
fi

echo "Done."
