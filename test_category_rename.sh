#!/bin/bash
set -euo pipefail

BASE_URL="http://localhost:3000/api"

echo "Creating category 'Groceries'..."
new_cat=$(curl -s -X POST "$BASE_URL/categories" -H 'Content-Type: application/json' -d '{"name":"Groceries"}')
cat_id=$(echo "$new_cat" | jq -r .id)

echo "Category ID: $cat_id"

# Create a default account if not exists and fetch one account id
acct_id=$(curl -s "$BASE_URL/accounts" | jq -r '.[0].id')
if [[ -z "$acct_id" || "$acct_id" == "null" ]]; then
  echo "No account exists. Creating a default account..."
  created=$(curl -s -X POST "$BASE_URL/accounts" -H 'Content-Type: application/json' -d '{"name":"Checking","account_type":"On Budget","currency":"USD"}')
  acct_id=$(echo "$created" | jq -r .id)
fi

echo "Using account: $acct_id"

now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "Creating a transaction with category 'Groceries'..."
tx=$(curl -s -X POST "$BASE_URL/transactions" -H 'Content-Type: application/json' -d "{\
  \"source_account_id\": \"$acct_id\",\
  \"description\": \"Test purchase\",\
  \"amount\": 12.34,\
  \"category\": \"Groceries\",\
  \"transaction_date\": \"$now\"\
}")

tx_id=$(echo "$tx" | jq -r .id)

echo "Transaction created: $tx_id"

cat_id_on_tx=$(echo "$tx" | jq -r .category_id)
if [[ "$cat_id_on_tx" != "$cat_id" ]]; then
  echo "Error: transaction.category_id ($cat_id_on_tx) does not match category id ($cat_id)"
  exit 1
fi

echo "Renaming category to 'Food - Groceries'..."
upd=$(curl -s -X PUT "$BASE_URL/categories/$cat_id" -H 'Content-Type: application/json' -d '{"name":"Food - Groceries"}')

# Fetch the transaction again
fetched=$(curl -s "$BASE_URL/transactions/$tx_id")
cat_id_after=$(echo "$fetched" | jq -r .category_id)

if [[ "$cat_id_after" != "$cat_id" ]]; then
  echo "Error: category_id changed after rename!"
  exit 1
fi

echo "Success: category rename kept transaction linkage via category_id ($cat_id)."

# Verify spending by category reflects the new category name
report=$(curl -s "$BASE_URL/categories/spending" | jq -r '.[] | select(.category=="Food - Groceries") | .amount' || true)
if [[ -z "$report" || "$report" == "null" ]]; then
  echo "Error: spending report did not reflect new category name."
  echo "Full spending response:"; curl -s "$BASE_URL/categories/spending" | jq .
  exit 1
fi

# Ensure the amount is the expected 12.34 (allowing minor float variations)
expected=12.34
# Using awk for float comparison tolerance (within 0.01)
diff=$(awk -v a="$report" -v b="$expected" 'BEGIN{d=a-b; if (d<0) d=-d; print d}')
if (( \
  $(echo "$diff > 0.01" | bc -l) \
)); then
  echo "Error: spending amount ($report) does not match expected ($expected)."
  exit 1
fi

echo "Test completed successfully!"
