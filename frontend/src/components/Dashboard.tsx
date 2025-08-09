import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accountsApi, transactionsApi, budgetsApi } from '../services/api';
import type { Account, Transaction } from '../services/api';
import { ACCOUNT_TYPE } from '../constants/accountTypes';
import './MobileDashboard.css';
import { useSettings } from '../contexts/useSettings';

const Dashboard = () => {
  const { formatNumber } = useSettings();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state for Total Balance widget
  const [selectedBalanceAccountIds, setSelectedBalanceAccountIds] = useState<string[]>([]);
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  // Selected month/year for dashboard view
  const today = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1); // 1-12

  // Summary data
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyNet, setMonthlyNet] = useState(0);

  // Selector for which monthly metric to inspect
  const [selectedMetric, setSelectedMetric] = useState<'income' | 'expenses' | 'net'>('income');

  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Update isMobile state when window is resized
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Month navigation helpers and labels
  const canGoNext = useMemo(() => {
    // Disallow navigating to months after current month
    const nowYear = today.getFullYear();
    const nowMonth = today.getMonth() + 1;
    return selectedYear < nowYear || (selectedYear === nowYear && selectedMonth < nowMonth);
  }, [selectedYear, selectedMonth, today]);

  const monthLabel = useMemo(() => {
    const d = new Date(selectedYear, selectedMonth - 1, 1);
    return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  }, [selectedYear, selectedMonth]);

  const handlePrevMonth = () => {
    let y = selectedYear;
    let m = selectedMonth - 1;
    if (m < 1) {
      m = 12;
      y = y - 1;
    }
    setSelectedYear(y);
    setSelectedMonth(m);
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    let y = selectedYear;
    let m = selectedMonth + 1;
    if (m > 12) {
      m = 1;
      y = y + 1;
    }
    // Prevent going beyond current month
    const nowYear = today.getFullYear();
    const nowMonth = today.getMonth() + 1;
    if (y > nowYear || (y === nowYear && m > nowMonth)) return;
    setSelectedYear(y);
    setSelectedMonth(m);
  };

  // Initial data fetch (accounts and all transactions)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch accounts
        const accountsData = await accountsApi.getAccounts();
        setAccounts(accountsData);

        // Fetch all transactions (paginate to avoid missing items)
        const limit = 1000;
        let page = 1;
        let txns: Transaction[] = [];
        while (true) {
          const batch = await transactionsApi.getTransactions(page, limit);
          txns = txns.concat(batch);
          if (batch.length < limit) break;
          page += 1;
          if (page > 100) break; // safety cap to prevent infinite loops
        }
        setAllTransactions(txns);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch dashboard data. Please try again later.');
        setLoading(false);
        console.error('Error fetching dashboard data:', err);
      }
    };

    fetchData();
  }, []);

  // Recompute month-dependent data whenever selected month/year or allTransactions change
  useEffect(() => {
    const computeMonthData = async () => {
      try {
        setLoading(true);
        // Build date range for selected month
        const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
        const startOfNextMonth = new Date(selectedYear, selectedMonth, 1);

        // Recent transactions from selected month (latest 10)
        const monthlyTransactions = allTransactions.filter(t => {
          const d = new Date(t.transaction_date);
          return d >= startOfMonth && d < startOfNextMonth;
        });
        const recent = [...monthlyTransactions]
          .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
          .slice(0, 10);
        setRecentTransactions(recent);

        // Monthly income via API (server-calculated)
        const monthlyStatus = await budgetsApi.getMonthlyBudgetStatus(selectedYear, selectedMonth);
        const income = monthlyStatus.incoming_funds;
        setMonthlyIncome(income);

        // Monthly expenses from transactions (exclude Initial Balance, consider positive amounts as expenses per existing logic)
        const expenses = monthlyTransactions
          .filter(t => t.amount > 0 && t.category !== 'Initial Balance')
          .reduce((sum, t) => sum + t.amount, 0);
        setMonthlyExpenses(expenses);

        setMonthlyNet(income - expenses);
        setLoading(false);
      } catch (err) {
        console.error('Error computing month data:', err);
        setError('Failed to compute monthly data.');
        setLoading(false);
      }
    };

    // Only compute if base data loaded
    if (!loading) {
      computeMonthData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, allTransactions]);

  // Memoized transactions for the selected month
  const monthlyTransactionsMemo = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth - 1, 1);
    const end = new Date(selectedYear, selectedMonth, 1);
    return allTransactions.filter(t => {
      const d = new Date(t.transaction_date);
      return d >= start && d < end;
    });
  }, [allTransactions, selectedYear, selectedMonth]);

  // Helper to check if an account is On Budget (including subtypes)
  const isOnBudgetAccount = (accountId?: string) => {
    if (!accountId) return false;
    const acc = accounts.find(a => a.id === accountId);
    return acc ? acc.account_type.toLowerCase().startsWith(ACCOUNT_TYPE.ON_BUDGET.toLowerCase()) : false;
  };

  // Income transactions: inflows (positive amounts) to On Budget destination accounts (align with TransactionsList)
  const incomeTransactions = useMemo(() =>
    monthlyTransactionsMemo.filter(t => t.amount > 0 && isOnBudgetAccount(t.destination_account_id))
  , [monthlyTransactionsMemo, accounts]);

  // Expense transactions (positive amounts, excluding Initial Balance)
  const expenseTransactions = useMemo(() =>
    monthlyTransactionsMemo.filter(t => t.amount > 0 && t.category !== 'Initial Balance')
  , [monthlyTransactionsMemo]);

  // Selected transactions for drill-down view
  const selectedTransactions = useMemo(() => {
    const list = selectedMetric === 'income' ? incomeTransactions
      : selectedMetric === 'expenses' ? expenseTransactions
      : incomeTransactions.concat(expenseTransactions);
    return [...list].sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [selectedMetric, incomeTransactions, expenseTransactions]);

  // Ref and helper to scroll to the Monthly Details section and select metric
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const goToDetails = (metric: 'income' | 'expenses' | 'net') => {
    setSelectedMetric(metric);
    // scroll after state updates are applied
    setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : 'Unknown Account';
  };

  // Only allow selecting On Budget and Off Budget accounts in the Total Balance widget
  const selectableAccounts = useMemo(() => {
    const on = ACCOUNT_TYPE.ON_BUDGET.toLowerCase();
    const off = ACCOUNT_TYPE.OFF_BUDGET.toLowerCase();
    return accounts.filter(a => {
      const t = a.account_type.toLowerCase();
      return t.startsWith(on) || t.startsWith(off);
    });
  }, [accounts]);

  // Selected accounts for Total Balance widget
  useEffect(() => {
    // Initialize from localStorage or default to eligible accounts (On/Off Budget)
    try {
      const key = 'dashboard_total_balance_accounts';
      const saved = localStorage.getItem(key);
      const allIds = selectableAccounts.map(a => a.id);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        const filtered = parsed.filter(id => allIds.includes(id));
        if (filtered.length > 0) {
          setSelectedBalanceAccountIds(filtered);
        } else {
          setSelectedBalanceAccountIds(allIds);
          localStorage.setItem(key, JSON.stringify(allIds));
        }
      } else {
        setSelectedBalanceAccountIds(allIds);
        localStorage.setItem(key, JSON.stringify(allIds));
      }
    } catch (_err) { void _err;
      // Fallback to eligible accounts on parse error
      const allIds = selectableAccounts.map(a => a.id);
      setSelectedBalanceAccountIds(allIds);
      try { localStorage.setItem('dashboard_total_balance_accounts', JSON.stringify(allIds)); } catch (_e) { void _e; }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectableAccounts.length]);

  const toggleSelectedAccount = (id: string) => {
    setSelectedBalanceAccountIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try { localStorage.setItem('dashboard_total_balance_accounts', JSON.stringify(next)); } catch (_e) { void _e; }
      return next;
    });
  };

  const selectAllAccounts = () => {
    const allIds = selectableAccounts.map(a => a.id);
    setSelectedBalanceAccountIds(allIds);
    try { localStorage.setItem('dashboard_total_balance_accounts', JSON.stringify(allIds)); } catch { void 0; }
  };

  const clearAllAccounts = () => {
    setSelectedBalanceAccountIds([]);
    try { localStorage.setItem('dashboard_total_balance_accounts', JSON.stringify([])); } catch { void 0; }
  };

  const selectedAccounts = useMemo(() => accounts.filter(a => selectedBalanceAccountIds.includes(a.id)), [accounts, selectedBalanceAccountIds]);
  const combinedSelectedTotal = useMemo(() => selectedAccounts.reduce((sum, a) => sum + a.balance, 0), [selectedAccounts]);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  // Group accounts by type

  // Use startsWith to include accounts with subtypes
  const onBudgetAccounts = accounts.filter(account =>
    account.account_type.toLowerCase().startsWith(ACCOUNT_TYPE.ON_BUDGET.toLowerCase()));
  const offBudgetAccounts = accounts.filter(account =>
    account.account_type.toLowerCase().startsWith(ACCOUNT_TYPE.OFF_BUDGET.toLowerCase()));

  // Calculate totals for each group
  const onBudgetTotal = onBudgetAccounts.reduce((sum, account) => sum + account.balance, 0);
  const offBudgetTotal = offBudgetAccounts.reduce((sum, account) => sum + account.balance, 0);
  // Calculate combined total
  const combinedTotal = onBudgetTotal + offBudgetTotal;


  return (
    <div className="dashboard">
      <div className="header-actions" style={{ alignItems: 'center', gap: '12px' }}>
        <h1 style={{ marginBottom: 0 }}>Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <button className="button secondary" onClick={handlePrevMonth} aria-label="Previous Month">◀</button>
          <span style={{ minWidth: 160, textAlign: 'center', fontWeight: 600 }}>{monthLabel}</span>
          <button className="button secondary" onClick={handleNextMonth} disabled={!canGoNext} aria-label="Next Month">▶</button>
        </div>
        {!isMobile && (
          <button
            onClick={() => navigate('/transactions/quick-add')}
            className="button quick-add-button"
            style={{
              padding: '10px 16px',
              fontSize: '16px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            Quick Add
          </button>
        )}
      </div>

      {/* Floating Action Button for mobile */}
      {isMobile && (
        <div className="fab-container">
          <button
            className="fab"
            onClick={() => navigate('/transactions/quick-add')}
            aria-label="Add Transaction"
          >
            +
          </button>
        </div>
      )}

      <div className="dashboard-summary">
        <div className="summary-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <h2 style={{ margin: 0 }}>Total Balance</h2>
            <button
              className="button secondary"
              onClick={() => setShowAccountSelector(s => !s)}
              aria-label="Select accounts for Total Balance"
            >
              Select accounts
            </button>
          </div>
          <p className="amount">{formatNumber(combinedSelectedTotal)}</p>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Using {selectedAccounts.length} of {selectableAccounts.length} accounts
          </div>
          {showAccountSelector && (
            <div style={{ border: '1px solid var(--color-border, #ccc)', borderRadius: 8, padding: 8, marginTop: 8, maxHeight: 220, overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button className="button small" onClick={selectAllAccounts}>Select All</button>
                <button className="button small secondary" onClick={clearAllAccounts}>Clear</button>
              </div>
              {selectableAccounts.map(acc => (
                <label key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <input
                    type="checkbox"
                    checked={selectedBalanceAccountIds.includes(acc.id)}
                    onChange={() => toggleSelectedAccount(acc.id)}
                  />
                  <span style={{ flex: 1 }}>{acc.name}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>{acc.balance.toFixed(2)}</span>
                </label>
              ))}
            </div>
          )}
          <Link to="/accounts" className="card-link">View Accounts</Link>
        </div>

        <div className="summary-card">
          <h2>Monthly Income</h2>
          <p className="amount positive">{formatNumber(monthlyIncome)}</p>
          <button className="button secondary" onClick={() => goToDetails('income')}>View transactions</button>
        </div>

        <div className="summary-card">
          <h2>Monthly Expenses</h2>
          <p className="amount negative">{formatNumber(monthlyExpenses)}</p>
          <button className="button secondary" onClick={() => goToDetails('expenses')}>View transactions</button>
        </div>

        <div className="summary-card">
          <h2>Monthly Net</h2>
          <p className={`amount ${monthlyNet >= 0 ? 'positive' : 'negative'}`}>
            {formatNumber(monthlyNet)}
          </p>
          <button className="button secondary" onClick={() => goToDetails('net')}>View transactions</button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Left sidebar with accounts grouped by type */}
        <div className="accounts-sidebar">
          {accounts.length === 0 ? (
            <p>No accounts found. <Link to="/accounts/new">Create your first account</Link> to get started.</p>
          ) : (
            <>
              {/* On Budget Accounts */}
              <div className="account-group">
                <h2>On Budget Accounts</h2>
                <p className="group-total">
                  <strong>Total:</strong> <span className={onBudgetTotal >= 0 ? 'positive' : 'negative'}>
                    {onBudgetTotal.toFixed(2)}
                  </span>
                </p>
                <ul className="account-list">
                  {onBudgetAccounts.map(account => (
                    <li key={account.id} className="account-item">
                      <Link to={`/accounts/${account.id}`}>
                        <span className="account-name">{account.name}</span>
                        <span className={`account-balance ${account.balance >= 0 ? 'positive' : 'negative'}`}>
                          {account.balance.toFixed(2)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Off Budget Accounts */}
              <div className="account-group">
                <h2>Off Budget Accounts</h2>
                <p className="group-total">
                  <strong>Total:</strong> <span className={offBudgetTotal >= 0 ? 'positive' : 'negative'}>
                    {offBudgetTotal.toFixed(2)}
                  </span>
                </p>
                <ul className="account-list">
                  {offBudgetAccounts.map(account => (
                    <li key={account.id} className="account-item">
                      <Link to={`/accounts/${account.id}`}>
                        <span className="account-name">{account.name}</span>
                        <span className={`account-balance ${account.balance >= 0 ? 'positive' : 'negative'}`}>
                          {account.balance.toFixed(2)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Combined Total */}
              <div className="account-group combined-total">
                <h2>Combined Total</h2>
                <p className="group-total total-combined">
                  <strong>Total:</strong> <span className={combinedTotal >= 0 ? 'positive' : 'negative'}>
                    {combinedTotal.toFixed(2)}
                  </span>
                </p>
              </div>

              <div className="account-actions">
                <Link to="/accounts/new" className="button">Add Account</Link>
                <Link to="/accounts" className="button secondary">View All Accounts</Link>
              </div>
            </>
          )}
        </div>

        {/* Right side content */}
        <div className="dashboard-main">
          <div className="dashboard-transactions">
            <div className="section-header">
              <h2>Recent Transactions</h2>
              <div className="header-actions">
                <Link to="/transactions" className="view-all">View All</Link>
              </div>
            </div>

            {recentTransactions.length === 0 ? (
              <p>No transactions found. <Link to="/transactions/new">Create your first transaction</Link> to get started.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Account</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map(transaction => (
                    <tr key={transaction.id}>
                      <td>{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                      <td>{getAccountName(transaction.source_account_id)}</td>
                      <td>{transaction.description}</td>
                      <td>{transaction.category}</td>
                      <td className={transaction.amount < 0 ? 'positive' : 'negative'}>
                        {transaction.amount < 0 ? Math.abs(transaction.amount).toFixed(2) : `-${transaction.amount.toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Monthly Details: drill-down for Income/Expenses/Net */}
          <div className="dashboard-transactions" ref={detailsRef}>
            <div className="section-header">
              <h2>Monthly Details</h2>
              <div className="header-actions" style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`button ${selectedMetric === 'income' ? '' : 'secondary'}`}
                  onClick={() => setSelectedMetric('income')}
                >
                  Income
                </button>
                <button
                  className={`button ${selectedMetric === 'expenses' ? '' : 'secondary'}`}
                  onClick={() => setSelectedMetric('expenses')}
                >
                  Expenses
                </button>
                <button
                  className={`button ${selectedMetric === 'net' ? '' : 'secondary'}`}
                  onClick={() => setSelectedMetric('net')}
                >
                  Net
                </button>
              </div>
            </div>

            {selectedTransactions.length === 0 ? (
              <p>No transactions for this selection.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransactions.map(tx => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.transaction_date).toLocaleDateString()}</td>
                      <td>{getAccountName(tx.source_account_id)}</td>
                      <td>{tx.destination_account_id ? getAccountName(tx.destination_account_id) : (tx.destination_name || '-')}</td>
                      <td>{tx.description}</td>
                      <td>{tx.category}</td>
                      <td className={tx.amount < 0 ? 'positive' : 'negative'}>
                        {tx.amount < 0 ? Math.abs(tx.amount).toFixed(2) : `-${tx.amount.toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
