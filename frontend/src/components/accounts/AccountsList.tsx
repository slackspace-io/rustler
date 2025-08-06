import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { accountsApi } from '../../services/api';
import type { Account } from '../../services/api';
import { ACCOUNT_TYPE } from '../../constants/accountTypes';

const AccountsList = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [onBudgetBalance, setOnBudgetBalance] = useState(0);
  const [offBudgetBalance, setOffBudgetBalance] = useState(0);

  // Parse account type and subtype from combined string
  const parseAccountType = (fullType: string) => {
    if (!fullType) {
      console.error("Account type is undefined or empty:", fullType);
      return { mainType: "", subtype: "" };
    }

    // Trim the input string to handle any extra whitespace
    const trimmedType = fullType.trim();

    // Check if the account type contains a subtype (format: "Type - Subtype")
    // Use a regex that handles variable whitespace around the separator
    const parts = trimmedType.split(/\s*-\s*/);

    // Filter out any empty parts that might result from extra separators
    const filteredParts = parts.filter(part => part.trim() !== "");

    if (filteredParts.length > 1) {
      // If it has a subtype, return the main type and subtype separately
      // Trim each part to handle any internal whitespace
      return {
        mainType: filteredParts[0].trim(),
        subtype: filteredParts[1].trim()
      };
    } else {
      // If it doesn't have a subtype, return just the main type
      return {
        mainType: trimmedType,
        subtype: ''
      };
    }
  };

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
          .filter(account => parseAccountType(account.account_type).mainType === ACCOUNT_TYPE.ON_BUDGET)
          .reduce((sum, account) => sum + account.balance, 0);
        setOnBudgetBalance(onBudgetTotal);

        // Calculate off-budget balance
        const offBudgetTotal = data
          .filter(account => parseAccountType(account.account_type).mainType === ACCOUNT_TYPE.OFF_BUDGET)
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
          .filter(account => parseAccountType(account.account_type).mainType === ACCOUNT_TYPE.ON_BUDGET)
          .reduce((sum, account) => sum + account.balance, 0);
        setOnBudgetBalance(onBudgetTotal);

        // Recalculate off-budget balance
        const offBudgetTotal = updatedAccounts
          .filter(account => parseAccountType(account.account_type).mainType === ACCOUNT_TYPE.OFF_BUDGET)
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
              <td>{parseAccountType(account.account_type).mainType}</td>
              <td>
                {parseAccountType(account.account_type).subtype || '-'}
              </td>
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

  // Filter accounts by type
  const onBudgetAccounts = accounts.filter(account => {
    const { mainType, subtype } = parseAccountType(account.account_type);
    console.log(`Account: ${account.name}, Type: ${account.account_type}, Parsed: mainType=${mainType}, subtype=${subtype}, Is On Budget: ${isSameAccountType(mainType, ACCOUNT_TYPE.ON_BUDGET)}`);
    return isSameAccountType(mainType, ACCOUNT_TYPE.ON_BUDGET);
  });

  const offBudgetAccounts = accounts.filter(account => {
    const { mainType } = parseAccountType(account.account_type);
    return isSameAccountType(mainType, ACCOUNT_TYPE.OFF_BUDGET);
  });

  const otherAccounts = accounts.filter(account => {
    const mainType = parseAccountType(account.account_type).mainType;
    const isOther = !isSameAccountType(mainType, ACCOUNT_TYPE.ON_BUDGET) &&
                    !isSameAccountType(mainType, ACCOUNT_TYPE.OFF_BUDGET);
    console.log(`Other check - Account: ${account.name}, Type: ${account.account_type}, Parsed: mainType=${mainType}, Is Other: ${isOther}`);
    return isOther;
  });

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
        <div className="account-groups">
          {/* On Budget Accounts */}
          <div className="account-group">
            <div className="group-header">
              <h2>On Budget Accounts</h2>
              <p className="group-balance">Balance: {onBudgetBalance.toFixed(2)}</p>
            </div>
            {renderAccountTable(onBudgetAccounts)}
          </div>

          {/* Off Budget Accounts */}
          <div className="account-group">
            <div className="group-header">
              <h2>Off Budget Accounts</h2>
              <p className="group-balance">Balance: {offBudgetBalance.toFixed(2)}</p>
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
