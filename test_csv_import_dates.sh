#!/bin/bash

# Test script for CSV import date handling
# This script tests that the CSV import correctly handles ISO 8601 date formats

echo "Testing CSV import with ISO 8601 date format..."

# Create a test account
ACCOUNT_ID=$(curl -s -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CSV Import Test Account",
    "account_type": "Checking",
    "balance": 1000.00,
    "currency": "USD"
  }' | jq -r '.id')

echo "Created test account with ID: $ACCOUNT_ID"

# Import a transaction with ISO 8601 date format
IMPORT_RESULT=$(curl -s -X POST "http://localhost:3000/api/transactions/import/$ACCOUNT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "column_mapping": {
      "description": 0,
      "amount": 1,
      "transaction_date": 2
    },
    "data": [
      ["Test ISO Date Transaction", "100.00", "2025-08-03T17:21:12+00:00"]
    ]
  }')

echo "Import result: $IMPORT_RESULT"

# Wait a moment for the transaction to be processed
echo "Waiting for transaction to be processed..."
sleep 2

# Get the transactions to verify the date was imported correctly
TRANSACTIONS=$(curl -s "http://localhost:3000/api/accounts/$ACCOUNT_ID/transactions")

echo "Transactions after import:"
echo "$TRANSACTIONS" | jq '.'

# Check if we got any transactions
if [ "$(echo "$TRANSACTIONS" | jq 'length')" -eq 0 ]; then
  echo "ERROR: No transactions found. The import may have failed."
  echo "Checking server logs for errors..."
  # You might want to check server logs here if available

  # Let's try to get more information about the import
  echo "Import response details:"
  echo "$IMPORT_RESULT" | jq '.'
fi

# Check if the transaction date matches the expected date
DATE_CHECK=$(echo "$TRANSACTIONS" | jq -r '.[0].transaction_date')
echo "Transaction date: $DATE_CHECK"

if [[ "$DATE_CHECK" == *"2025-08-03"* ]]; then
  echo "SUCCESS: Date was correctly imported with ISO 8601 format"
else
  echo "FAILURE: Date was not correctly imported. Expected date containing 2025-08-03 but got $DATE_CHECK"
fi

# Clean up - delete the test account
curl -s -X DELETE "http://localhost:3000/api/accounts/$ACCOUNT_ID"
echo "Test account deleted"
