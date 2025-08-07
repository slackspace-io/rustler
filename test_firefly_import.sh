#!/bin/bash
set -e

# Test script for Firefly III import functionality

echo "Testing Firefly III import functionality..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Test API import method
echo "Testing API import method..."
API_RESPONSE=$(curl -s -X POST "$BASE_URL/api/imports/firefly" \
  -H "Content-Type: application/json" \
  -d '{
    "import_method": "api",
    "api_url": "https://demo.firefly-iii.org",
    "api_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiZGVtbyIsImlhdCI6MTYyMDY0OTc1MCwibmJmIjoxNjIwNjQ5NzUwLCJleHAiOjE2NTE3NTM3NTAsInN1YiI6IjEiLCJzY29wZXMiOltdfQ.demo"
  }')

echo "API import response:"
echo $API_RESPONSE | jq .

# Create sample CSV files for testing
echo "Creating sample CSV files for testing..."

# Create accounts CSV
cat > /tmp/firefly_accounts.csv << EOF
account_id,name,type,currency_code,current_balance,notes
1,Checking Account,asset,USD,1000.00,Main checking account
2,Savings Account,asset,USD,5000.00,Savings account
3,Credit Card,asset,USD,-500.00,Credit card
4,Mortgage,loan,USD,-150000.00,Home mortgage
5,Groceries,expense,USD,0.00,Grocery expenses
6,Salary,revenue,USD,0.00,Monthly salary
EOF

# Create transactions CSV
cat > /tmp/firefly_transactions.csv << EOF
journal_id,type,description,date,amount,source_id,source_name,destination_id,destination_name,category_name,notes
1,withdrawal,Grocery shopping,2023-01-15T12:00:00Z,75.50,1,Checking Account,5,Groceries,Food,Weekly groceries
2,deposit,Salary payment,2023-01-31T09:00:00Z,2500.00,6,Salary,1,Checking Account,Income,Monthly salary
3,transfer,Savings transfer,2023-01-20T15:30:00Z,500.00,1,Checking Account,2,Savings Account,Transfer,Monthly savings
4,withdrawal,Mortgage payment,2023-01-05T10:00:00Z,1200.00,1,Checking Account,4,Mortgage,Housing,Monthly mortgage payment
EOF

# Test CSV import method
echo "Testing CSV import method..."
CSV_RESPONSE=$(curl -s -X POST "$BASE_URL/api/imports/firefly" \
  -H "Content-Type: application/json" \
  -d "{
    \"import_method\": \"csv\",
    \"accounts_csv_path\": \"/tmp/firefly_accounts.csv\",
    \"transactions_csv_path\": \"/tmp/firefly_transactions.csv\"
  }")

echo "CSV import response:"
echo $CSV_RESPONSE | jq .

# Clean up temporary files
echo "Cleaning up temporary files..."
rm /tmp/firefly_accounts.csv
rm /tmp/firefly_transactions.csv

echo "Test completed successfully!"
