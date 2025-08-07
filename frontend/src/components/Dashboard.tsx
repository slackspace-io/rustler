import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { accountsApi, transactionsApi } from '../services/api';
import type { Account, Transaction } from '../services/api';
import { ACCOUNT_TYPE } from '../constants/accountTypes';
import './MobileDashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Summary data
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyNet, setMonthlyNet] = useState(0);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch accounts
        const accountsData = await accountsApi.getAccounts();
        setAccounts(accountsData);

        // Calculate total balance
        const total = accountsData.reduce((sum, account) => sum + account.balance, 0);
        setTotalBalance(total);

        // Fetch all transactions
        const allTransactions = await transactionsApi.getTransactions();

        // Get recent transactions (last 10)
        const recent = [...allTransactions]
          .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
          .slice(0, 10);
        setRecentTransactions(recent);

        // Calculate monthly income and expenses
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const monthlyTransactions = allTransactions.filter(
          t => new Date(t.transaction_date) >= startOfMonth
        );

        const income = monthlyTransactions
          .filter(t => t.amount < 0)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        setMonthlyIncome(income);

        const expenses = monthlyTransactions
          .filter(t => t.amount > 0 && t.category !== "Initial Balance")
          .reduce((sum, t) => sum + t.amount, 0);
        setMonthlyExpenses(expenses);

        setMonthlyNet(income - expenses);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch dashboard data. Please try again later.');
        setLoading(false);
        console.error('Error fetching dashboard data:', err);
      }
    };

    fetchData();
  }, []);

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : 'Unknown Account';
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
      <div className="header-actions">
        <h1>Dashboard</h1>
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
          <h2>Total Balance</h2>
          <p className="amount">{totalBalance.toFixed(2)}</p>
          <Link to="/accounts" className="card-link">View Accounts</Link>
        </div>

        <div className="summary-card">
          <h2>Monthly Income</h2>
          <p className="amount positive">{monthlyIncome.toFixed(2)}</p>
        </div>

        <div className="summary-card">
          <h2>Monthly Expenses</h2>
          <p className="amount negative">{monthlyExpenses.toFixed(2)}</p>
        </div>

        <div className="summary-card">
          <h2>Monthly Net</h2>
          <p className={`amount ${monthlyNet >= 0 ? 'positive' : 'negative'}`}>
            {monthlyNet.toFixed(2)}
          </p>
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
