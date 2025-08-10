import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { transactionsApi, accountsApi, budgetsApi } from '../../services/api';
import type { Transaction, Account, Budget } from '../../services/api';

// Column configuration
const ALL_COLUMNS = [
  { id: 'date', label: 'Date' },
  { id: 'source_account', label: 'Source Account' },
  { id: 'destination_account', label: 'Destination Account' },
  { id: 'description', label: 'Description' },
  { id: 'category', label: 'Category' },
  { id: 'budget', label: 'Budget' },
  { id: 'amount', label: 'Amount' },
  { id: 'actions', label: 'Actions' },
] as const;

type ColumnId = typeof ALL_COLUMNS[number]['id'];
const STORAGE_KEY = 'rustler_transactions_visible_columns';

const TransactionsList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Column visibility state with persistence
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        // Validate and intersect with known columns
        const valid = ALL_COLUMNS.map(c => c.id).filter(id => parsed.includes(id));
        if (valid.length > 0) return valid as ColumnId[];
      }
    } catch (e) {
      console.warn('Failed to read transactions column settings:', e);
    }
    return ALL_COLUMNS.map(c => c.id) as ColumnId[];
  });
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  const persistVisibleColumns = (cols: ColumnId[]) => {
    setVisibleColumns(cols);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
    } catch (e) {
      console.warn('Failed to save transactions column settings:', e);
    }
  };

  const toggleColumn = (id: ColumnId) => {
    const isChecked = visibleColumns.includes(id);
    if (isChecked) {
      // Prevent unchecking the last column
      if (visibleColumns.length === 1) return;
      persistVisibleColumns(visibleColumns.filter(c => c !== id));
    } else {
      persistVisibleColumns([...visibleColumns, id]);
    }
  };

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
  const [incomeOnly, setIncomeOnly] = useState<boolean>(
    (() => {
      const val = searchParams.get('income');
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

        // Fetch accounts and budgets first
        const [accountsData, budgetsData] = await Promise.all([
          accountsApi.getAccounts(),
          budgetsApi.getBudgets(),
        ]);
        setAccounts(accountsData);
        setBudgets(budgetsData);

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

        // If incomeOnly is set, include only inflows (positive amounts) to on-budget destination accounts
        if (incomeOnly) {
          const onBudgetIds = new Set(accountsData.filter(a => a.account_type === 'On Budget').map(a => a.id));
          filteredTransactions = filteredTransactions.filter(
            t => t.amount > 0 && t.destination_account_id && onBudgetIds.has(t.destination_account_id)
          );
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
  }, [selectedAccountId, selectedCategory, startDate, endDate, unbudgetedOnly, selectedBudgetId, incomeOnly]);

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
    if (incomeOnly) params.income = '1';
    if (selectedBudgetId) params.budget_id = selectedBudgetId;

    setSearchParams(params);
  };

  const clearFilters = () => {
    setSelectedAccountId(null);
    setSelectedCategory(null);
    setStartDate(null);
    setEndDate(null);
    setUnbudgetedOnly(false);
    setIncomeOnly(false);
    setSelectedBudgetId(null);
    setSearchParams({});
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : 'Unknown Account';
  };

  const getBudgetName = (budgetId?: string) => {
    if (!budgetId) return 'Unbudgeted';
    const budget = budgets.find(b => b.id === budgetId);
    return budget ? budget.name : 'Unbudgeted';
  };

  if (loading) {
    return <div>Loading transactions...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="transactions-list">
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1>Transactions</h1>
        <div className="button-group" style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
          <Link to="/transactions/new" className="button">Add New Transaction</Link>
          <Link to="/transactions/quick-add" className="button">Quick Add</Link>
          <button className="button secondary" onClick={() => setShowColumnPicker(!showColumnPicker)}>Columns</button>
          {showColumnPicker && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: 'var(--color-bg-primary, #fff)', border: '1px solid #ccc', borderRadius: 6, padding: 12, boxShadow: '0 4px 10px rgba(0,0,0,0.1)', zIndex: 10, minWidth: 200 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Visible columns</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {ALL_COLUMNS.map(col => (
                  <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.id)}
                      onChange={() => toggleColumn(col.id)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="button small" onClick={() => setShowColumnPicker(false)}>Close</button>
              </div>
            </div>
          )}
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

            <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="income-only"
                checked={incomeOnly}
                onChange={e => setIncomeOnly(e.target.checked)}
              />
              <label htmlFor="income-only">Income only</label>
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
              {ALL_COLUMNS.filter(col => visibleColumns.includes(col.id)).map(col => (
                <th key={col.id}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map(transaction => (
              <tr key={transaction.id}>
                {ALL_COLUMNS.filter(col => visibleColumns.includes(col.id)).map(col => {
                  switch (col.id) {
                    case 'date':
                      return (
                        <td key={`${transaction.id}-date`}>{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                      );
                    case 'source_account':
                      return (
                        <td key={`${transaction.id}-source`}>{getAccountName(transaction.source_account_id)}</td>
                      );
                    case 'destination_account':
                      return (
                        <td key={`${transaction.id}-destination`}>{transaction.destination_account_id ? getAccountName(transaction.destination_account_id) : '-'}</td>
                      );
                    case 'description':
                      return (
                        <td key={`${transaction.id}-description`}>{transaction.description}</td>
                      );
                    case 'category':
                      return (
                        <td key={`${transaction.id}-category`}>{transaction.category}</td>
                      );
                    case 'budget':
                      return (
                        <td key={`${transaction.id}-budget`}>{getBudgetName(transaction.budget_id)}</td>
                      );
                    case 'amount':
                      return (
                        <td key={`${transaction.id}-amount`} className={transaction.amount >= 0 ? 'positive' : 'negative'}>
                          {transaction.amount.toFixed(2)}
                        </td>
                      );
                    case 'actions':
                      return (
                        <td key={`${transaction.id}-actions`}>
                          <div className="actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <Link to={`/transactions/${transaction.id}/edit`} className="button small">Edit</Link>
                            <Link to="/rules/new" state={{ seedTransaction: transaction }} className="button small">Create Rule</Link>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="button small danger"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      );
                    default:
                      return null;
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default TransactionsList;
