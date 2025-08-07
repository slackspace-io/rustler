# Both Account Types Implementation

This document describes the implementation of the feature to allow selecting both on-budget and off-budget accounts on the report page to display in the same graph.

## Changes Made

1. Modified the `BalanceOverTime.tsx` component to:
   - Add a "Both Account Types" option to the account type filter radio buttons
   - Update the `handleAccountTypeFilterChange` function to handle the 'both' option
   - Update the `filteredAccounts` logic to show both types of accounts when "both" is selected

## Testing Instructions

### Prerequisites

- Ensure the Rustler application is running:
  ```bash
  # In one terminal, run the backend
  cargo run
  
  # In another terminal, run the frontend
  cd frontend
  npm run dev
  ```

### Running the Test Script

1. Run the test script to identify on-budget and off-budget accounts:
   ```bash
   ./test_both_account_types.sh
   ```

2. The script will:
   - Display all accounts with their types
   - Extract and display on-budget accounts
   - Extract and display off-budget accounts
   - Provide instructions for manual testing

### Manual Testing

1. Open the application in your browser and navigate to the Balance Over Time report.
2. Select the new 'Both Account Types' option in the account filter.
3. Verify that both on-budget and off-budget accounts are displayed in the account selection list.
4. Select at least one on-budget account and one off-budget account.
5. Verify that the graph displays data for both types of accounts.
6. Try switching between 'Individual Lines Per Account' and 'Single Line (Sum of All Accounts)' display modes.
7. Verify that the graph updates correctly in both modes.

## Verification

- The feature is considered implemented successfully if:
  - The "Both Account Types" option is available in the account filter
  - When selected, both on-budget and off-budget accounts are displayed in the account selection list
  - Users can select accounts of both types simultaneously
  - The graph correctly displays data for the selected accounts, regardless of their type
  - The rest of the application functionality remains intact
