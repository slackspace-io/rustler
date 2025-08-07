# Firefly III Import Deposit Fix

## Issue Description

When importing transactions from Firefly III CSV files, deposits into asset accounts were incorrectly showing as withdrawals. The issue was identified with the following sample transactions:

```
1,14372,14420,2025-07-23T18:50:05+00:00,2025-07-23T18:50:05+00:00,,Deposit,SEK,42780.00,,,EUR,,,Salary,2025-07-25T00:01:00+00:00,Lön,,"Revenue account","SEB Checking",,"Asset account",,Income,,,"Income: Salary",,,,,,,,,,,,,,,,,,,,,74af5b29eb03fc938865a343cf7a1550707be7f03cfda8d8e7b3f3dfad9e2bbd,,ff3-v6.2.21,,
1,14226,14274,2025-07-01T09:04:57+00:00,2025-07-01T09:05:12+00:00,,Deposit,SEK,25875.00,,,EUR,,,Forsakringskassan,2025-07-25T00:01:00+00:00,Forsakringskassan,,"Revenue account","SEB Checking",,"Asset account",,Income,,,"Income: Forsakringskassan",,,,,,,,,,,,,,,,,,,,,23c069b7682f4d11e03f7a6d3e897505583090437400afbb050c39ccb6cf054e,,ff3-v6.2.18,,
```

These should be deposits into the asset account, but they were showing as withdrawals during the import.

## Root Cause

The issue was in the `import_transactions` method of the `FireflyImportService` class. When determining the transaction amount based on the transaction type, deposits were being negated:

```
// Determine transaction amount based on transaction type
let amount = match firefly_transaction.transaction_type {
    FireflyTransactionType::Withdrawal => firefly_transaction.amount,
    FireflyTransactionType::Deposit => -firefly_transaction.amount, // Negative for deposits in Rustler
    FireflyTransactionType::Transfer => firefly_transaction.amount,
    _ => firefly_transaction.amount,
};
```

In Rustler's transaction system:
- Positive amounts represent withdrawals (money leaving the account)
- Negative amounts represent deposits (money entering the account)

However, in Firefly III, deposits are represented with positive amounts. The issue was that the import code was negating these amounts, which was causing deposits to be imported as withdrawals.

## Fix Implemented

The fix was to remove the negation for deposits in the import code:

```
// Determine transaction amount based on transaction type
let amount = match firefly_transaction.transaction_type {
    FireflyTransactionType::Withdrawal => firefly_transaction.amount,
    FireflyTransactionType::Deposit => firefly_transaction.amount, // Keep deposits positive to match Rustler's withdrawal convention
    FireflyTransactionType::Transfer => firefly_transaction.amount,
    _ => firefly_transaction.amount,
};
```

By keeping the amounts positive during import, deposits from Firefly III are now correctly imported as deposits in Rustler.

## Testing

The fix was tested with the following steps:

1. Created a test CSV file with the sample transactions from the issue description
2. Created a test script (`test_deposit_fix.sh`) to import the transactions and verify the results
3. Ran the test script to confirm that deposits are now correctly imported
4. Verified that the fix doesn't break other transaction types by running the existing `test_firefly_import.sh` script

The test results showed that:
- Deposits are now correctly imported with negative amounts in Rustler
- Other transaction types (withdrawals and transfers) are still imported correctly

## Conclusion

The issue was fixed by removing the negation for deposits in the import code. This ensures that deposits from Firefly III are correctly imported as deposits in Rustler, following Rustler's sign convention where negative amounts represent deposits (money entering an account).
