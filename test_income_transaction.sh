#!/bin/bash
set -e

# Test script for income transactions (negative amounts)
# This script tests that negative amounts (income) correctly add to the account balance

echo "Testing income transactions (negative amounts)..."

# Base URL for the API
BASE_URL="http://localhost:3000/api"

# Create a test account with initial balance of 1000.0
echo "Creating test account..."
ACCOUNT_ID=$(curl -s -X POST "$BASE_URL/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Income Account","account_type":"Checking","balance":1000.0,"currency":"USD"}' \
  | jq -r '.id')

echo "Test account ID: $ACCOUNT_ID"
echo "Initial balance: 1000.0"

# Create an income transaction (negative amount)
echo "Creating income transaction (negative amount)..."
TRANSACTION_ID=$(curl -s -X POST "$BASE_URL/transactions" \
  -H "Content-Type: application/json" \
  -d "{\"source_account_id\":\"$ACCOUNT_ID\",\"destination_name\":\"Salary\",\"description\":\"Monthly Salary\",\"amount\":-500.0,\"category\":\"Income\",\"transaction_date\":null}" \
  | jq -r '.id')

echo "Transaction ID: $TRANSACTION_ID"

# Check account balance after transaction
echo "Checking account balance after income transaction..."
BALANCE=$(curl -s -X GET "$BASE_URL/accounts/$ACCOUNT_ID" | jq -r '.balance')
echo "Account balance: $BALANCE (expected: 1500.0)"

# Verify the balance is correct
if (( $(echo "$BALANCE == 1500.0" | bc -l) )); then
  echo "✅ Test passed: Income transaction correctly added to account balance"
else
  echo "❌ Test failed: Income transaction did not correctly add to account balance"
  echo "Expected: 1500.0, Actual: $BALANCE"
  exit 1
fi

# Clean up - delete the transaction and account
echo "Cleaning up - deleting test transaction and account..."
curl -s -X DELETE "$BASE_URL/transactions/$TRANSACTION_ID"
curl -s -X DELETE "$BASE_URL/accounts/$ACCOUNT_ID"

echo "Test completed successfully!"
