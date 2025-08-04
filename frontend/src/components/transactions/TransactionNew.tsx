import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { transactionsApi, accountsApi, budgetsApi } from '../../services/api';
import type { Account, Budget } from '../../services/api';

const TransactionNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedAccountId = searchParams.get('source_account_id');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [sourceAccountId, setSourceAccountId] = useState(preselectedAccountId || '');
  const [sourceAccountName, setSourceAccountName] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [isTransfer, setIsTransfer] = useState(false);
  const [payeeName, setPayeeName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [category, setCategory] = useState('Uncategorized');
  const [budgetId, setBudgetId] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Common categories
  const categories = [
    'Uncategorized',
    'Income',
    'Salary',
    'Food',
    'Groceries',
    'Dining',
    'Housing',
    'Rent',
    'Mortgage',
    'Utilities',
    'Transportation',
    'Entertainment',
    'Shopping',
    'Health',
    'Insurance',
    'Education',
    'Travel',
    'Gifts',
    'Savings',
    'Investment',
    'Transfer',
    'Other'
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch accounts
        const accountsData = await accountsApi.getAccounts();
        setAccounts(accountsData);

        // If there's a preselected account ID, set the account name too
        if (preselectedAccountId) {
          const selectedAccount = accountsData.find(account => account.id === preselectedAccountId);
          if (selectedAccount) {
            setSourceAccountName(`${selectedAccount.name} (${selectedAccount.balance.toFixed(2)} ${selectedAccount.currency})`);
          }
        }

        // Fetch budgets
        const budgetsData = await budgetsApi.getActiveBudgets();
        setBudgets(budgetsData);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        setLoading(false);
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [preselectedAccountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceAccountName) {
      setError('From Account is required');
      return;
    }

    if (isTransfer && !destinationAccountId) {
      setError('Destination account is required for transfers');
      return;
    }

    if (!description) {
      setError('Description is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // For transfers, we need to adjust the amount and payee
      const finalAmount = isTransfer
        ? Math.abs(parseFloat(amount)) * -1 // Outgoing from source account
        : parseFloat(amount);

      const finalPayeeName = isTransfer
        ? accounts.find(a => a.id === destinationAccountId)?.name || 'Transfer'
        : payeeName;

      // Extract the clean account name (without balance and currency)
      let cleanSourceAccountName = sourceAccountName;
      const parenIndex = sourceAccountName.indexOf(' (');
      if (parenIndex > 0) {
        cleanSourceAccountName = sourceAccountName.substring(0, parenIndex);
      }

      // If we have a valid sourceAccountId (matched with an existing account), use it
      // Otherwise, we'll need to create a transaction with just the account name
      if (sourceAccountId) {
        await transactionsApi.createTransaction({
          source_account_id: sourceAccountId,
          destination_account_id: isTransfer ? destinationAccountId : undefined,
          payee_name: finalPayeeName || undefined,
          description,
          amount: finalAmount,
          category: isTransfer ? 'Transfer' : category,
          budget_id: !isTransfer && budgetId ? budgetId : undefined,
          transaction_date: new Date(transactionDate).toISOString(),
        });
      } else {
        // For free text account names, we'll use the account name as a reference
        // The backend will need to handle this case appropriately
        await transactionsApi.createTransaction({
          source_account_id: accounts[0]?.id, // Use the first account as a fallback
          destination_account_id: isTransfer ? destinationAccountId : undefined,
          payee_name: finalPayeeName || undefined,
          description: `${description} (From: ${cleanSourceAccountName})`,
          amount: finalAmount,
          category: isTransfer ? 'Transfer' : category,
          budget_id: !isTransfer && budgetId ? budgetId : undefined,
          transaction_date: new Date(transactionDate).toISOString(),
        });
      }

      // If it's a transfer, create the corresponding incoming transaction
      if (isTransfer && destinationAccountId) {
        // For the transfer's corresponding incoming transaction, use the clean source account name
        const sourceAccountDisplayName = sourceAccountId
          ? accounts.find(a => a.id === sourceAccountId)?.name || 'Transfer'
          : cleanSourceAccountName;

        await transactionsApi.createTransaction({
          source_account_id: destinationAccountId,
          destination_account_id: sourceAccountId || undefined,
          payee_name: sourceAccountDisplayName,
          description: `Transfer from ${sourceAccountDisplayName}`,
          amount: Math.abs(parseFloat(amount)), // Incoming to destination account
          category: 'Transfer',
          transaction_date: new Date(transactionDate).toISOString(),
        });
      }

      // Redirect to transactions list on success
      navigate('/transactions');
    } catch (err) {
      setError('Failed to create transaction. Please try again.');
      console.error('Error creating transaction:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading accounts...</div>;
  }

  if (accounts.length === 0) {
    return (
      <div>
        <p>You need to create an account before adding transactions.</p>
        <button onClick={() => navigate('/accounts/new')} className="button">
          Create Account
        </button>
      </div>
    );
  }

  return (
    <div className="transaction-new">
      <h1>Create New Transaction</h1>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={isTransfer}
              onChange={(e) => setIsTransfer(e.target.checked)}
            />
            This is a transfer between accounts
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="source-account">From Account</label>
          <input
            type="text"
            id="source-account"
            value={sourceAccountName}
            onChange={(e) => {
              const inputValue = e.target.value;
              setSourceAccountName(inputValue);

              // Check if the input matches an existing account
              const matchedAccount = accounts.find(
                account => account.name === inputValue ||
                           `${account.name} (${account.balance.toFixed(2)} ${account.currency})` === inputValue
              );

              // If matched, set the account ID, otherwise clear it
              setSourceAccountId(matchedAccount ? matchedAccount.id : '');
            }}
            list="source-accounts-list"
            required
          />
          <datalist id="source-accounts-list">
            {accounts.map(account => (
              <option key={account.id} value={`${account.name} (${account.balance.toFixed(2)} ${account.currency})`} />
            ))}
          </datalist>
        </div>

        {isTransfer ? (
          <div className="form-group">
            <label htmlFor="destination-account">To Account</label>
            <select
              id="destination-account"
              value={destinationAccountId}
              onChange={(e) => setDestinationAccountId(e.target.value)}
              required
            >
              <option value="">Select Account</option>
              {accounts
                .filter(account => account.id !== sourceAccountId)
                .map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.balance.toFixed(2)} {account.currency})
                  </option>
                ))
              }
            </select>
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="payee">Payee (Optional)</label>
            <input
              type="text"
              id="payee"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder="Who was this payment to/from?"
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="What was this transaction for?"
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            required
            placeholder="Use negative values for expenses"
          />
          <small>
            Use positive values for income, negative for expenses
          </small>
        </div>

        {!isTransfer && (
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        {!isTransfer && (
          <div className="form-group">
            <label htmlFor="budget">Budget (Optional)</label>
            <select
              id="budget"
              value={budgetId}
              onChange={(e) => setBudgetId(e.target.value)}
            >
              <option value="">No Budget</option>
              {budgets.map(budget => (
                <option key={budget.id} value={budget.id}>
                  {budget.name} (${budget.amount.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="transaction-date">Date</label>
          <input
            type="date"
            id="transaction-date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Transaction'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => navigate('/transactions')}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionNew;
