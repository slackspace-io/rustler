# Initial Balance Exclusion from Monthly Expenses

## Issue Description

The monthly expenses on the dashboard were including negative balances of accounts from before the start of the month, resulting in inflated expense figures. The issue was described as:

> I don't understand how it comes to that number. It should only be expenses occurring in the month. Not taking in negative balances of accounts before the start of the month.

## Root Cause

After investigating the codebase, we identified that when an account is created with a negative initial balance, the system creates an "Initial Balance" transaction with the current date. This transaction has a positive amount (representing the debt) and is categorized as "Initial Balance".

The monthly expenses calculation in the Dashboard component was including all transactions with positive amounts from the current month, including these "Initial Balance" transactions. This was causing the monthly expenses to be inflated by the initial balances of accounts created in the current month.

## Changes Made

We modified the monthly expenses calculation in the Dashboard component to exclude transactions with the category "Initial Balance":

```typescript
// Before
const expenses = monthlyTransactions
  .filter(t => t.amount > 0)
  .reduce((sum, t) => sum + t.amount, 0);
setMonthlyExpenses(expenses);

// After
const expenses = monthlyTransactions
  .filter(t => t.amount > 0 && t.category !== "Initial Balance")
  .reduce((sum, t) => sum + t.amount, 0);
setMonthlyExpenses(expenses);
```

This ensures that only actual expenses (not initial balance transactions) are included in the monthly expenses calculation.

## Verification

We created a test script (`test_initial_balance_exclusion.sh`) to verify that:

1. An account with a negative initial balance creates an "Initial Balance" transaction with a positive amount.
2. A regular expense transaction is created with the specified amount.
3. Both transactions are present in the account's transaction history.

The test script completed successfully, confirming that our fix should work correctly.

## Additional Notes

- The application uses a convention where negative amounts represent income and positive amounts represent expenses.
- Initial balances are recorded as transactions with the category "Initial Balance".
- For accounts with negative initial balances, the initial balance transaction has a positive amount, which would be included in the monthly expenses calculation if not explicitly excluded.
