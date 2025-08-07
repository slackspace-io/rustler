import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { accountsApi } from '../../services/api';
import type { Account } from '../../services/api';
import { ACCOUNT_TYPE } from '../../constants/accountTypes';
import { useSettings } from '../../contexts/useSettings';
import './sorting.css';

// Sorting options for accounts
type SortField = 'name' | 'balance' | 'account_type';
type SortOrder = 'asc' | 'desc';

const AccountsList = () => {
  const { formatNumber } = useSettings();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [onBudgetBalance, setOnBudgetBalance] = useState(0);
  const [offBudgetBalance, setOffBudgetBalance] = useState(0);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');


  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const data = await accountsApi.getAccounts();
        setAccounts(data);

        // Calculate total balance and group balances
        const total = data.reduce((sum, account) => sum + account.balance, 0);
        setTotalBalance(total);

        // Calculate on-budget balance
        const onBudgetTotal = data
          .filter(account => account.account_type === ACCOUNT_TYPE.ON_BUDGET)
          .reduce((sum, account) => sum + account.balance, 0);
        setOnBudgetBalance(onBudgetTotal);

        // Calculate off-budget balance
        const offBudgetTotal = data
          .filter(account => account.account_type === ACCOUNT_TYPE.OFF_BUDGET)
          .reduce((sum, account) => sum + account.balance, 0);
        setOffBudgetBalance(offBudgetTotal);

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
        const updatedAccounts = accounts.filter(account => account.id !== id);
        setAccounts(updatedAccounts);

        // Recalculate total balance and group balances
        const total = updatedAccounts.reduce((sum, account) => sum + account.balance, 0);
        setTotalBalance(total);

        // Recalculate on-budget balance
        const onBudgetTotal = updatedAccounts
          .filter(account => account.account_type === ACCOUNT_TYPE.ON_BUDGET)
          .reduce((sum, account) => sum + account.balance, 0);
        setOnBudgetBalance(onBudgetTotal);

        // Recalculate off-budget balance
        const offBudgetTotal = updatedAccounts
          .filter(account => account.account_type === ACCOUNT_TYPE.OFF_BUDGET)
          .reduce((sum, account) => sum + account.balance, 0);
        setOffBudgetBalance(offBudgetTotal);
      } catch (err) {
        setError('Failed to delete account. Please try again later.');
        console.error('Error deleting account:', err);
      }
    }
  };

  // Helper function to render account table
  const renderAccountTable = (accounts: Account[]) => {
    if (accounts.length === 0) {
      return <p>No accounts in this group.</p>;
    }

    return (
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Subtype</th>
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
              <td>
                {account.account_sub_type || '-'}
              </td>
              <td className={account.balance >= 0 ? 'positive' : 'negative'}>
                {formatNumber(account.balance)}
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
    );
  };

  if (loading) {
    return <div>Loading accounts...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  // Helper function for case-insensitive comparison
  const isSameAccountType = (type1: string, type2: string): boolean => {
    if (!type1 || !type2) return false;
    return type1.toLowerCase() === type2.toLowerCase();
  };

  // Sort accounts based on the selected field and order
  const sortAccounts = (accounts: Account[], field: SortField, order: SortOrder): Account[] => {
    return [...accounts].sort((a, b) => {
      let comparison = 0;

      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'balance':
          comparison = a.balance - b.balance;
          break;
        case 'account_type':
          comparison = a.account_type.localeCompare(b.account_type);
          break;
        default:
          comparison = 0;
      }

      return order === 'asc' ? comparison : -comparison;
    });
  };

  // Handle sort field change
  const handleSortFieldChange = (field: SortField) => {
    setSortField(field);
  };

  // Handle sort order change
  const handleSortOrderToggle = () => {
    setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
  };

  // Apply sorting to all accounts
  const sortedAccounts = sortAccounts(accounts, sortField, sortOrder);

  // Filter accounts by type
  const onBudgetAccounts = sortedAccounts.filter(account => {
    console.log(`Account: ${account.name}, Type: ${account.account_type}, Subtype: ${account.account_sub_type}, Is On Budget: ${isSameAccountType(account.account_type, ACCOUNT_TYPE.ON_BUDGET)}`);
    return isSameAccountType(account.account_type, ACCOUNT_TYPE.ON_BUDGET);
  });

  const offBudgetAccounts = sortedAccounts.filter(account => {
    return isSameAccountType(account.account_type, ACCOUNT_TYPE.OFF_BUDGET);
  });

  const otherAccounts = sortedAccounts.filter(account => {
    const isOther = !isSameAccountType(account.account_type, ACCOUNT_TYPE.ON_BUDGET) &&
                   !isSameAccountType(account.account_type, ACCOUNT_TYPE.OFF_BUDGET);
    console.log(`Other check - Account: ${account.name}, Type: ${account.account_type}, Subtype: ${account.account_sub_type}, Is Other: ${isOther}`);
    return isOther;
  });

  return (
    <div className="accounts-list">
      <div className="header-actions">
        <h1>Accounts</h1>
        <div className="actions-container">
          <div className="sorting-controls">
            <div className="sort-field">
              <label htmlFor="sort-field">Sort by:</label>
              <select
                id="sort-field"
                value={sortField}
                onChange={(e) => handleSortFieldChange(e.target.value as SortField)}
              >
                <option value="name">Name</option>
                <option value="balance">Balance</option>
                <option value="account_type">Account Type</option>
              </select>
            </div>
            <button
              className="sort-order-toggle"
              onClick={handleSortOrderToggle}
              title={sortOrder === 'asc' ? 'Ascending order' : 'Descending order'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          <Link to="/accounts/new" className="button">Add New Account</Link>
        </div>
      </div>

      <div className="summary-box">
        <h2>Total Balance</h2>
        <p className="total-balance">{formatNumber(totalBalance)}</p>
      </div>

      {accounts.length === 0 ? (
        <p>No accounts found. Create your first account to get started.</p>
      ) : (
        <div className="account-groups">
          {/* On Budget Accounts */}
          <div className="account-group">
            <div className="group-header">
              <h2>On Budget Accounts</h2>
              <p className="group-balance">Balance: {formatNumber(onBudgetBalance)}</p>
            </div>
            {renderAccountTable(onBudgetAccounts)}
          </div>

          {/* Off Budget Accounts */}
          <div className="account-group">
            <div className="group-header">
              <h2>Off Budget Accounts</h2>
              <p className="group-balance">Balance: {formatNumber(offBudgetBalance)}</p>
            </div>
            {renderAccountTable(offBudgetAccounts)}
          </div>

          {/* Other Accounts (if any) */}
          {otherAccounts.length > 0 && (
            <div className="account-group">
              <div className="group-header">
                <h2>Other Accounts</h2>
              </div>
              {renderAccountTable(otherAccounts)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountsList;
