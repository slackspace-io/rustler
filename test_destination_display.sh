#!/bin/bash

# Test script to verify that the destination account is displayed correctly
# for both sides of a transaction

echo "Testing destination account display..."

# Create two test accounts
echo "Creating test accounts..."
ACCOUNT_A=$(curl -s -X POST "http://localhost:3000/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Account A","account_type":"CHECKING","balance":1000,"currency":"USD"}' \
  | jq -r '.id')

ACCOUNT_B=$(curl -s -X POST "http://localhost:3000/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Account B","account_type":"CHECKING","balance":1000,"currency":"USD"}' \
  | jq -r '.id')

echo "Created Account A: $ACCOUNT_A"
echo "Created Account B: $ACCOUNT_B"

# Create a transaction from Account A to Account B
echo "Creating transaction from Account A to Account B..."
TRANSACTION=$(curl -s -X POST "http://localhost:3000/api/transactions" \
  -H "Content-Type: application/json" \
  -d "{\"source_account_id\":\"$ACCOUNT_A\",\"destination_account_id\":\"$ACCOUNT_B\",\"description\":\"Test Transaction\",\"amount\":100,\"category\":\"Transfer\",\"transaction_date\":\"$(date -Iseconds)\"}" \
  | jq -r '.id')

echo "Created Transaction: $TRANSACTION"

# Get transactions for Account A
echo "Getting transactions for Account A..."
ACCOUNT_A_TRANSACTIONS=$(curl -s "http://localhost:3000/api/accounts/$ACCOUNT_A/transactions")
echo "Account A Transactions:"
echo "$ACCOUNT_A_TRANSACTIONS" | jq '.'

# Get transactions for Account B
echo "Getting transactions for Account B..."
ACCOUNT_B_TRANSACTIONS=$(curl -s "http://localhost:3000/api/accounts/$ACCOUNT_B/transactions")
echo "Account B Transactions:"
echo "$ACCOUNT_B_TRANSACTIONS" | jq '.'

echo "Test completed. Please verify in the UI that:"
echo "1. When viewing Account A, it shows 'Test Account B' as the destination"
echo "2. When viewing Account B, it shows 'Test Account A' as the destination"
