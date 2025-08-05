# Balance Over Time Graph Fix

## Issue Description
The balance over time graphs were showing incorrect balances that did not match the actual balances of the accounts. This was causing confusion for users who were trying to track their account balances over time.

## Root Cause
After investigating the code in `frontend/src/components/reports/BalanceOverTime.tsx`, several issues were identified:

1. **Incomplete Transaction Processing**: The code only considered transactions where the account was the source (money going out) but didn't properly handle transactions where the account was the destination (money coming in).

2. **Incorrect Initial Balance Calculation**: When calculating the initial balance for the chart, the code only adjusted for outgoing transactions before and after the date range, but not for incoming transactions.

3. **Double-Counting of Modified Initial Balance Transactions**: When an account's initial balance transaction had its date modified after creation, the graph was using the original balance value for the past, then adding it again on the modified date, resulting in incorrect balance calculations.

## Changes Made

### 1. Fixed Transaction Processing in Chart Data Generation

Updated the code to handle both source and destination accounts in transactions:

```typescript
// Before:
for (const transaction of periodTransactions) {
  if (selectedAccounts.includes(transaction.source_account_id)) {
    accountBalances[transaction.source_account_id] -= transaction.amount;
  }
}

// After:
for (const transaction of periodTransactions) {
  // Handle source account (money going out)
  if (selectedAccounts.includes(transaction.source_account_id)) {
    accountBalances[transaction.source_account_id] -= transaction.amount;
  }
  
  // Handle destination account (money coming in)
  if (transaction.destination_account_id && 
      selectedAccounts.includes(transaction.destination_account_id)) {
    accountBalances[transaction.destination_account_id] += transaction.amount;
  }
}
```

### 2. Fixed Initial Balance Calculation

Updated the initial balance calculation to consider both outgoing and incoming transactions:

```typescript
// Before:
// Find all transactions for this account after the end date
const laterTransactions = allTransactions.filter(t =>
  t.source_account_id === accountId &&
  new Date(t.transaction_date).getTime() > endDateTime
);

// Subtract these transactions from the current balance
for (const transaction of laterTransactions) {
  balance -= transaction.amount;
}

// Find all transactions for this account before the start date
const earlierTransactions = allTransactions.filter(t =>
  t.source_account_id === accountId &&
  new Date(t.transaction_date).getTime() < startDateTime
);

// Add these transactions to the balance (since we're going backwards)
for (const transaction of earlierTransactions) {
  balance += transaction.amount;
}

// After:
// Find all transactions for this account after the end date
const laterOutgoingTransactions = allTransactions.filter(t =>
  t.source_account_id === accountId &&
  new Date(t.transaction_date).getTime() > endDateTime
);

const laterIncomingTransactions = allTransactions.filter(t =>
  t.destination_account_id === accountId &&
  new Date(t.transaction_date).getTime() > endDateTime
);

// Adjust balance for later transactions
for (const transaction of laterOutgoingTransactions) {
  balance -= transaction.amount; // Subtract outgoing transactions
}

for (const transaction of laterIncomingTransactions) {
  balance += transaction.amount; // Add incoming transactions
}

// Find all transactions for this account before the start date
const earlierOutgoingTransactions = allTransactions.filter(t =>
  t.source_account_id === accountId &&
  new Date(t.transaction_date).getTime() < startDateTime
);

const earlierIncomingTransactions = allTransactions.filter(t =>
  t.destination_account_id === accountId &&
  new Date(t.transaction_date).getTime() < startDateTime
);

// Adjust balance for earlier transactions (since we're going backwards)
for (const transaction of earlierOutgoingTransactions) {
  balance += transaction.amount; // Add back outgoing transactions
}

for (const transaction of earlierIncomingTransactions) {
  balance -= transaction.amount; // Subtract incoming transactions
}
```

### 3. Fixed Initial Balance Date Modification Issue

Enhanced the handling of initial balance transactions to prevent double-counting when their dates have been modified:

```typescript
// Key enhancements to prevent double-counting of initial balance transactions:

// 1. Track if we've already processed an initial balance transaction for this account
let initialBalanceProcessed = false;

// 2. Sort initial balance transactions by date (oldest first)
const sortedInitialBalances = [...initialBalanceTransactions].sort((a, b) => 
  new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
);

// 3. Enhanced check for transactions already counted in regular processing
const alreadyCounted = earlierOutgoingTransactions.includes(t) ||
                       earlierIncomingTransactions.includes(t) ||
                       laterOutgoingTransactions.includes(t) ||
                       laterIncomingTransactions.includes(t);

// 4. Skip additional initial balance transactions after the first one
if (initialBalanceProcessed) {
  console.log(`    WARNING: Multiple initial balance transactions found for this account.`);
  console.log(`    This might be due to a date change on the initial balance.`);
  console.log(`    Skipping this transaction to prevent double-counting.`);
  return;
}

// 5. Mark as processed after handling an initial balance transaction
initialBalanceProcessed = true;
```

The key improvements in this fix are:

1. **Tracking Processed Initial Balances**: Using a flag to track if an initial balance transaction has already been processed for an account, preventing double-counting.

2. **Date-Based Sorting**: Sorting initial balance transactions by date to ensure we process the original one first.

3. **Enhanced Already-Counted Check**: Checking if transactions have already been counted in both earlier and later transaction processing.

4. **Explicit Skipping**: Adding explicit warnings and skipping logic for multiple initial balance transactions for the same account.

5. **Consistent Processing Flag**: Marking transactions as processed to ensure only one initial balance transaction is considered per account.

## Testing

### General Balance Graph Testing

A test script `test_balance_graph.sh` was created to help verify that the balance graph is now displaying the correct balances. The script:

1. Gets all accounts and their balances
2. Gets the ID of the first account
3. Retrieves all transactions for that account
4. Provides instructions for manually verifying that the balance graph now shows the correct balance

To run the test:
```bash
./test_balance_graph.sh
```

### Specific Testing for Amex Premium Account

An additional test script `test_amex_premium_graph.sh` was created to specifically test the Amex Premium account, which had issues with modified initial balance dates. This script:

1. Gets all accounts and finds the Amex Premium account
2. Extracts the Amex Premium account ID
3. Gets the current balance of the Amex Premium account
4. Gets all transactions for the Amex Premium account
5. Provides instructions for checking the diagnostic logs in the browser developer console

To run this specific test:
```bash
./test_amex_premium_graph.sh
```

The diagnostic logs in the browser console show detailed information about how initial balance transactions are being processed, including:
- Which initial balance transactions were found
- Whether they're within the date range or before the start date
- Whether they've already been counted in regular transaction processing
- Whether multiple initial balance transactions were detected and skipped
- The final calculated balance for the period start

## Result

After these changes, the balance over time graphs now correctly display the account balances, matching the actual balances in the accounts. This provides users with accurate information about how their account balances have changed over time.
