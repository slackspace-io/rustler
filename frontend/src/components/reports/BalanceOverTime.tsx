import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { accountsApi, transactionsApi } from '../../services/api';
import type { Account, Transaction } from '../../services/api';

interface BalanceDataPoint {
  date: string;
  [accountId: string]: string | number;
}

type DatePreset = 'last-month' | '3-months' | '6-months' | 'ytd' | '1-year' | 'all-time' | 'custom';
type Granularity = 'day' | 'week' | 'month';

const BalanceOverTime = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<DatePreset>('last-month');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [chartData, setChartData] = useState<BalanceDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load accounts on component mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const accountsData = await accountsApi.getAccounts();
        setAccounts(accountsData);

        // Default to selecting all accounts
        setSelectedAccounts(accountsData.map(account => account.id));

        // Set default date range to last 30 days
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);

        setLoading(false);
      } catch (err) {
        setError('Failed to load accounts. Please try again later.');
        setLoading(false);
        console.error('Error loading accounts:', err);
      }
    };

    fetchAccounts();
  }, []);

  // Generate chart data when selected accounts or date range changes
  useEffect(() => {
    if (selectedAccounts.length === 0 || !startDate || !endDate) {
      return;
    }

    const generateChartData = async () => {
      try {
        setLoading(true);

        // Fetch all transactions for selected accounts
        const allTransactions: Transaction[] = [];

        for (const accountId of selectedAccounts) {
          const transactions = await transactionsApi.getAccountTransactions(accountId);
          allTransactions.push(...transactions);
        }

        // Filter transactions by date range
        const startDateTime = new Date(startDate).getTime();
        const endDateTime = new Date(endDate).getTime() + (24 * 60 * 60 * 1000); // Include end date

        const filteredTransactions = allTransactions.filter(transaction => {
          const transactionTime = new Date(transaction.transaction_date).getTime();
          return transactionTime >= startDateTime && transactionTime <= endDateTime;
        });

        // Sort transactions by date
        filteredTransactions.sort((a, b) =>
          new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
        );

        // Get initial balances for selected accounts
        const accountBalances: { [accountId: string]: number } = {};

        for (const accountId of selectedAccounts) {
          const account = accounts.find(a => a.id === accountId);
          if (account) {
            // Start with current balance and subtract all transactions after end date
            let balance = account.balance;

            // Find all transactions for this account after the end date
            const laterTransactions = allTransactions.filter(t =>
              t.source_account_id === accountId &&
              new Date(t.transaction_date).getTime() > endDateTime
            );

            // Subtract these transactions from the current balance
            for (const transaction of laterTransactions) {
              balance -= transaction.amount;
            }

            // Find all transactions for this account before the start date
            const earlierTransactions = allTransactions.filter(t =>
              t.source_account_id === accountId &&
              new Date(t.transaction_date).getTime() < startDateTime
            );

            // Add these transactions to the balance (since we're going backwards)
            for (const transaction of earlierTransactions) {
              balance += transaction.amount;
            }

            accountBalances[accountId] = balance;
          }
        }

        // Generate data points for each day in the date range
        const data: BalanceDataPoint[] = [];
        const currentDate = new Date(startDate);
        const lastDate = new Date(endDate);

        while (currentDate <= lastDate) {
          const dateString = currentDate.toISOString().split('T')[0];
          const dataPoint: BalanceDataPoint = { date: dateString };

          // Add balance for each selected account
          for (const accountId of selectedAccounts) {
            dataPoint[accountId] = accountBalances[accountId] || 0;
          }

          data.push(dataPoint);

          // Find transactions on this day and update balances
          const dayTransactions = filteredTransactions.filter(transaction => {
            const transactionDate = new Date(transaction.transaction_date).toISOString().split('T')[0];
            return transactionDate === dateString;
          });

          // Update account balances based on transactions
          for (const transaction of dayTransactions) {
            if (selectedAccounts.includes(transaction.source_account_id)) {
              accountBalances[transaction.source_account_id] -= transaction.amount;
            }
          }

          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }

        setChartData(data);
        setLoading(false);
      } catch (err) {
        setError('Failed to generate chart data. Please try again later.');
        setLoading(false);
        console.error('Error generating chart data:', err);
      }
    };

    generateChartData();
  }, [selectedAccounts, startDate, endDate, accounts]);

  const handleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  const getRandomColor = (index: number) => {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE',
      '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'
    ];
    return colors[index % colors.length];
  };

  if (loading && accounts.length === 0) {
    return <div>Loading accounts...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="balance-over-time">
      <h2>Account Balance Over Time</h2>

      <div className="report-filters">
        <div className="date-range">
          <label>
            Start Date:
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label>
            End Date:
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>

        <div className="account-selection">
          <h3>Select Accounts</h3>
          {accounts.map(account => (
            <div key={account.id} className="account-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={selectedAccounts.includes(account.id)}
                  onChange={() => handleAccountSelection(account.id)}
                />
                {account.name} ({account.account_type})
              </label>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div>Generating chart...</div>
      ) : chartData.length > 0 ? (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedAccounts.map((accountId, index) => {
                const account = accounts.find(a => a.id === accountId);
                return (
                  <Line
                    key={accountId}
                    type="monotone"
                    dataKey={accountId}
                    name={account ? account.name : accountId}
                    stroke={getRandomColor(index)}
                    activeDot={{ r: 8 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="no-data">
          No data available for the selected accounts and date range.
        </div>
      )}
    </div>
  );
};

export default BalanceOverTime;
