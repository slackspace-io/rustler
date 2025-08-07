# Decimal Separator Setting Fix

## Issue Description
The comma vs period setting for decimal separators was not being used when set in settings.

## Root Cause
Some components in the application were directly using JavaScript's built-in `toFixed(2)` method to format numbers instead of using the `formatNumber` utility function from the settings context. This meant that the user's preference for decimal separator (comma vs period) was not being consistently applied throughout the application.

## Changes Made

### 1. Updated AccountView.tsx
- Added import for the `useSettings` hook
- Added `const { formatNumber } = useSettings();` to extract the formatting function
- Replaced `account.balance.toFixed(2)` with `formatNumber(account.balance)` for displaying the account balance
- Replaced `transaction.amount.toFixed(2)` with `formatNumber(transaction.amount)` for displaying transaction amounts in the table

### 2. Updated AccountsList.tsx
- Added import for the `useSettings` hook
- Added `const { formatNumber } = useSettings();` to extract the formatting function
- Replaced `account.balance.toFixed(2)` with `formatNumber(account.balance)` in the account table
- Replaced `totalBalance.toFixed(2)` with `formatNumber(totalBalance)` in the total balance display
- Replaced `onBudgetBalance.toFixed(2)` with `formatNumber(onBudgetBalance)` in the on-budget balance display
- Replaced `offBudgetBalance.toFixed(2)` with `formatNumber(offBudgetBalance)` in the off-budget balance display

### 3. Created a Test Script
Created `test_decimal_separator.sh` to test the decimal separator setting:
- Sets the decimal separator to comma via the API
- Verifies the setting was changed
- Prompts the user to check the UI to confirm the formatting is applied correctly
- Sets the decimal separator back to period
- Verifies the setting was changed back

## How to Test
1. Make sure the application is running
2. Run the test script:
   ```bash
   ./test_decimal_separator.sh
   ```
3. When prompted, navigate to the account page in your browser and verify that the decimal separator is displayed as a comma
4. After the script completes, verify that the decimal separator is displayed as a period again

## Additional Notes
The `formatNumber` function in `settings.ts` handles the formatting of numbers according to the user's preference:
- If `numberFormat` is set to `'comma'`, it replaces the period with a comma
- If `numberFormat` is set to `'decimal'` (default), it uses the standard period as the decimal separator

This fix ensures that the user's preference for decimal separator is consistently applied throughout the application.
