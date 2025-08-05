#!/bin/bash
set -e

# Test script for balance over time graph

echo "Testing balance over time graph..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Get all accounts to verify their balances
echo "Getting all accounts..."
curl -s -X GET "$BASE_URL/api/accounts" | jq .

# Get transactions for a specific account (replace with an actual account ID)
echo "Getting transactions for the first account..."
ACCOUNT_ID=$(curl -s -X GET "$BASE_URL/api/accounts" | jq -r '.[0].id')
echo "Account ID: $ACCOUNT_ID"

echo "Getting transactions for this account..."
curl -s -X GET "$BASE_URL/api/accounts/$ACCOUNT_ID/transactions" | jq .

echo "Test completed. Please verify that the balance graph now shows the correct balance for this account."
echo "To test the graph, open the application in your browser and navigate to the Balance Over Time report."
echo "Select the account you just checked and verify that the balance matches what you see in the account list."
