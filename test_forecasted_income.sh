#!/bin/bash
set -e

# Test script for forecasted monthly income

echo "Testing forecasted monthly income..."

# Base URL for the API
BASE_URL="http://localhost:3000"

# Try to get the current forecasted monthly income
echo "Getting current forecasted monthly income..."
curl -s -X GET "$BASE_URL/api/settings/forecasted-monthly-income" || echo "Failed to get forecasted monthly income"

# Try to update the forecasted monthly income
echo "Updating forecasted monthly income..."
curl -s -X PUT "$BASE_URL/api/settings/forecasted-monthly-income" \
  -H "Content-Type: application/json" \
  -d '{"value":"2500.00"}' || echo "Failed to update forecasted monthly income"

# Try to get the updated forecasted monthly income
echo "Getting updated forecasted monthly income..."
curl -s -X GET "$BASE_URL/api/settings/forecasted-monthly-income" || echo "Failed to get forecasted monthly income"

echo "Test completed!"
