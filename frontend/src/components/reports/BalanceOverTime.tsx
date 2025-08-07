import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { accountsApi, transactionsApi } from '../../services/api';
import type { Account, Transaction } from '../../services/api';
import { ACCOUNT_TYPE } from '../../constants/accountTypes';

interface BalanceDataPoint {
  date: string;
  [accountId: string]: string | number | undefined;
  total?: number;
}

type DatePreset = 'last-month' | '3-months' | '6-months' | 'ytd' | '1-year' | 'all-time' | 'custom';
type Granularity = 'day' | 'week' | 'month';
type DisplayMode = 'individual' | 'summed';

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
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('on-budget'); // 'on-budget', 'off-budget', or 'both'
  const [displayMode, setDisplayMode] = useState<DisplayMode>('individual'); // 'individual' or 'summed'

  // Update selected accounts when account type filter changes
  const handleAccountTypeFilterChange = (filterType: string) => {
    setAccountTypeFilter(filterType);

    // Filter accounts based on the new filter (excluding external accounts)
    // Use startsWith to include accounts with subtypes
    const newFilteredAccounts = accounts.filter(account => {
      if (filterType === 'on-budget') return account.account_type.startsWith(ACCOUNT_TYPE.ON_BUDGET);
      if (filterType === 'off-budget') return account.account_type.startsWith(ACCOUNT_TYPE.OFF_BUDGET);
      if (filterType === 'both') return account.account_type.startsWith(ACCOUNT_TYPE.ON_BUDGET) ||
                                       account.account_type.startsWith(ACCOUNT_TYPE.OFF_BUDGET);
      return false; // Don't include any other account types
    });

    // Update selected accounts to include all filtered accounts
    setSelectedAccounts(newFilteredAccounts.map(account => account.id));
  }

  // Function to calculate date range based on preset
  const calculateDateRange = (preset: DatePreset): { start: Date, end: Date } => {
    const end = new Date();
    const start = new Date();

    switch (preset) {
      case 'last-month':
        start.setMonth(start.getMonth() - 1);
        setGranularity('day');
        break;
      case '3-months':
        start.setMonth(start.getMonth() - 3);
        setGranularity('week');
        break;
      case '6-months':
        start.setMonth(start.getMonth() - 6);
        setGranularity('week');
        break;
      case 'ytd':
        start.setMonth(0);
        start.setDate(1);
        setGranularity('week');
        break;
      case '1-year':
        start.setFullYear(start.getFullYear() - 1);
        setGranularity('month');
        break;
      case 'all-time':
        // Set to a date far in the past or the earliest transaction date
        start.setFullYear(start.getFullYear() - 5);
        setGranularity('month');
        break;
      default:
        // Default to last month
        start.setMonth(start.getMonth() - 1);
        setGranularity('day');
    }

    return { start, end };
  };

  // Function to apply a preset
  const applyPreset = (preset: DatePreset) => {
    setActivePreset(preset);
    const { start, end } = calculateDateRange(preset);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  // Load accounts on component mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const accountsData = await accountsApi.getAccounts();

        // Filter out external accounts
        // Use startsWith to include accounts with subtypes
        const filteredAccountsData = accountsData.filter(
          account => account.account_type.startsWith(ACCOUNT_TYPE.ON_BUDGET) ||
                    account.account_type.startsWith(ACCOUNT_TYPE.OFF_BUDGET)
        );

        setAccounts(filteredAccountsData);

        // Default to selecting on-budget accounts
        // Use startsWith to include accounts with subtypes
        const onBudgetAccounts = filteredAccountsData.filter(
          account => account.account_type.startsWith(ACCOUNT_TYPE.ON_BUDGET)
        );
        setSelectedAccounts(onBudgetAccounts.map(account => account.id));

        // Apply default preset (last month)
        applyPreset('last-month');

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
          // Implement pagination to fetch all transactions
          let page = 1;
          const limit = 100;
          let hasMoreTransactions = true;

          while (hasMoreTransactions) {
            const transactions = await transactionsApi.getAccountTransactions(accountId, page, limit);
            allTransactions.push(...transactions);

            // Check if we've received fewer transactions than the limit, which means we've reached the end
            if (transactions.length < limit) {
              hasMoreTransactions = false;
            } else {
              page++;
            }
          }
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
            // Start with zero balance and calculate based on transactions only
            // This fixes the issue with initial balance transactions being double-counted
            let balance = 0;

            console.log(`Initial balance calculation for ${account.name} (${accountId}):`);
            console.log(`  Starting with zero balance instead of account.balance`);

            // Get all transactions for this account (regardless of date)
            const allAccountTransactions = allTransactions.filter(t =>
              t.source_account_id === accountId || t.destination_account_id === accountId
            );

            console.log(`  Found ${allAccountTransactions.length} total transactions for this account`);

            // Find all transactions for this account before the start date
            const earlierTransactions = allAccountTransactions.filter(t =>
              new Date(t.transaction_date).getTime() < startDateTime
            );

            console.log(`  Found ${earlierTransactions.length} transactions before start date`);

            // Process all transactions before the start date to calculate the initial balance
            for (const transaction of earlierTransactions) {
              // If it's a source transaction (money going out)
              if (transaction.source_account_id === accountId) {
                balance -= transaction.amount;
                console.log(`  Outgoing transaction ${transaction.id}: -${transaction.amount} (balance: ${balance})`);
              }

              // If it's a destination transaction (money coming in)
              if (transaction.destination_account_id === accountId) {
                balance += transaction.amount;
                console.log(`  Incoming transaction ${transaction.id}: +${transaction.amount} (balance: ${balance})`);
              }
            }

            console.log(`  Final calculated balance for period start: ${balance}`);
            accountBalances[accountId] = balance;
          }
        }

        // Helper function to get the start of the week
        const getStartOfWeek = (date: Date): Date => {
          const result = new Date(date);
          result.setDate(result.getDate() - result.getDay()); // Set to Sunday
          return result;
        };

        // Helper function to format date based on granularity
        const formatDateByGranularity = (date: Date): string => {
          if (granularity === 'day') {
            return date.toISOString().split('T')[0];
          } else if (granularity === 'week') {
            const weekStart = getStartOfWeek(date);
            return `${weekStart.toISOString().split('T')[0]}`;
          } else if (granularity === 'month') {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          }
          return date.toISOString().split('T')[0]; // Default to day
        };

        // Helper function to advance date based on granularity
        const advanceDate = (date: Date): void => {
          if (granularity === 'day') {
            date.setDate(date.getDate() + 1);
          } else if (granularity === 'week') {
            date.setDate(date.getDate() + 7);
          } else if (granularity === 'month') {
            date.setMonth(date.getMonth() + 1);
          } else {
            date.setDate(date.getDate() + 1); // Default to day
          }
        };

        // Helper function to check if a transaction falls within the current period
        const isTransactionInPeriod = (transaction: Transaction, periodStart: Date, periodEnd: Date): boolean => {
          const transactionTime = new Date(transaction.transaction_date).getTime();
          return transactionTime >= periodStart.getTime() && transactionTime < periodEnd.getTime();
        };

        // Generate data points based on granularity
        const data: BalanceDataPoint[] = [];
        const currentDate = new Date(startDate);
        const lastDate = new Date(endDate);

        while (currentDate <= lastDate) {
          // Determine the end of the current period
          const periodEnd = new Date(currentDate);
          advanceDate(periodEnd);

          // If period end is after lastDate, cap it at lastDate
          if (periodEnd > lastDate) {
            periodEnd.setTime(lastDate.getTime() + 1); // Add 1ms to include lastDate
          }

          // Find transactions in this period and update balances BEFORE adding to data point
          const periodTransactions = filteredTransactions.filter(transaction =>
            isTransactionInPeriod(transaction, currentDate, periodEnd)
          );

          // Update account balances based on transactions
          for (const transaction of periodTransactions) {
            // Handle source account (money going out)
            if (selectedAccounts.includes(transaction.source_account_id)) {
              accountBalances[transaction.source_account_id] -= transaction.amount;
            }

            // Handle destination account (money coming in)
            if (transaction.destination_account_id &&
                selectedAccounts.includes(transaction.destination_account_id)) {
              accountBalances[transaction.destination_account_id] += transaction.amount;
            }
          }

          const dateString = formatDateByGranularity(currentDate);
          const dataPoint: BalanceDataPoint = { date: dateString };

          // Add balance for each selected account AFTER updating balances
          let totalBalance = 0;
          for (const accountId of selectedAccounts) {
            const accountBalance = accountBalances[accountId] || 0;

            // Ensure we're using the correct sign for the balance
            // This fixes issues with negative balances being displayed incorrectly
            const account = accounts.find(a => a.id === accountId);
            if (account) {
              console.log(`Adding data point for ${account.name}: ${accountBalance}`);
            }

            dataPoint[accountId] = accountBalance;
            totalBalance += accountBalance;
          }

          // Add the total balance for all selected accounts
          dataPoint.total = totalBalance;

          data.push(dataPoint);

          // Move to next period
          advanceDate(currentDate);
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

  // Filter accounts based on account type (only on-budget and off-budget)
  // Use startsWith to include accounts with subtypes
  const filteredAccounts = accounts.filter(account => {
    if (accountTypeFilter === 'on-budget') return account.account_type.startsWith(ACCOUNT_TYPE.ON_BUDGET);
    if (accountTypeFilter === 'off-budget') return account.account_type.startsWith(ACCOUNT_TYPE.OFF_BUDGET);
    if (accountTypeFilter === 'both') return account.account_type.startsWith(ACCOUNT_TYPE.ON_BUDGET) ||
                                           account.account_type.startsWith(ACCOUNT_TYPE.OFF_BUDGET);
    return false; // Don't include any other account types
  });

  // Handle select all accounts
  const handleSelectAll = () => {
    setSelectedAccounts(filteredAccounts.map(account => account.id));
  };

  // Handle select none
  const handleSelectNone = () => {
    setSelectedAccounts([]);
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
        <div className="date-presets">
          <h3>Date Range</h3>
          <div className="preset-buttons">
            <button
              className={activePreset === 'last-month' ? 'active' : ''}
              onClick={() => applyPreset('last-month')}
            >
              Last Month
            </button>
            <button
              className={activePreset === '3-months' ? 'active' : ''}
              onClick={() => applyPreset('3-months')}
            >
              3 Months
            </button>
            <button
              className={activePreset === '6-months' ? 'active' : ''}
              onClick={() => applyPreset('6-months')}
            >
              6 Months
            </button>
            <button
              className={activePreset === 'ytd' ? 'active' : ''}
              onClick={() => applyPreset('ytd')}
            >
              YTD
            </button>
            <button
              className={activePreset === '1-year' ? 'active' : ''}
              onClick={() => applyPreset('1-year')}
            >
              1 Year
            </button>
            <button
              className={activePreset === 'all-time' ? 'active' : ''}
              onClick={() => applyPreset('all-time')}
            >
              All Time
            </button>
          </div>
        </div>

        <div className="date-range">
          <h3>Custom Range</h3>
          <label>
            Start Date:
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActivePreset('custom');
              }}
            />
          </label>

          <label>
            End Date:
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActivePreset('custom');
              }}
            />
          </label>
        </div>

        <div className="account-selection">
          <h3>Select Accounts</h3>

          <div className="account-filter">
            <label>
              <input
                type="radio"
                name="accountTypeFilter"
                value="on-budget"
                checked={accountTypeFilter === 'on-budget'}
                onChange={() => handleAccountTypeFilterChange('on-budget')}
              />
              On Budget Accounts
            </label>
            <label>
              <input
                type="radio"
                name="accountTypeFilter"
                value="off-budget"
                checked={accountTypeFilter === 'off-budget'}
                onChange={() => handleAccountTypeFilterChange('off-budget')}
              />
              Off Budget Accounts
            </label>
            <label>
              <input
                type="radio"
                name="accountTypeFilter"
                value="both"
                checked={accountTypeFilter === 'both'}
                onChange={() => handleAccountTypeFilterChange('both')}
              />
              Both Account Types
            </label>
          </div>

          <div className="display-mode">
            <h4>Display Mode</h4>
            <label>
              <input
                type="radio"
                name="displayMode"
                value="individual"
                checked={displayMode === 'individual'}
                onChange={() => setDisplayMode('individual')}
              />
              Individual Lines Per Account
            </label>
            <label>
              <input
                type="radio"
                name="displayMode"
                value="summed"
                checked={displayMode === 'summed'}
                onChange={() => setDisplayMode('summed')}
              />
              Single Line (Sum of All Accounts)
            </label>
          </div>

          <div className="select-buttons">
            <button type="button" onClick={handleSelectAll} className="button small">Select All</button>
            <button type="button" onClick={handleSelectNone} className="button small">Select None</button>
          </div>

          {filteredAccounts.map(account => (
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
              {displayMode === 'individual' ? (
                // Display individual lines for each account
                selectedAccounts.map((accountId, index) => {
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
                })
              ) : (
                // Display a single line for the sum of all accounts
                <Line
                  key="total"
                  type="monotone"
                  dataKey="total"
                  name="Total (All Selected Accounts)"
                  stroke="#8884d8"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              )}
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
