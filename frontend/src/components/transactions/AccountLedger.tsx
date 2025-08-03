import { useState, useEffect } from 'react';
import { transactionsApi, accountsApi } from '../../services/api';
import type { Transaction, Account } from '../../services/api';

interface AccountLedgerProps {
  accountId: string;
}

const AccountLedger = ({ accountId }: AccountLedgerProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for new transaction
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isIncoming, setIsIncoming] = useState(false);
  const [category, setCategory] = useState('Uncategorized');
  const [payeeName, setPayeeName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      if (!accountId) return;

      try {
        setLoading(true);

        // Fetch account details
        const accountData = await accountsApi.getAccount(accountId);
        setAccount(accountData);

        // Fetch transactions for this account
        const transactionsData = await transactionsApi.getAccountTransactions(accountId);
        setTransactions(transactionsData);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        setLoading(false);
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description) {
      setFormError('Description is required');
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setFormError('Please enter a valid positive amount');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      // Calculate the final amount based on incoming/outgoing
      const finalAmount = isIncoming ? Math.abs(parseFloat(amount)) : -Math.abs(parseFloat(amount));

      // Create the transaction
      await transactionsApi.createTransaction({
        source_account_id: accountId,
        payee_name: payeeName || undefined,
        description,
        amount: finalAmount,
        category,
        transaction_date: new Date().toISOString(),
      });

      // Refresh transactions
      const updatedTransactions = await transactionsApi.getAccountTransactions(accountId);
      setTransactions(updatedTransactions);

      // Refresh account to get updated balance
      const updatedAccount = await accountsApi.getAccount(accountId);
      setAccount(updatedAccount);

      // Reset form
      setDescription('');
      setAmount('');
      setPayeeName('');
      setCategory('Uncategorized');

    } catch (err) {
      setFormError('Failed to create transaction. Please try again.');
      console.error('Error creating transaction:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await transactionsApi.deleteTransaction(id);

        // Refresh transactions
        const updatedTransactions = await transactionsApi.getAccountTransactions(accountId);
        setTransactions(updatedTransactions);

        // Refresh account to get updated balance
        const updatedAccount = await accountsApi.getAccount(accountId);
        setAccount(updatedAccount);
      } catch (err) {
        setError('Failed to delete transaction. Please try again later.');
        console.error('Error deleting transaction:', err);
      }
    }
  };

  if (loading) {
    return <div>Loading transactions...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!account) {
    return <div>Account not found</div>;
  }

  return (
    <div className="account-ledger">
      <div className="account-header">
        <h2>{account.name}</h2>
        <div className={`account-balance ${account.balance >= 0 ? 'positive' : 'negative'}`}>
          Balance: {account.balance.toFixed(2)} {account.currency}
        </div>
      </div>

      <div className="ledger-container">
        <form className="new-transaction-form" onSubmit={handleSubmit}>
          {formError && <div className="error">{formError}</div>}

          <table className="ledger-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Payee</th>
                <th>Incoming</th>
                <th>Outgoing</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* New transaction form row */}
              <tr className="new-transaction-row">
                <td>{new Date().toLocaleDateString()}</td>
                <td>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    required
                  />
                </td>
                <td>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    placeholder="Payee (optional)"
                  />
                </td>
                <td>
                  <input
                    type="radio"
                    id="incoming"
                    name="direction"
                    checked={isIncoming}
                    onChange={() => setIsIncoming(true)}
                  />
                  <input
                    type="number"
                    value={isIncoming ? amount : ''}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={!isIncoming}
                    step="0.01"
                    min="0"
                  />
                </td>
                <td>
                  <input
                    type="radio"
                    id="outgoing"
                    name="direction"
                    checked={!isIncoming}
                    onChange={() => setIsIncoming(false)}
                  />
                  <input
                    type="number"
                    value={!isIncoming ? amount : ''}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={isIncoming}
                    step="0.01"
                    min="0"
                  />
                </td>
                <td>
                  <button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Add'}
                  </button>
                </td>
              </tr>

              {/* Existing transactions */}
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-transactions">
                    No transactions found for this account.
                  </td>
                </tr>
              ) : (
                transactions.map(transaction => (
                  <tr key={transaction.id}>
                    <td>{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                    <td>{transaction.description}</td>
                    <td>{transaction.category}</td>
                    <td>{transaction.payee_name || '-'}</td>
                    <td className="amount incoming">
                      {transaction.amount > 0 ? transaction.amount.toFixed(2) : ''}
                    </td>
                    <td className="amount outgoing">
                      {transaction.amount < 0 ? Math.abs(transaction.amount).toFixed(2) : ''}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        className="button small danger"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </form>
      </div>
    </div>
  );
};

export default AccountLedger;
