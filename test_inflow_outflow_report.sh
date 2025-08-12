#!/bin/bash
set -e

# Simple test for inflow vs outflow report endpoint
BASE_URL="http://localhost:3000"

echo "Testing /api/reports/inflow-outflow..."

# Default (last 3 months handled in UI; here we just call without params)
RESP=$(curl -s -X GET "$BASE_URL/api/reports/inflow-outflow")

if [ -z "$RESP" ]; then
  echo "Empty response"
  exit 1
fi

echo "$RESP" | jq '.'

echo "OK"
