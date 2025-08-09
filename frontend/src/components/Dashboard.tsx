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
    const [incomingTransactions, setIncomingTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state for Total Balance widget
  const [selectedBalanceAccountIds, setSelectedBalanceAccountIds] = useState<string[]>([]);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [tempSelectedBalanceAccountIds, setTempSelectedBalanceAccountIds] = useState<string[]>([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

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

        // Monthly expenses widget rules:
        // - Count only withdrawals (positive amounts) from On Budget accounts
        // - Exclude transfers between On Budget accounts
        // - Include transfers from On Budget to Off Budget accounts
        // - Exclude 'Initial Balance' transactions
        const expenses = monthlyTransactions
          .filter(t => {
            if (!(t.amount > 0)) return false; // only withdrawals (outflows)
            if (t.category === 'Initial Balance') return false; // exclude initial balance
            // source must be On Budget
            if (!isOnBudgetAccount(t.source_account_id)) return false;
            // Exclude transfers between On Budget accounts
            const hasDst = !!t.destination_account_id;
            if (hasDst && isOnBudgetAccount(t.destination_account_id!)) return false;
            return true; // regular expenses or On->Off transfers
          })
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

  // Fetch monthly incoming transactions from server to align with Monthly Income widget
  useEffect(() => {
    const fetchIncoming = async () => {
      try {
        const txs = await transactionsApi.getMonthlyIncomingTransactions(selectedYear, selectedMonth);
        setIncomingTransactions(txs);
      } catch (e) {
        console.error('Failed to fetch monthly incoming transactions', e);
      }
    };
    if (!loading) {
      fetchIncoming();
    }
  }, [selectedYear, selectedMonth, loading]);

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

  // Income transactions fetched from server to match widget monthly income selection
  const incomeTransactions = incomingTransactions;

  // Expense transactions per widget rules
  // - Withdrawals (positive amounts) from On Budget source accounts
  // - Exclude transfers between On Budget accounts
  // - Include On Budget -> Off Budget transfers
  // - Exclude 'Initial Balance'
  const expenseTransactions = useMemo(() =>
    monthlyTransactionsMemo.filter(t => {
      if (!(t.amount > 0)) return false;
      if (t.category === 'Initial Balance') return false;
      if (!isOnBudgetAccount(t.source_account_id)) return false;
      const hasDst = !!t.destination_account_id;
      if (hasDst && isOnBudgetAccount(t.destination_account_id!)) return false;
      return true;
    })
  , [monthlyTransactionsMemo, accounts]);

  // Selected transactions for drill-down view
  const selectedTransactions = useMemo(() => {
    const list = selectedMetric === 'income' ? incomeTransactions
      : selectedMetric === 'expenses' ? expenseTransactions
      : incomeTransactions.concat(expenseTransactions);
    return [...list].sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [selectedMetric, incomeTransactions, expenseTransactions]);

  // Build rows with normalized display amount and running balance
  // - Income tab: always show as positive (green), regardless of raw sign
  // - Expenses tab: always show as negative (red), regardless of raw sign
  // - Net tab: normalize by membership (income vs expense)
  // Running balance is reversed so the top row shows the monthly total (after latest transaction)
  const detailedRows = useMemo(() => {
    // Precompute membership sets for reliable classification on 'net'
    const incomeIds = new Set(incomeTransactions.map(t => t.id));
    const expenseIds = new Set(expenseTransactions.map(t => t.id));

    // First pass: compute display amounts in current visible order (latest -> oldest)
    const base = selectedTransactions.map(tx => {
      let displayAmount: number;
      if (selectedMetric === 'income') {
        // Always positive for display
        displayAmount = Math.abs(tx.amount);
      } else if (selectedMetric === 'expenses') {
        // Always negative for display
        displayAmount = -Math.abs(tx.amount);
      } else {
        // Net: decide based on semantic classification, not raw sign
        if (incomeIds.has(tx.id)) {
          displayAmount = Math.abs(tx.amount);
        } else if (expenseIds.has(tx.id)) {
          displayAmount = -Math.abs(tx.amount);
        } else {
          // Fallback: use raw sign if not classified (shouldn't happen)
          displayAmount = tx.amount < 0 ? Math.abs(tx.amount) : -Math.abs(tx.amount);
        }
      }
      return { tx, displayAmount };
    });

    // Compute total (sum of all display amounts)
    const total = base.reduce((sum, r) => sum + r.displayAmount, 0);

    // Second pass: assign reversed running balance so first row shows total
    let remaining = total;
    const rows = base.map(r => {
      const row = { tx: r.tx, displayAmount: r.displayAmount, running: remaining };
      remaining -= r.displayAmount;
      return row;
    });

    return rows;
  }, [selectedTransactions, selectedMetric, incomeTransactions, expenseTransactions]);

  const detailedTotal = useMemo(() => {
    if (detailedRows.length === 0) return 0;
    // With reversed running, the first row holds the monthly total
    return detailedRows[0].running;
  }, [detailedRows]);

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
    // Wait until eligible accounts are loaded to avoid wiping saved selection
    if (selectableAccounts.length === 0) return;
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
    setTempSelectedBalanceAccountIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      return next;
    });
  };

  const selectAllAccounts = () => {
    const allIds = selectableAccounts.map(a => a.id);
    setTempSelectedBalanceAccountIds(allIds);
  };

  const clearAllAccounts = () => {
    setTempSelectedBalanceAccountIds([]);
  };

  const selectedAccounts = useMemo(() => accounts.filter(a => selectedBalanceAccountIds.includes(a.id)), [accounts, selectedBalanceAccountIds]);
  const combinedSelectedTotal = useMemo(() => selectedAccounts.reduce((sum, a) => sum + a.balance, 0), [selectedAccounts]);

  const visibleAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    const filtered = selectableAccounts.filter(a => {
      const matchesSearch = q === '' || a.name.toLowerCase().includes(q);
      const matchesSelected = !showSelectedOnly || tempSelectedBalanceAccountIds.includes(a.id);
      return matchesSearch && matchesSelected;
    });
    return [...filtered].sort((a, b) => {
      const aSel = tempSelectedBalanceAccountIds.includes(a.id) ? 0 : 1;
      const bSel = tempSelectedBalanceAccountIds.includes(b.id) ? 0 : 1;
      if (aSel !== bSel) return aSel - bSel;
      return a.name.localeCompare(b.name);
    });
  }, [selectableAccounts, accountSearch, showSelectedOnly, tempSelectedBalanceAccountIds]);

  const visibleOnBudgetAccounts = useMemo(() => {
    const on = ACCOUNT_TYPE.ON_BUDGET.toLowerCase();
    return visibleAccounts.filter(a => a.account_type.toLowerCase().startsWith(on));
  }, [visibleAccounts]);

  const visibleOffBudgetAccounts = useMemo(() => {
    const off = ACCOUNT_TYPE.OFF_BUDGET.toLowerCase();
    return visibleAccounts.filter(a => a.account_type.toLowerCase().startsWith(off));
  }, [visibleAccounts]);

  const openAccountSelector = () => {
    setAccountSearch('');
    setShowSelectedOnly(false);
    setTempSelectedBalanceAccountIds(selectedBalanceAccountIds);
    setShowAccountSelector(true);
  };

  const handleSaveSelection = () => {
    setSelectedBalanceAccountIds(tempSelectedBalanceAccountIds);
    try { localStorage.setItem('dashboard_total_balance_accounts', JSON.stringify(tempSelectedBalanceAccountIds)); } catch (_e) { void _e; }
    setShowAccountSelector(false);
  };

  const handleCancelSelection = () => {
    setShowAccountSelector(false);
  };

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
              onClick={openAccountSelector}
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
            <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', borderRadius: 12, width: 'min(900px, 95vw)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border, #ccc)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <h3 style={{ margin: 0 }}>Select accounts for Total Balance</h3>
                  <button className="button secondary" onClick={handleCancelSelection}>Close</button>
                </div>
                <div style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid var(--color-border, #ccc)' }}>
                  <input
                    type="text"
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    placeholder="Search accounts..."
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--color-border, #ccc)' }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={showSelectedOnly} onChange={(e) => setShowSelectedOnly(e.target.checked)} />
                    Selected only
                  </label>
                  <button className="button small" onClick={selectAllAccounts}>Select All</button>
                  <button className="button small secondary" onClick={clearAllAccounts}>Clear</button>
                </div>
                <div style={{ padding: '8px 16px', overflowY: 'auto' }}>
                  {visibleAccounts.length === 0 ? (
                    <p style={{ opacity: 0.8 }}>No accounts match your search.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <h4 style={{ margin: 0 }}>On Budget</h4>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--color-border, #ccc)' }}>Select</th>
                              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--color-border, #ccc)' }}>Account</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid var(--color-border, #ccc)' }}>Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleOnBudgetAccounts.length === 0 ? (
                              <tr>
                                <td colSpan={3} style={{ padding: '8px', opacity: 0.8 }}>No on-budget accounts.</td>
                              </tr>
                            ) : (
                              visibleOnBudgetAccounts.map(acc => (
                                <tr key={acc.id} style={{ borderBottom: '1px solid var(--color-border, #eee)' }}>
                                  <td style={{ padding: '6px 8px' }}>
                                    <input
                                      type="checkbox"
                                      checked={tempSelectedBalanceAccountIds.includes(acc.id)}
                                      onChange={() => toggleSelectedAccount(acc.id)}
                                    />
                                  </td>
                                  <td style={{ padding: '6px 8px' }}>{acc.name}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: 0.9 }}>{acc.balance.toFixed(2)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <h4 style={{ margin: 0 }}>Off Budget</h4>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--color-border, #ccc)' }}>Select</th>
                              <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--color-border, #ccc)' }}>Account</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid var(--color-border, #ccc)' }}>Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleOffBudgetAccounts.length === 0 ? (
                              <tr>
                                <td colSpan={3} style={{ padding: '8px', opacity: 0.8 }}>No off-budget accounts.</td>
                              </tr>
                            ) : (
                              visibleOffBudgetAccounts.map(acc => (
                                <tr key={acc.id} style={{ borderBottom: '1px solid var(--color-border, #eee)' }}>
                                  <td style={{ padding: '6px 8px' }}>
                                    <input
                                      type="checkbox"
                                      checked={tempSelectedBalanceAccountIds.includes(acc.id)}
                                      onChange={() => toggleSelectedAccount(acc.id)}
                                    />
                                  </td>
                                  <td style={{ padding: '6px 8px' }}>{acc.name}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: 0.9 }}>{acc.balance.toFixed(2)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ padding: 12, borderTop: '1px solid var(--color-border, #ccc)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button className="button secondary" onClick={handleCancelSelection}>Cancel</button>
                  <button className="button" onClick={handleSaveSelection}>Save</button>
                </div>
              </div>
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
                    <th>Running</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedRows.map(row => (
                    <tr key={row.tx.id}>
                      <td>{new Date(row.tx.transaction_date).toLocaleDateString()}</td>
                      <td>{getAccountName(row.tx.source_account_id)}</td>
                      <td>{row.tx.destination_account_id ? getAccountName(row.tx.destination_account_id) : (row.tx.destination_name || '-')}</td>
                      <td>{row.tx.description}</td>
                      <td>{row.tx.category}</td>
                      <td className={row.displayAmount >= 0 ? 'positive' : 'negative'}>
                        {row.displayAmount >= 0 ? row.displayAmount.toFixed(2) : `-${Math.abs(row.displayAmount).toFixed(2)}`}
                      </td>
                      <td className={row.running >= 0 ? 'positive' : 'negative'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {row.running >= 0 ? row.running.toFixed(2) : `-${Math.abs(row.running).toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'right', fontWeight: 600 }}>Total</td>
                    <td className={detailedTotal >= 0 ? 'positive' : 'negative'}>
                      {detailedTotal >= 0 ? detailedTotal.toFixed(2) : `-${Math.abs(detailedTotal).toFixed(2)}`}
                    </td>
                    <td className={detailedTotal >= 0 ? 'positive' : 'negative'}>
                      {detailedTotal >= 0 ? detailedTotal.toFixed(2) : `-${Math.abs(detailedTotal).toFixed(2)}`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
