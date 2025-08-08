import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { transactionsApi, accountsApi } from '../../services/api';
import type { Transaction, Account } from '../../services/api';

const TransactionsList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter states
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    searchParams.get('account_id')
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category')
  );
  const [startDate, setStartDate] = useState<string | null>(
    searchParams.get('start_date')
  );
  const [endDate, setEndDate] = useState<string | null>(
    searchParams.get('end_date')
  );
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(
    searchParams.get('budget_id')
  );
  const [unbudgetedOnly, setUnbudgetedOnly] = useState<boolean>(
    (() => {
      const val = searchParams.get('unbudgeted');
      return val === '1' || val === 'true';
    })()
  );

  // Derived state for categories
  const [categories, setCategories] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch accounts first
        const accountsData = await accountsApi.getAccounts();
        setAccounts(accountsData);

        // Fetch transactions
        let transactionsData: Transaction[];

        if (selectedAccountId) {
          transactionsData = await transactionsApi.getAccountTransactions(selectedAccountId);
        } else {
          transactionsData = await transactionsApi.getTransactions();
        }

        // Apply additional filters on the client side
        // In a real app, these filters would be applied on the server
        let filteredTransactions = transactionsData;

        if (selectedCategory) {
          filteredTransactions = filteredTransactions.filter(
            t => t.category === selectedCategory
          );
        }

        if (startDate) {
          const startDateTime = new Date(startDate).getTime();
          filteredTransactions = filteredTransactions.filter(
            t => new Date(t.transaction_date).getTime() >= startDateTime
          );
        }

        if (endDate) {
          const endDateTime = new Date(endDate).getTime();
          filteredTransactions = filteredTransactions.filter(
            t => new Date(t.transaction_date).getTime() <= endDateTime
          );
        }

        // If unbudgetedOnly is set, filter transactions that do not have a budget_id
        if (unbudgetedOnly) {
          filteredTransactions = filteredTransactions.filter(t => !t.budget_id);
        }

        // If selectedBudgetId is set, filter transactions for that budget only
        if (selectedBudgetId) {
          filteredTransactions = filteredTransactions.filter(t => t.budget_id === selectedBudgetId);
        }

        setTransactions(filteredTransactions);

        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(filteredTransactions.map(t => t.category))
        ).sort();
        setCategories(uniqueCategories);

        // Calculate total amount
        const total = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
        setTotalAmount(total);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        setLoading(false);
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [selectedAccountId, selectedCategory, startDate, endDate, unbudgetedOnly, selectedBudgetId]);

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await transactionsApi.deleteTransaction(id);
        setTransactions(transactions.filter(transaction => transaction.id !== id));

        // Recalculate total amount
        const total = transactions
          .filter(transaction => transaction.id !== id)
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        setTotalAmount(total);
      } catch (err) {
        setError('Failed to delete transaction. Please try again later.');
        console.error('Error deleting transaction:', err);
      }
    }
  };

  const handleFilterChange = () => {
    const params: Record<string, string> = {};

    if (selectedAccountId) params.account_id = selectedAccountId;
    if (selectedCategory) params.category = selectedCategory;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (unbudgetedOnly) params.unbudgeted = '1';
    if (selectedBudgetId) params.budget_id = selectedBudgetId;

    setSearchParams(params);
  };

  const clearFilters = () => {
    setSelectedAccountId(null);
    setSelectedCategory(null);
    setStartDate(null);
    setEndDate(null);
    setUnbudgetedOnly(false);
    setSelectedBudgetId(null);
    setSearchParams({});
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : 'Unknown Account';
  };

  if (loading) {
    return <div>Loading transactions...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="transactions-list">
      <div className="header-actions">
        <h1>Transactions</h1>
        <div className="button-group">
          <Link to="/transactions/new" className="button">Add New Transaction</Link>
          <Link to="/transactions/quick-add" className="button">Quick Add</Link>
        </div>
      </div>

      <div className="filters">
        <h2>Filters</h2>
        <div className="filter-form">
          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="account">Account:</label>
              <select
                id="account"
                value={selectedAccountId || ''}
                onChange={e => setSelectedAccountId(e.target.value || null)}
              >
                <option value="">All Accounts</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="category">Category:</label>
              <select
                id="category"
                value={selectedCategory || ''}
                onChange={e => setSelectedCategory(e.target.value || null)}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="start-date">Start Date:</label>
              <input
                type="date"
                id="start-date"
                value={startDate || ''}
                onChange={e => setStartDate(e.target.value || null)}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="end-date">End Date:</label>
              <input
                type="date"
                id="end-date"
                value={endDate || ''}
                onChange={e => setEndDate(e.target.value || null)}
              />
            </div>

            <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="unbudgeted-only"
                checked={unbudgetedOnly}
                onChange={e => setUnbudgetedOnly(e.target.checked)}
              />
              <label htmlFor="unbudgeted-only">Unbudgeted only</label>
            </div>
          </div>

          <div className="filter-actions">
            <button onClick={handleFilterChange} className="button">Apply Filters</button>
            <button onClick={clearFilters} className="button secondary">Clear Filters</button>
          </div>
        </div>
      </div>

      <div className="summary-box">
        <h2>Total Amount</h2>
        <p className={`total-amount ${totalAmount >= 0 ? 'positive' : 'negative'}`}>
          {totalAmount.toFixed(2)}
        </p>
      </div>

      {transactions.length === 0 ? (
        <p>No transactions found. Create your first transaction to get started.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Account</th>
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
                <td>{getAccountName(transaction.source_account_id)}</td>
                <td>{transaction.description}</td>
                <td>{transaction.category}</td>
                <td className={transaction.amount >= 0 ? 'positive' : 'negative'}>
                  {transaction.amount.toFixed(2)}
                </td>
                <td>
                  <div className="actions">
                    <Link to={`/transactions/${transaction.id}/edit`} className="button small">Edit</Link>
                    <button
                      onClick={() => handleDeleteTransaction(transaction.id)}
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

export default TransactionsList;
