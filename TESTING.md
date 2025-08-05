# Testing the Rustler Instance Sync Script

This document describes how to test the `sync_instances.sh` script to ensure it correctly synchronizes data between Rustler instances.

## Test Environment Setup

To properly test the sync script, you'll need:

1. A source Rustler instance with data (your production or development environment)
2. A target Rustler instance (your test environment)
3. Network connectivity between the machine running the script and both database servers
4. PostgreSQL client tools installed on the machine running the script

## Test Cases

### Test Case 1: Basic Sync

**Objective**: Verify that the script can sync all data from source to target.

**Steps**:
1. Ensure the source instance has some data (accounts, transactions, categories, budgets)
2. Run the script with minimal parameters:
   ```bash
   ./sync_instances.sh --target-host <target-host>
   ```
3. Verify that all data from the source instance is now in the target instance:
   - Check account counts and details
   - Check transaction counts and details
   - Check category counts and details
   - Check budget counts and details

**Expected Result**: The target instance should have identical data to the source instance.

### Test Case 2: Custom Database Names and Credentials

**Objective**: Verify that the script works with custom database names and credentials.

**Steps**:
1. Run the script with custom database parameters:
   ```bash
   ./sync_instances.sh --target-host <target-host> --target-db rustler_test --target-user test_user --target-password test_password
   ```
2. Verify that all data is synced correctly to the target instance

**Expected Result**: The target instance should have identical data to the source instance, despite having different database name and credentials.

### Test Case 3: Custom Dump File Location

**Objective**: Verify that the script can use a custom dump file location.

**Steps**:
1. Run the script with a custom dump file location:
   ```bash
   ./sync_instances.sh --target-host <target-host> --dump-file /tmp/rustler_backup.sql
   ```
2. Verify that the dump file is created at the specified location
3. Verify that all data is synced correctly to the target instance

**Expected Result**: The dump file should be created at the specified location, and the target instance should have identical data to the source instance.

### Test Case 4: Error Handling

**Objective**: Verify that the script handles errors gracefully.

**Steps**:
1. Run the script with an invalid target host:
   ```bash
   ./sync_instances.sh --target-host invalid-host
   ```
2. Run the script with invalid credentials:
   ```bash
   ./sync_instances.sh --target-host <target-host> --target-user invalid-user
   ```

**Expected Result**: The script should display appropriate error messages and exit with a non-zero status code.

## Verification Methods

To verify that the data has been synced correctly, you can:

1. **Use the Rustler UI**: Log in to both instances and compare the data visually
2. **Use SQL queries**: Run SQL queries against both databases to compare record counts and data
3. **Use the Rustler API**: Use the API to retrieve data from both instances and compare

### Example SQL Queries for Verification

```sql
-- Count accounts
SELECT COUNT(*) FROM accounts;

-- Count transactions
SELECT COUNT(*) FROM transactions;

-- Count categories
SELECT COUNT(*) FROM categories;

-- Count budgets
SELECT COUNT(*) FROM budgets;

-- Check account balances
SELECT id, name, balance FROM accounts ORDER BY name;

-- Check recent transactions
SELECT id, source_account_id, destination_account_id, amount, category, transaction_date 
FROM transactions 
ORDER BY transaction_date DESC 
LIMIT 10;
```

## Troubleshooting

If the tests fail, check:

1. **Database connectivity**: Ensure the machine running the script can connect to both database servers
2. **Database permissions**: Ensure the database users have appropriate permissions
3. **Script permissions**: Ensure the script is executable
4. **PostgreSQL client tools**: Ensure pg_dump and psql are installed and in the PATH
5. **Log files**: Check PostgreSQL log files for errors

## Continuous Integration

For automated testing, you could:

1. Set up a CI pipeline that creates temporary databases
2. Populate the source database with test data
3. Run the sync script to copy data to the target database
4. Run verification queries to ensure data was copied correctly
5. Clean up temporary databases

This would ensure the script continues to work as the application evolves.
