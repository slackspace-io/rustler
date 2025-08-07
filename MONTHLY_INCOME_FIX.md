# Monthly Income Fix

## Issue
Monthly Income was showing 0 despite deposits for on-budget accounts.

## Root Cause
In the `get_monthly_incoming_funds` method of the `BudgetService`, the SQL query that calculates monthly income was only counting transactions with the category 'Income'. This meant that deposits to on-budget accounts with other categories or no category were not being counted in the monthly income calculation.

## Solution
The fix was to remove the category filter from the SQL query in the `get_monthly_incoming_funds` method. Now all deposits (negative amount transactions) to on-budget accounts are counted as income, regardless of their category.

### Changes Made
Modified the SQL query in `src/services/budget_service.rs` to remove the `AND t.category = 'Income'` condition:

```diff
SELECT COALESCE(SUM(ABS(t.amount)), 0.0)
FROM transactions t
JOIN accounts src ON t.source_account_id = src.id
WHERE src.account_type = 'On Budget'
AND t.amount < 0
- AND t.category = 'Income'
AND t.transaction_date >= $1
AND t.transaction_date < $2
```

## Testing
The fix was tested using the `test_monthly_income.sh` script, which:
1. Creates an on-budget account
2. Gets the initial monthly income (which was 0)
3. Creates a transaction with a negative amount (deposit)
4. Gets the updated monthly income
5. Verifies that the monthly income increased

The test was successful, showing that the monthly income now properly includes deposits to on-budget accounts.

## Additional Notes
In this system:
- Deposits are represented as negative amounts
- The monthly income calculation now includes all deposits to on-budget accounts, regardless of their category
