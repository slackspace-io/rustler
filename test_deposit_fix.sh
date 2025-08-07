#!/bin/bash
set -e

# Test script for Firefly III deposit import fix

echo "Testing Firefly III deposit import fix..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Create accounts CSV with the accounts from our test case
echo "Creating accounts CSV file..."
cat > /tmp/firefly_accounts_deposit_fix.csv << EOF
account_id,name,type,currency_code,current_balance,notes
1,SEB Checking,Asset account,SEK,0.00,Checking account
2,Lön,Revenue account,SEK,0.00,Salary account
3,Forsakringskassan,Revenue account,SEK,0.00,Insurance account
EOF

echo "Using transactions from test_deposit_fix.csv..."

# Test CSV import method
echo "Testing CSV import method with deposit transactions..."
CSV_RESPONSE=$(curl -s -X POST "$BASE_URL/api/imports/firefly" \
  -H "Content-Type: application/json" \
  -d "{
    \"import_method\": \"csv\",
    \"accounts_csv_path\": \"/tmp/firefly_accounts_deposit_fix.csv\",
    \"transactions_csv_path\": \"$(pwd)/test_deposit_fix.csv\",
    \"account_type_mapping\": {
      \"asset\": \"On Budget\",
      \"expense\": \"External\",
      \"revenue\": \"External\",
      \"loan\": \"Off Budget\",
      \"debt\": \"Off Budget\",
      \"liabilities\": \"Off Budget\",
      \"other\": \"External\",
      \"account_specific\": {}
    }
  }")

echo "CSV import response:"
echo $CSV_RESPONSE | jq .

# Verify the imported transactions
echo "Verifying imported transactions..."
TRANSACTIONS=$(curl -s -X GET "$BASE_URL/api/transactions")
echo "Transactions in the system:"
echo $TRANSACTIONS | jq '.[] | select(.description == "Salary" or .description == "Forsakringskassan")'

# Clean up temporary files
echo "Cleaning up temporary files..."
rm /tmp/firefly_accounts_deposit_fix.csv

echo "Test completed successfully!"
