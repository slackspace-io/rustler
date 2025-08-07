#!/bin/bash
set -e

# Test script for pagination functionality

echo "Testing pagination functionality..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Get all accounts to find one to test with
echo "Getting all accounts..."
ACCOUNTS=$(curl -s -X GET "$BASE_URL/api/accounts")
ACCOUNT_ID=$(echo $ACCOUNTS | jq -r '.[0].id')

if [ -z "$ACCOUNT_ID" ] || [ "$ACCOUNT_ID" == "null" ]; then
  echo "No accounts found. Creating a test account..."
  ACCOUNT_ID=$(curl -s -X POST "$BASE_URL/api/accounts" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Pagination Account","account_type":"checking","balance":1000.00}' \
    | jq -r '.id')
  echo "Created account with ID: $ACCOUNT_ID"
fi

# Create multiple transactions to ensure we have enough for pagination
echo "Creating test transactions..."
for i in {1..25}; do
  curl -s -X POST "$BASE_URL/api/transactions" \
    -H "Content-Type: application/json" \
    -d "{\"source_account_id\":\"$ACCOUNT_ID\",\"description\":\"Test Transaction $i\",\"amount\":10.00,\"category\":\"Test\",\"transaction_date\":\"$(date -I)\"}" \
    > /dev/null
  echo "Created transaction $i"
done

# Test pagination with different page sizes
echo "Testing pagination with different page sizes..."

# Test page 1 with limit 5
echo "Getting page 1 with limit 5..."
PAGE1=$(curl -s -X GET "$BASE_URL/api/accounts/$ACCOUNT_ID/transactions?limit=5&offset=0")
COUNT1=$(echo $PAGE1 | jq '. | length')
echo "Page 1 returned $COUNT1 transactions"

if [ "$COUNT1" -ne 5 ]; then
  echo "Error: Expected 5 transactions, got $COUNT1"
  exit 1
fi

# Test page 2 with limit 5
echo "Getting page 2 with limit 5..."
PAGE2=$(curl -s -X GET "$BASE_URL/api/accounts/$ACCOUNT_ID/transactions?limit=5&offset=5")
COUNT2=$(echo $PAGE2 | jq '. | length')
echo "Page 2 returned $COUNT2 transactions"

if [ "$COUNT2" -ne 5 ]; then
  echo "Error: Expected 5 transactions, got $COUNT2"
  exit 1
fi

# Verify that page 1 and page 2 contain different transactions
FIRST_ID_PAGE1=$(echo $PAGE1 | jq -r '.[0].id')
FIRST_ID_PAGE2=$(echo $PAGE2 | jq -r '.[0].id')

if [ "$FIRST_ID_PAGE1" == "$FIRST_ID_PAGE2" ]; then
  echo "Error: Page 1 and Page 2 contain the same first transaction"
  exit 1
fi

echo "Pagination test completed successfully!"
echo "Note: Please manually verify the UI pagination controls in the browser."
