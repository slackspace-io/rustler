#!/bin/bash
set -e

# Test script for reproducing the initial balance date change issue

echo "Testing initial balance date change issue..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Create a test account with initial balance of 5,000
echo "Creating test account with initial balance of 5,000..."
ACCOUNT_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Account","account_type":"On Budget","balance":5000,"currency":"USD"}' \
  | jq -r '.id')

echo "Account ID: $ACCOUNT_ID"

# Get the account to verify initial balance
echo "Verifying initial balance..."
curl -s -X GET "$BASE_URL/api/accounts/$ACCOUNT_ID" | jq .

# Get the initial balance transaction
echo "Finding initial balance transaction..."
TRANSACTION_ID=$(curl -s -X GET "$BASE_URL/api/transactions?account_id=$ACCOUNT_ID" \
  | jq -r '.[] | select(.description=="Initial Balance") | .id')

echo "Initial Balance Transaction ID: $TRANSACTION_ID"

# Change the date of the initial balance transaction to August 1st
echo "Changing date of initial balance transaction to August 1st..."
curl -s -X PUT "$BASE_URL/api/transactions/$TRANSACTION_ID" \
  -H "Content-Type: application/json" \
  -d '{"transaction_date":"2025-08-01T00:00:00Z"}' \
  | jq .

# Get the transaction to verify the date change
echo "Verifying date change..."
curl -s -X GET "$BASE_URL/api/transactions/$TRANSACTION_ID" | jq .

echo "Test completed. To verify the issue:"
echo "1. Open the application in your browser"
echo "2. Navigate to the Reports section"
echo "3. Select 'Balance Over Time'"
echo "4. Choose a date range that includes August 1st"
echo "5. Select the 'Test Account'"
echo "6. Observe that the account balance incorrectly jumps to 10,000 on August 1st"
