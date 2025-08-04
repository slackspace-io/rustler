import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { accountsApi, transactionsApi } from '../services/api';
import type { Account, Transaction } from '../services/api';

const Dashboard = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Summary data
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyNet, setMonthlyNet] = useState(0);

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
          .filter(t => t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0);
        setMonthlyIncome(income);

        const expenses = monthlyTransactions
          .filter(t => t.amount < 0)
          .reduce((sum, t) => sum + t.amount, 0);
        setMonthlyExpenses(expenses);

        setMonthlyNet(income + expenses);

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

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

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
          <p className="amount negative">{Math.abs(monthlyExpenses).toFixed(2)}</p>
        </div>

        <div className="summary-card">
          <h2>Monthly Net</h2>
          <p className={`amount ${monthlyNet >= 0 ? 'positive' : 'negative'}`}>
            {monthlyNet.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="dashboard-accounts">
        <div className="section-header">
          <h2>Accounts</h2>
          <Link to="/accounts" className="view-all">View All</Link>
        </div>

        {accounts.length === 0 ? (
          <p>No accounts found. <Link to="/accounts/new">Create your first account</Link> to get started.</p>
        ) : (
          <div className="accounts-grid">
            {accounts.slice(0, 4).map(account => (
              <div key={account.id} className="account-card">
                <h3>{account.name}</h3>
                <p className="account-type">{account.account_type}</p>
                <p className={`account-balance ${account.balance >= 0 ? 'positive' : 'negative'}`}>
                  {account.balance.toFixed(2)}
                </p>
                <Link to={`/accounts/${account.id}`} className="card-link">View Details</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-transactions">
        <div className="section-header">
          <h2>Recent Transactions</h2>
          <Link to="/transactions" className="view-all">View All</Link>
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
                  <td className={transaction.amount >= 0 ? 'positive' : 'negative'}>
                    {transaction.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
