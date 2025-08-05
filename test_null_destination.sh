#!/bin/bash

# Test script to verify that the destination account is displayed correctly
# when destination_name is null but destination_account_id is present

echo "Testing destination account display with null destination_name..."

# Create two test accounts
echo "Creating test accounts..."
ACCOUNT_C=$(curl -s -X POST "http://localhost:3000/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Account C","account_type":"CHECKING","balance":1000,"currency":"USD"}' \
  | jq -r '.id')

ACCOUNT_D=$(curl -s -X POST "http://localhost:3000/api/accounts" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Account D","account_type":"CHECKING","balance":1000,"currency":"USD"}' \
  | jq -r '.id')

echo "Created Account C: $ACCOUNT_C"
echo "Created Account D: $ACCOUNT_D"

# Create a transaction from Account C to Account D with null destination_name
echo "Creating transaction from Account C to Account D with null destination_name..."
TRANSACTION=$(curl -s -X POST "http://localhost:3000/api/transactions" \
  -H "Content-Type: application/json" \
  -d "{\"source_account_id\":\"$ACCOUNT_C\",\"destination_account_id\":\"$ACCOUNT_D\",\"destination_name\":null,\"description\":\"Test Null Destination\",\"amount\":100,\"category\":\"Transfer\",\"transaction_date\":\"$(date -Iseconds)\"}" \
  | jq -r '.id')

echo "Created Transaction: $TRANSACTION"

# Get transactions for Account C
echo "Getting transactions for Account C..."
ACCOUNT_C_TRANSACTIONS=$(curl -s "http://localhost:3000/api/accounts/$ACCOUNT_C/transactions")
echo "Account C Transactions:"
echo "$ACCOUNT_C_TRANSACTIONS" | jq '.'

# Get transactions for Account D
echo "Getting transactions for Account D..."
ACCOUNT_D_TRANSACTIONS=$(curl -s "http://localhost:3000/api/accounts/$ACCOUNT_D/transactions")
echo "Account D Transactions:"
echo "$ACCOUNT_D_TRANSACTIONS" | jq '.'

echo "Test completed. Please verify in the UI that:"
echo "1. When viewing Account C, it shows 'Test Account D' as the destination (looked up from accounts list)"
echo "2. When viewing Account D, it shows 'Test Account C' as the destination"
