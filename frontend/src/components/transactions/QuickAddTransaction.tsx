import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionsApi, accountsApi } from '../../services/api';
import type { Account } from '../../services/api';
import { useSettings } from '../../contexts/useSettings';

const QuickAddTransaction = () => {
  const navigate = useNavigate();
  const { formatNumber } = useSettings();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state - simplified for quick add
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const accountsData = await accountsApi.getAccounts();
        setAccounts(accountsData);

        // If there are accounts, preselect the first one
        if (accountsData.length > 0) {
          setSourceAccountId(accountsData[0].id);
        }

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch accounts. Please try again later.');
        setLoading(false);
        console.error('Error fetching accounts:', err);
      }
    };

    fetchAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceAccountId) {
      setError('Account is required');
      return;
    }

    if (!description) {
      setError('Description is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Create the transaction
      await transactionsApi.createTransaction({
        source_account_id: sourceAccountId,
        description,
        amount: parseFloat(amount),
        category: 'Uncategorized', // Default category for quick add
        transaction_date: new Date(transactionDate).toISOString(),
      });

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
    return <div className="quick-add-loading">Loading accounts...</div>;
  }

  if (accounts.length === 0) {
    return (
      <div className="quick-add-no-accounts">
        <p>You need to create an account before adding transactions.</p>
        <button onClick={() => navigate('/accounts/new')} className="button">
          Create Account
        </button>
      </div>
    );
  }

  return (
    <div className="quick-add-transaction">
      <h1>Quick Add Transaction</h1>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit} className="quick-add-form">
        <div className="form-group">
          <label htmlFor="source-account">Account</label>
          <select
            id="source-account"
            value={sourceAccountId}
            onChange={(e) => setSourceAccountId(e.target.value)}
            required
            className="mobile-select"
          >
            <option value="">Select Account</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({formatNumber(account.balance)})
              </option>
            ))}
          </select>
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
            className="mobile-input"
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
            className="mobile-input"
            inputMode="decimal"
          />
          <small>
            Use negative values for income, positive for expenses
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="transaction-date">Date</label>
          <input
            type="date"
            id="transaction-date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            required
            className="mobile-input"
          />
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={saving}
            className="mobile-button"
          >
            {saving ? 'Creating...' : 'Add Transaction'}
          </button>
          <button
            type="button"
            className="secondary mobile-button"
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

export default QuickAddTransaction;
