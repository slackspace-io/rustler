import { useState, useEffect } from 'react';
import { accountsApi } from '../../services/api';
import type { Account } from '../../services/api';

interface AccountSidebarProps {
  selectedAccountId: string | null;
  onSelectAccount: (accountId: string) => void;
}

const AccountSidebar = ({ selectedAccountId, onSelectAccount }: AccountSidebarProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const data = await accountsApi.getAccounts();
        setAccounts(data);

        // If no account is selected and we have accounts, select the first one
        if (!selectedAccountId && data.length > 0) {
          onSelectAccount(data[0].id);
        }

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch accounts. Please try again later.');
        setLoading(false);
        console.error('Error fetching accounts:', err);
      }
    };

    fetchAccounts();
  }, [selectedAccountId, onSelectAccount]);

  if (loading) {
    return <div className="account-sidebar-loading">Loading accounts...</div>;
  }

  if (error) {
    return <div className="account-sidebar-error">{error}</div>;
  }

  if (accounts.length === 0) {
    return (
      <div className="account-sidebar-empty">
        <p>No accounts found.</p>
        <a href="/accounts/new" className="button">Create Account</a>
      </div>
    );
  }

  return (
    <div className="account-sidebar">
      <h2>Accounts</h2>
      <ul className="account-list">
        {accounts.map(account => (
          <li
            key={account.id}
            className={`account-item ${selectedAccountId === account.id ? 'selected' : ''}`}
            onClick={() => onSelectAccount(account.id)}
          >
            <div className="account-name">{account.name}</div>
            <div className={`account-balance ${account.balance >= 0 ? 'positive' : 'negative'}`}>
              {account.balance.toFixed(2)}
            </div>
          </li>
        ))}
      </ul>
      <div className="account-sidebar-actions">
        <a href="/accounts/new" className="button">Add Account</a>
      </div>
    </div>
  );
};

export default AccountSidebar;
