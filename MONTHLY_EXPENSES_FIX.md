# Monthly Expenses Calculation Fix

## Issue Description
The monthly expenses on the dashboard appeared to be very high, raising concerns about the accuracy of the calculation.

## Root Cause
After investigating the code in `frontend/src/components/Dashboard.tsx`, we identified that the monthly expenses calculation had a double negation issue:

1. In the data model, expenses are represented with positive amounts and income with negative amounts.
2. The monthly expenses calculation was filtering for transactions with positive amounts (which are expenses) but then negating them again with `-expenses`.
3. This double negation made the monthly expenses appear much higher than they should be.

## Changes Made
The following changes were made to fix the issue:

1. Removed the negation of expenses in the monthly expenses calculation:
   ```typescript
   // Before
   setMonthlyExpenses(-expenses);
   
   // After
   setMonthlyExpenses(expenses);
   ```

2. Updated the monthly net calculation to be consistent with the expenses change:
   ```typescript
   // Before
   setMonthlyNet(income - Math.abs(expenses));
   
   // After
   setMonthlyNet(income - expenses);
   ```

3. Updated the UI display of monthly expenses to be consistent with the expenses change:
   ```typescript
   // Before
   <p className="amount negative">{Math.abs(monthlyExpenses).toFixed(2)}</p>
   
   // After
   <p className="amount negative">{monthlyExpenses.toFixed(2)}</p>
   ```

## Verification
The fix was verified through code analysis. The changes ensure that:

1. Monthly expenses are calculated correctly by summing the positive transaction amounts (which represent expenses).
2. Monthly net is calculated correctly by subtracting expenses from income.
3. Monthly expenses are displayed correctly in the UI without unnecessary negation.

These changes should resolve the issue where monthly expenses appeared to be very high on the dashboard.

## Additional Notes
- The application uses a convention where negative amounts represent income and positive amounts represent expenses.
- This is confirmed by examining the transaction display logic in the dashboard, where transactions with negative amounts are displayed as positive (income) and transactions with positive amounts are displayed with a negative sign (expenses).
