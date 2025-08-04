import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transactionsApi, accountsApi, budgetsApi } from '../../services/api';
import type { Account, Budget } from '../../services/api';
import CategoryInput from '../common/CategoryInput';

const TransactionEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [category, setCategory] = useState('Uncategorized');
  const [budgetId, setBudgetId] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Category is now handled by the CategoryInput component

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);

        // Fetch accounts first
        const accountsData = await accountsApi.getAccounts();
        setAccounts(accountsData);

        // Fetch budgets
        const budgetsData = await budgetsApi.getActiveBudgets();
        setBudgets(budgetsData);

        // Fetch transaction details
        const transaction = await transactionsApi.getTransaction(id);

        // Initialize form with transaction data
        setSourceAccountId(transaction.source_account_id);
        setDestinationName(transaction.destination_name || '');
        setDescription(transaction.description);
        setAmount(transaction.amount.toString());
        setCategory(transaction.category);
        setBudgetId(transaction.budget_id || '');

        // Format date for the date input (YYYY-MM-DD)
        const date = new Date(transaction.transaction_date);
        setTransactionDate(date.toISOString().split('T')[0]);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch transaction details. Please try again later.');
        setLoading(false);
        console.error('Error fetching transaction details:', err);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    if (!sourceAccountId) {
      setError('Source account is required');
      return;
    }

    if (!description) {
      setError('Description is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await transactionsApi.updateTransaction(id, {
        source_account_id: sourceAccountId,
        destination_name: destinationName || undefined,
        description,
        amount: parseFloat(amount),
        category,
        budget_id: budgetId || undefined,
        transaction_date: new Date(transactionDate).toISOString(),
      });

      // Redirect to transactions list on success
      navigate('/transactions');
    } catch (err) {
      setError('Failed to update transaction. Please try again.');
      console.error('Error updating transaction:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading transaction details...</div>;
  }

  if (error && !saving) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="transaction-edit">
      <h1>Edit Transaction</h1>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="source-account">Account</label>
          <select
            id="source-account"
            value={sourceAccountId}
            onChange={(e) => setSourceAccountId(e.target.value)}
            required
          >
            <option value="">Select Account</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.balance.toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="destination">Destination (Optional)</label>
          <input
            type="text"
            id="destination"
            value={destinationName}
            onChange={(e) => setDestinationName(e.target.value)}
            placeholder="Who was this payment to/from?"
          />
        </div>

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
            placeholder="Use negative values for income"
          />
          <small>
            Use negative values for income, positive for expenses
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <CategoryInput
            value={category}
            onChange={setCategory}
            placeholder="Select or create a category"
          />
        </div>

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
                {budget.name} ({budget.amount.toFixed(2)})
              </option>
            ))}
          </select>
        </div>

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
            {saving ? 'Saving...' : 'Save Changes'}
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

export default TransactionEdit;
