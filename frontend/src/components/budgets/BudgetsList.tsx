import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { budgetsApi, settingsApi } from '../../services/api';
import type { Budget, MonthlyBudgetStatus } from '../../services/api';

interface BudgetWithSpent extends Budget {
  spent: number;
}

const BudgetsList = () => {
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [unbudgetedSpent, setUnbudgetedSpent] = useState(0);
  const [unbudgetedSpentLoading, setUnbudgetedSpentLoading] = useState(true);
  const [monthlyStatus, setMonthlyStatus] = useState<MonthlyBudgetStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [isEditingForecast, setIsEditingForecast] = useState(false);
  const [forecastedIncome, setForecastedIncome] = useState<string>('');

  // Month navigation state
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1-12

  const changeMonth = (delta: number) => {
    const date = new Date(selectedYear, selectedMonth - 1 + delta, 1);
    setSelectedYear(date.getFullYear());
    setSelectedMonth(date.getMonth() + 1);
  };

  // Handle starting to edit forecasted income
  const handleEditForecast = () => {
    if (monthlyStatus) {
      setForecastedIncome(monthlyStatus.forecasted_monthly_income.toString());
      setIsEditingForecast(true);
    }
  };

  // Handle saving forecasted income
  const handleSaveForecast = async () => {
    try {
      const amount = parseFloat(forecastedIncome);
      if (isNaN(amount)) {
        alert('Please enter a valid number');
        return;
      }

      await settingsApi.updateForecastedMonthlyIncome(amount);

      // Refresh monthly status to show updated forecast
      const status = await budgetsApi.getMonthlyBudgetStatus(selectedYear, selectedMonth);
      setMonthlyStatus(status);

      setIsEditingForecast(false);
    } catch (err) {
      console.error('Error updating forecasted monthly income:', err);
      alert('Failed to update forecasted monthly income. Please try again.');
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setIsEditingForecast(false);
  };

  // Handle input change
  const handleForecastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForecastedIncome(e.target.value);
  };

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        setLoading(true);
        const data = await budgetsApi.getBudgets();

        // Fetch spent amount for each budget
        const budgetsWithSpent = await Promise.all(
          data.map(async (budget) => {
            const spent = await budgetsApi.getBudgetSpent(budget.id, selectedYear, selectedMonth);
            return { ...budget, spent };
          })
        );

        setBudgets(budgetsWithSpent);

        // Calculate total allocated amount
        const total = data.reduce((sum, budget) => sum + budget.amount, 0);
        setTotalAllocated(total);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch budgets. Please try again later.');
        setLoading(false);
        console.error('Error fetching budgets:', err);
      }
    };

    const fetchMonthlyStatus = async () => {
      try {
        setStatusLoading(true);
        const status = await budgetsApi.getMonthlyBudgetStatus(selectedYear, selectedMonth);
        setMonthlyStatus(status);
        setStatusLoading(false);
      } catch (err) {
        console.error('Error fetching monthly budget status:', err);
        setStatusLoading(false);
      }
    };

    const fetchUnbudgetedSpent = async () => {
      try {
        setUnbudgetedSpentLoading(true);
        const spent = await budgetsApi.getUnbudgetedSpent(selectedYear, selectedMonth);
        setUnbudgetedSpent(spent);
        setUnbudgetedSpentLoading(false);
      } catch (err) {
        console.error('Error fetching unbudgeted spent amount:', err);
        setUnbudgetedSpentLoading(false);
      }
    };

    fetchBudgets();
    fetchMonthlyStatus();
    fetchUnbudgetedSpent();
  }, [selectedYear, selectedMonth]);

  const handleDeleteBudget = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await budgetsApi.deleteBudget(id);
        setBudgets(budgets.filter(budget => budget.id !== id));

        // Recalculate total allocated amount
        const total = budgets
          .filter(budget => budget.id !== id)
          .reduce((sum, budget) => sum + budget.amount, 0);
        setTotalAllocated(total);
      } catch (err) {
        setError('Failed to delete budget. Please try again later.');
        console.error('Error deleting budget:', err);
      }
    }
  };

  if (loading) {
    return <div>Loading budgets...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  // Format date string to a more readable format
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Ongoing';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Format month name
  const getMonthName = (month: number) => {
    const date = new Date();
    date.setMonth(month - 1);
    return date.toLocaleString('default', { month: 'long' });
  };

  const goPrevMonth = () => changeMonth(-1);
  const goNextMonth = () => changeMonth(1);

  return (
    <div className="budgets-list">
      <div className="header-actions">
        <h1>Budgets</h1>
        <Link to="/budgets/new" className="button">Add New Budget</Link>
      </div>

      {/* Monthly Budget Status */}
      <div className="monthly-budget-status">
        <div className="month-nav" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="button small" onClick={goPrevMonth} aria-label="Previous month">◀</button>
          <h2 style={{ margin: '0' }}>Monthly Budget Status - {getMonthName(selectedMonth)} {selectedYear}</h2>
          <button className="button small" onClick={goNextMonth} aria-label="Next month">▶</button>
        </div>

        {statusLoading ? (
          <p>Loading monthly budget status...</p>
        ) : monthlyStatus ? (
          <div className="budget-status-grid">
            <div className="summary-box">
              <h3>Monthly Income</h3>
              {(() => {
                const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
                const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
                const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                const link = `/transactions?start_date=${startDate}&end_date=${endDate}&income=1`;
                return (
                  <Link to={link} className="monthly-income" title={`View income transactions for ${getMonthName(selectedMonth)} ${selectedYear}`}>
                    {monthlyStatus.incoming_funds.toFixed(2)}
                  </Link>
                );
              })()}
              <p className="subtitle">Incoming funds to on-budget accounts</p>
            </div>

            <div className="summary-box">
              <h3>Forecasted Monthly Income</h3>
              {isEditingForecast ? (
                <div className="edit-forecast">
                  <input
                    type="number"
                    value={forecastedIncome}
                    onChange={handleForecastChange}
                    className="forecast-input"
                    step="0.01"
                    min="0"
                  />
                  <div className="edit-actions">
                    <button onClick={handleSaveForecast} className="button small">Save</button>
                    <button onClick={handleCancelEdit} className="button small">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="forecasted-income">{monthlyStatus.forecasted_monthly_income.toFixed(2)}</p>
                  <div className="subtitle">
                    <span>Expected monthly income</span>
                    <button onClick={handleEditForecast} className="button small edit-button">Edit</button>
                  </div>
                </>
              )}
            </div>

            <div className="summary-box">
              <h3>Budgeted</h3>
              <p className="budgeted-amount">{monthlyStatus.budgeted_amount.toFixed(2)}</p>
              <p className="subtitle">Total allocated to budgets</p>
            </div>

            <div className="summary-box">
              <h3>Remaining to Budget</h3>
              <p className={`remaining-amount ${monthlyStatus.remaining_to_budget >= 0 ? 'positive' : 'negative'}`}>
                {monthlyStatus.remaining_to_budget.toFixed(2)}
              </p>
              <p className="subtitle">
                {monthlyStatus.remaining_to_budget >= 0
                  ? 'Available to budget'
                  : 'Exceeds monthly income'}
              </p>
            </div>
          </div>
        ) : (
          <p>Unable to load monthly budget status.</p>
        )}

        {/* Budget Progress Bar */}
        {monthlyStatus && (
          <div className="budget-progress">
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{
                width: `${monthlyStatus.incoming_funds > 0 ? Math.min(100, (monthlyStatus.budgeted_amount / monthlyStatus.incoming_funds) * 100) : 0}%`,
                backgroundColor: monthlyStatus.remaining_to_budget >= 0 ? '#4caf50' : '#f44336'
              }}
              ></div>
            </div>
            <p className="progress-text">
            {monthlyStatus.incoming_funds > 0 ? Math.round((monthlyStatus.budgeted_amount / monthlyStatus.incoming_funds) * 100) : 0}% of income budgeted
            </p>
          </div>
        )}
      </div>

      <div className="summary-section">
        <div className="summary-box">
          <h2>Total Allocated</h2>
          <p className="total-allocated">{totalAllocated.toFixed(2)}</p>
        </div>

        <div className="summary-box">
          <h2>Unbudgeted Spent</h2>
          {unbudgetedSpentLoading ? (
            <p>Loading...</p>
          ) : (
            (() => {
              const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
              const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
              const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
              const link = `/transactions?start_date=${startDate}&end_date=${endDate}&unbudgeted=1`;
              return (
                <Link to={link} className="unbudgeted-spent" title="View unbudgeted transactions for this month">
                  {unbudgetedSpent.toFixed(2)}
                </Link>
              );
            })()
          )}
          <p className="subtitle">Amount spent not part of any budget</p>
        </div>
      </div>

      {budgets.length === 0 ? (
        <p>No budgets found. Create your first budget to get started.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Amount</th>
              <th>Spent</th>
              <th>Remaining</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map(budget => (
              <tr key={budget.id}>
                <td>
                  <Link to={`/budgets/${budget.id}`}>{budget.name}</Link>
                </td>
                <td>{budget.amount.toFixed(2)}</td>
                <td>
                  {(() => {
                    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
                    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
                    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                    const link = `/transactions?start_date=${startDate}&end_date=${endDate}&budget_id=${budget.id}`;
                    return (
                      <Link to={link} title={`View transactions for ${budget.name} in ${getMonthName(selectedMonth)} ${selectedYear}`}>
                        {budget.spent.toFixed(2)}
                      </Link>
                    );
                  })()}
                </td>
                <td>{(budget.amount - budget.spent).toFixed(2)}</td>
                <td>{formatDate(budget.start_date)}</td>
                <td>{formatDate(budget.end_date)}</td>
                <td>
                  <div className="actions">
                    <Link to={`/budgets/${budget.id}`} className="button small">View</Link>
                    <Link to={`/budgets/${budget.id}/edit`} className="button small">Edit</Link>
                    <button
                      onClick={() => handleDeleteBudget(budget.id)}
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

export default BudgetsList;
