#!/bin/bash
set -e

# Test script for Amex Premium account balance graph issue

echo "Testing Amex Premium account balance graph..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Get all accounts to find the Amex Premium account
echo "Getting all accounts..."
ACCOUNTS=$(curl -s -X GET "$BASE_URL/api/accounts")
echo "$ACCOUNTS" | jq .

# Extract the Amex Premium account ID
AMEX_PREMIUM_ID=$(echo "$ACCOUNTS" | jq -r '.[] | select(.name=="Amex Premium") | .id')
echo "Amex Premium account ID: $AMEX_PREMIUM_ID"

if [ -z "$AMEX_PREMIUM_ID" ]; then
  echo "Error: Could not find Amex Premium account"
  exit 1
fi

# Get the current balance of the Amex Premium account
AMEX_PREMIUM_BALANCE=$(echo "$ACCOUNTS" | jq -r '.[] | select(.name=="Amex Premium") | .balance')
echo "Amex Premium current balance: $AMEX_PREMIUM_BALANCE"

# Get transactions for the Amex Premium account
echo "Getting transactions for the Amex Premium account..."
curl -s -X GET "$BASE_URL/api/accounts/$AMEX_PREMIUM_ID/transactions" | jq .

echo "Test completed."
echo "To view the diagnostic logs:"
echo "1. Open the application in your browser"
echo "2. Navigate to the Balance Over Time report"
echo "3. Select the Amex Premium account"
echo "4. Open the browser developer console to view the logs"
echo "5. Check if the balance shown in the graph matches the actual balance of $AMEX_PREMIUM_BALANCE"
