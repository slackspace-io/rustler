#!/bin/bash
set -e

# Test script for Firefly III import functionality using reference CSV files

echo "Testing Firefly III import with reference CSV files..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Test CSV import method with reference files
echo "Testing CSV import with reference files..."
CSV_RESPONSE=$(curl -s -X POST "$BASE_URL/api/imports/firefly" \
  -H "Content-Type: application/json" \
  -d "{
    \"import_method\": \"csv\",
    \"accounts_csv_path\": \"$(pwd)/reference_csvs/2025_08_06_accounts.csv\",
    \"transactions_csv_path\": \"$(pwd)/reference_csvs/2025_08_06_transactions.csv\"
  }")

echo "CSV import response:"
echo $CSV_RESPONSE | jq .

echo "Test completed successfully!"
