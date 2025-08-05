# Initial Balance Transaction Date Change Fix

## Issue Description

When a user creates an account with an initial balance and then changes the date of the initial balance transaction in the ledger, the Balance Over Time report shows incorrect balances. Specifically, the report shows the account starting at the correct initial balance but then incorrectly jumps to double that amount on the date of the modified initial balance transaction.

For example:
1. Create a new account called "Test" with an initial balance of 5,000
2. Change the date on the initial balance transaction to August 1st
3. When viewing the Balance Over Time report, the account incorrectly shows a balance of 5,000 initially, then jumps to 10,000 on August 1st

## Root Cause

The issue was caused by how the Balance Over Time report calculated account balances:

1. The account balance was stored directly in the `Account` model in the database
2. When calculating balances for the report, the code started with the current account balance (`account.balance`) and then adjusted it based on transactions
3. When a user changed the date of the initial balance transaction, the report calculation was double-counting the initial balance:
   - Once from the account's `balance` field
   - Again when processing the initial balance transaction

## Fix Implemented

The fix modifies the balance calculation logic in the `BalanceOverTime.tsx` component to only use transactions as the basis for calculating account balances, not the account's `balance` field:

1. Instead of starting with the account's current balance (`account.balance`), we now start with a balance of 0
2. We get all transactions for the account, regardless of date
3. We filter out transactions that occurred before the start date
4. We process all these earlier transactions to calculate the initial balance for the start date
5. We removed the special handling for initial balance transactions, as we now treat them like any other transaction

This approach ensures that we only use transactions (including the initial balance transaction) to calculate account balances, not the account's `balance` field. This fixes the issue where changing the date of the initial balance transaction causes incorrect reports.

## Testing

The fix was tested by:
1. Creating a test account with an initial balance of 5,000
2. Changing the date of the initial balance transaction to August 1st
3. Verifying that the Balance Over Time report shows the correct balance throughout
4. Running the existing balance graph test script to ensure no regressions

## Future Considerations

While this fix addresses the immediate issue with the Balance Over Time report, there are some broader considerations for the application:

1. The account balance is still stored directly in the `Account` model, which could lead to similar issues in other parts of the application
2. A more comprehensive solution might be to calculate account balances dynamically based on transactions throughout the application, rather than storing them in the `Account` model
3. If the account balance must be stored in the `Account` model for performance reasons, there should be safeguards to ensure it stays in sync with the transactions
