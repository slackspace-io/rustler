import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { accountsApi } from '../../services/api';
import type { Account } from '../../services/api';

const AccountsList = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const data = await accountsApi.getAccounts();
        setAccounts(data);

        // Calculate total balance
        const total = data.reduce((sum, account) => sum + account.balance, 0);
        setTotalBalance(total);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch accounts. Please try again later.');
        setLoading(false);
        console.error('Error fetching accounts:', err);
      }
    };

    fetchAccounts();
  }, []);

  const handleDeleteAccount = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await accountsApi.deleteAccount(id);
        setAccounts(accounts.filter(account => account.id !== id));

        // Recalculate total balance
        const total = accounts
          .filter(account => account.id !== id)
          .reduce((sum, account) => sum + account.balance, 0);
        setTotalBalance(total);
      } catch (err) {
        setError('Failed to delete account. Please try again later.');
        console.error('Error deleting account:', err);
      }
    }
  };

  if (loading) {
    return <div>Loading accounts...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="accounts-list">
      <div className="header-actions">
        <h1>Accounts</h1>
        <Link to="/accounts/new" className="button">Add New Account</Link>
      </div>

      <div className="summary-box">
        <h2>Total Balance</h2>
        <p className="total-balance">{totalBalance.toFixed(2)}</p>
      </div>

      {accounts.length === 0 ? (
        <p>No accounts found. Create your first account to get started.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(account => (
              <tr key={account.id}>
                <td>
                  <Link to={`/accounts/${account.id}`}>{account.name}</Link>
                </td>
                <td>{account.account_type}</td>
                <td className={account.balance >= 0 ? 'positive' : 'negative'}>
                  {account.balance.toFixed(2)}
                </td>
                <td>
                  <div className="actions">
                    <Link to={`/accounts/${account.id}`} className="button small">View</Link>
                    <Link to={`/accounts/${account.id}/edit`} className="button small">Edit</Link>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="button small danger"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AccountsList;
