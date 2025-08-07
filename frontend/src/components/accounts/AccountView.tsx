import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { accountsApi, transactionsApi } from '../../services/api';
import type { Account, Transaction } from '../../services/api';
import { useSettings } from '../../contexts/useSettings';

const AccountView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatNumber } = useSettings();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);

        // Fetch account details
        const accountData = await accountsApi.getAccount(id);
        setAccount(accountData);

        // Fetch transactions for this account with pagination
        const transactionsData = await transactionsApi.getAccountTransactions(id, currentPage, transactionsPerPage);
        setTransactions(transactionsData);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch account details. Please try again later.');
        setLoading(false);
        console.error('Error fetching account details:', err);
      }
    };

    fetchData();
  }, [id, currentPage, transactionsPerPage]);

  const handleDeleteAccount = async () => {
    if (!account || !id) return;

    if (window.confirm(`Are you sure you want to delete the account "${account.name}"?`)) {
      try {
        await accountsApi.deleteAccount(id);
        navigate('/accounts');
      } catch (err) {
        setError('Failed to delete account. Please try again later.');
        console.error('Error deleting account:', err);
      }
    }
  };

  if (loading) {
    return <div>Loading account details...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!account) {
    return <div className="error">Account not found</div>;
  }

  return (
    <div className="account-view">
      <div className="header-actions">
        <h1>{account.name}</h1>
        <div>
          <Link to={`/accounts/${id}/edit`} className="button">Edit Account</Link>
          <button onClick={handleDeleteAccount} className="button danger">Delete Account</button>
        </div>
      </div>

      <div className="account-details">
        <div className="summary-box">
          <h2>Balance</h2>
          <p className={`total-balance ${account.balance >= 0 ? 'positive' : 'negative'}`}>
            {formatNumber(account.balance)}
          </p>
        </div>

        <div className="account-info">
          <p><strong>Account Type:</strong> {account.account_type}</p>
          {account.account_sub_type && (
            <p><strong>Account Subtype:</strong> {account.account_sub_type}</p>
          )}
          <p><strong>Created:</strong> {new Date(account.created_at).toLocaleDateString()}</p>
          <p><strong>Last Updated:</strong> {new Date(account.updated_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="account-transactions">
        <div className="section-header">
          <h2>Transactions</h2>
          <div className="button-group">
            <Link
              to={`/transactions/new?source_account_id=${id}`}
              className="button"
            >
              Add Transaction
            </Link>
            <Link
              to={`/accounts/${id}/import`}
              className="button"
            >
              Import from CSV
            </Link>
          </div>
        </div>

        {transactions.length === 0 ? (
          <p>No transactions found for this account.</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(transaction => (
                  <tr key={transaction.id}>
                    <td>{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                    <td>{transaction.description}</td>
                    <td>{transaction.category}</td>
                    <td className={transaction.amount >= 0 ? 'positive' : 'negative'}>
                      {formatNumber(transaction.amount)}
                    </td>
                    <td>
                      <div className="actions">
                        <Link
                          to={`/transactions/${transaction.id}/edit`}
                          className="button small"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
                className="pagination-button"
              >
                Previous
              </button>

              <span className="pagination-info">
                Page {currentPage}
                {transactions.length === transactionsPerPage ? ' (more available)' : ''}
              </span>

              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={transactions.length < transactionsPerPage || loading}
                className="pagination-button"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AccountView;
