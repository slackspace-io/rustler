# Account Subtype Display Fix

This document summarizes the changes made to fix the issue where accounts with subtypes were not appearing on the dashboard or in reports.

## Issue Description

When an account was assigned a subtype (e.g., "On Budget - Checking" instead of just "On Budget"), it would no longer appear on the dashboard or in reports. This was because the code was using exact string matching to filter accounts by type, which excluded accounts with subtypes.

## Changes Made

### 1. Dashboard Component

In `frontend/src/components/Dashboard.tsx`, updated the account filtering to use `startsWith` instead of exact matching:

Before:
```typescript
const onBudgetAccounts = accounts.filter(account =>
  account.account_type.toLowerCase() === ACCOUNT_TYPE.ON_BUDGET.toLowerCase());
const offBudgetAccounts = accounts.filter(account =>
  account.account_type.toLowerCase() === ACCOUNT_TYPE.OFF_BUDGET.toLowerCase());
```

After:
```typescript
const onBudgetAccounts = accounts.filter(account =>
  account.account_type.toLowerCase().startsWith(ACCOUNT_TYPE.ON_BUDGET.toLowerCase()));
const offBudgetAccounts = accounts.filter(account =>
  account.account_type.toLowerCase().startsWith(ACCOUNT_TYPE.OFF_BUDGET.toLowerCase()));
```

### 2. Balance Over Time Report Component

In `frontend/src/components/reports/BalanceOverTime.tsx`, updated three instances of account filtering to use `startsWith` instead of exact matching:

1. In the `handleAccountTypeFilterChange` function:

Before:
```typescript
if (filterType === 'on-budget') return account.account_type === ACCOUNT_TYPE.ON_BUDGET;
if (filterType === 'off-budget') return account.account_type === ACCOUNT_TYPE.OFF_BUDGET;
```

After:
```typescript
if (filterType === 'on-budget') return account.account_type.startsWith(ACCOUNT_TYPE.ON_BUDGET);
if (filterType === 'off-budget') return account.account_type.startsWith(ACCOUNT_TYPE.OFF_BUDGET);
```

2. In the `fetchAccounts` function:

Before:
```typescript
const filteredAccountsData = accountsData.filter(
  account => account.account_type === ACCOUNT_TYPE.ON_BUDGET ||
            account.account_type === ACCOUNT_TYPE.OFF_BUDGET
);
```

After:
```typescript
const filteredAccountsData = accountsData.filter(
  account => account.account_type.startsWith(ACCOUNT_TYPE.ON_BUDGET) ||
            account.account_type.startsWith(ACCOUNT_TYPE.OFF_BUDGET)
);
```

3. In the `filteredAccounts` variable:

Before:
```typescript
const filteredAccounts = accounts.filter(account => {
  if (accountTypeFilter === 'on-budget') return account.account_type === ACCOUNT_TYPE.ON_BUDGET;
  if (accountTypeFilter === 'off-budget') return account.account_type === ACCOUNT_TYPE.OFF_BUDGET;
  return false;
});
```

After:
```typescript
const filteredAccounts = accounts.filter(account => {
  if (accountTypeFilter === 'on-budget') return account.account_type.startsWith(ACCOUNT_TYPE.ON_BUDGET);
  if (accountTypeFilter === 'off-budget') return account.account_type.startsWith(ACCOUNT_TYPE.OFF_BUDGET);
  return false;
});
```

### 3. Account Sidebar Component

In `frontend/src/components/accounts/AccountSidebar.tsx`, updated two instances of account filtering to use `startsWith` instead of exact matching:

1. In the `fetchAccounts` function:

Before:
```typescript
const filteredAccounts = data.filter(account =>
  account.account_type === ACCOUNT_TYPE.ON_BUDGET ||
  account.account_type === ACCOUNT_TYPE.OFF_BUDGET
);
```

After:
```typescript
const filteredAccounts = data.filter(account =>
  account.account_type.startsWith(ACCOUNT_TYPE.ON_BUDGET) ||
  account.account_type.startsWith(ACCOUNT_TYPE.OFF_BUDGET)
);
```

2. In the account grouping:

Before:
```typescript
const onBudgetAccounts = accounts.filter(account => account.account_type === ACCOUNT_TYPE.ON_BUDGET);
const offBudgetAccounts = accounts.filter(account => account.account_type === ACCOUNT_TYPE.OFF_BUDGET);
```

After:
```typescript
const onBudgetAccounts = accounts.filter(account => account.account_type.startsWith(ACCOUNT_TYPE.ON_BUDGET));
const offBudgetAccounts = accounts.filter(account => account.account_type.startsWith(ACCOUNT_TYPE.OFF_BUDGET));
```

## Testing the Fix

To test the fix, run the provided test script:

```bash
./test_subtype_display_issue.sh
```

This script will:
1. Create a regular On Budget account (no subtype)
2. Create an On Budget account with a subtype (Checking)
3. Create a regular Off Budget account (no subtype)
4. Create an Off Budget account with a subtype (Asset)

After running the script:
1. Open the application in your browser
2. Go to the Dashboard - you should now see all four accounts, including those with subtypes
3. Go to Reports > Balance Over Time - you should now see all four accounts, including those with subtypes

## Verification

The fix ensures that:
1. Accounts with subtypes now appear on the dashboard
2. Accounts with subtypes now appear in reports
3. Accounts with subtypes now appear in the account sidebar
4. Existing functionality for accounts without subtypes is preserved
5. The fix is consistent across all components that filter accounts by type

This change maintains backward compatibility with existing accounts while properly supporting the new account subtype feature.
