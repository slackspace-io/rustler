import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { budgetsApi, settingsApi, budgetGroupsApi } from '../../services/api';
import type { Budget, MonthlyBudgetStatus, CategoryGroup as BudgetGroup } from '../../services/api';

interface BudgetWithSpent extends Budget {
  spent: number;
}

const BudgetsList = () => {
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [budgetGroups, setBudgetGroups] = useState<BudgetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [unbudgetedSpent, setUnbudgetedSpent] = useState(0);
  const [unbudgetedSpentLoading, setUnbudgetedSpentLoading] = useState(true);
  const [monthlyStatus, setMonthlyStatus] = useState<MonthlyBudgetStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [isEditingForecast, setIsEditingForecast] = useState(false);
  const [forecastedIncome, setForecastedIncome] = useState<string>('');

  // New budget group form state
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupDescription, setNewGroupDescription] = useState<string>('');
  const [creatingGroup, setCreatingGroup] = useState<boolean>(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);

  // Drag & Drop state for moving budgets between groups
  const [draggedBudget, setDraggedBudget] = useState<BudgetWithSpent | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null); // null => Ungrouped
  const [isUpdatingGroup, setIsUpdatingGroup] = useState<boolean>(false);

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

    const fetchBudgetGroups = async () => {
      try {
        setLoadingGroups(true);
        const groups = await budgetGroupsApi.getBudgetGroups();
        setBudgetGroups(groups);
        setLoadingGroups(false);
      } catch (err) {
        console.error('Error fetching budget groups:', err);
        setLoadingGroups(false);
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
    fetchBudgetGroups();
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

  // Create a new budget group from this page
  const handleCreateBudgetGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!newGroupName.trim()) {
      setCreateGroupError('Group name is required');
      return;
    }

    try {
      setCreatingGroup(true);
      setCreateGroupError(null);

      const created = await budgetGroupsApi.createBudgetGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
      });

      // Append to local group list
      setBudgetGroups(prev => [...prev, created]);

      // Reset form
      setNewGroupName('');
      setNewGroupDescription('');
    } catch (err) {
      console.error('Error creating budget group:', err);
      setCreateGroupError('Failed to create budget group. Please try again.');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Drag & Drop handlers for moving budgets between groups
  const handleBudgetDragStart = (budget: BudgetWithSpent, e: React.DragEvent<HTMLTableRowElement>) => {
    setDraggedBudget(budget);
    e.dataTransfer.setData('text/plain', budget.id);
    e.dataTransfer.setData('type', 'budget');
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget.classList) {
      e.currentTarget.classList.add('dragging');
    }
  };

  const handleBudgetDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    if (e.currentTarget.classList) {
      e.currentTarget.classList.remove('dragging');
    }
    setDraggedBudget(null);
    setDragOverGroupId(null);
  };

  const handleGroupDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleGroupDragEnter = (groupId: string | null, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverGroupId(groupId);
  };

  const handleGroupDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setDragOverGroupId(null);
  };

  const handleGroupDrop = async (groupId: string | null, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverGroupId(null);
    const dataType = e.dataTransfer.getData('type');
    if (dataType !== 'budget') return;
    const budgetId = e.dataTransfer.getData('text/plain');
    if (!budgetId || !draggedBudget) return;
    if ((draggedBudget.group_id || null) === groupId) return;
    await updateBudgetGroup(budgetId, groupId);
  };

  const updateBudgetGroup = async (budgetId: string, groupId: string | null) => {
    try {
      setIsUpdatingGroup(true);
      // Update backend
      const updated = await budgetsApi.updateBudget(budgetId, {
        group_id: groupId || undefined,
      });
      // Update local budgets state
      setBudgets(prev => prev.map(b => (b.id === budgetId ? { ...b, group_id: updated.group_id } : b)));
    } catch (err) {
      console.error('Error updating budget group:', err);
      alert('Failed to move budget to the selected group.');
    } finally {
      setIsUpdatingGroup(false);
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

  // Precompute ungrouped budgets for reuse
  const ungroupedBudgets = budgets.filter(b => !b.group_id);
  const ungroupedAmount = ungroupedBudgets.reduce((sum, b) => sum + b.amount, 0);
  const ungroupedSpent = ungroupedBudgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const ungroupedRemaining = ungroupedAmount - ungroupedSpent;

  return (
    <div className="budgets-list">
      <div className="header-actions">
        <h1>Budgets</h1>
        <Link to="/budgets/new" className="button">Add New Budget</Link>
      </div>

      {/* Quick create Budget Group */}
      <div className="new-budget-group" style={{ margin: '16px 0' }}>
        <h2 style={{ marginTop: 0 }}>Create Budget Group</h2>
        {createGroupError && <div className="error">{createGroupError}</div>}
        <form onSubmit={handleCreateBudgetGroup} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newGroupDescription}
            onChange={(e) => setNewGroupDescription(e.target.value)}
          />
          <button type="submit" className="button" disabled={creatingGroup}>
            {creatingGroup ? 'Creating...' : 'Create Group'}
          </button>
        </form>
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

      {/* Loading overlay for drag-and-drop moves */}
      {isUpdatingGroup && (
        <div className="drag-loading-overlay">
          <div className="drag-loading-message">Moving budget to new group...</div>
        </div>
      )}

      {(loading || loadingGroups) ? (
        <div>Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <p>No budgets found. Create your first budget to get started.</p>
      ) : (
        <div className="budgets-grouped">
          {/* Ungrouped budgets */}
          <div
            className={`budget-group ${dragOverGroupId === null ? 'drag-over' : ''}`}
            onDragOver={handleGroupDragOver}
            onDragEnter={(e) => handleGroupDragEnter(null, e)}
            onDragLeave={handleGroupDragLeave}
            onDrop={(e) => handleGroupDrop(null, e)}
          >
            <div className="group-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>Ungrouped Budgets</h2>
              <div className="group-metrics" style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                <span className="group-total">Total: {ungroupedAmount.toFixed(2)}</span>
                <span className="group-spent">Spent: {ungroupedSpent.toFixed(2)}</span>
                <span className={`remaining-amount ${ungroupedRemaining >= 0 ? 'positive' : 'negative'}`}>Remaining: {ungroupedRemaining.toFixed(2)}</span>
              </div>
            </div>
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
                {budgets.filter(b => !b.group_id).length === 0 ? (
                  <tr><td colSpan={7}>No ungrouped budgets</td></tr>
                ) : (
                  budgets.filter(b => !b.group_id).map(budget => (
                    <tr
                      key={budget.id}
                      draggable
                      onDragStart={(e) => handleBudgetDragStart(budget, e)}
                      onDragEnd={handleBudgetDragEnd}
                      className={draggedBudget?.id === budget.id ? 'dragging' : ''}
                    >
                      <td><Link to={`/budgets/${budget.id}`}>{budget.name}</Link></td>
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
                          <button onClick={() => handleDeleteBudget(budget.id)} className="button small danger">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Budgets grouped by budget groups */}
          {budgetGroups.map(group => {
            const groupBudgets = budgets.filter(b => b.group_id === group.id);
            const groupAmount = groupBudgets.reduce((sum, b) => sum + b.amount, 0);
            const groupSpent = groupBudgets.reduce((sum, b) => sum + (b.spent || 0), 0);
            const groupRemaining = groupAmount - groupSpent;
            return (
              <div
                key={group.id}
                className={`budget-group ${dragOverGroupId === group.id ? 'drag-over' : ''}`}
                onDragOver={handleGroupDragOver}
                onDragEnter={(e) => handleGroupDragEnter(group.id, e)}
                onDragLeave={handleGroupDragLeave}
                onDrop={(e) => handleGroupDrop(group.id, e)}
              >
                <div className="group-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0 }}>{group.name}</h2>
                  <div className="group-metrics" style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                    <span className="group-total">Total: {groupAmount.toFixed(2)}</span>
                    <span className="group-spent">Spent: {groupSpent.toFixed(2)}</span>
                    <span className={`remaining-amount ${groupRemaining >= 0 ? 'positive' : 'negative'}`}>Remaining: {groupRemaining.toFixed(2)}</span>
                  </div>
                </div>
                {group.description && <p className="group-description">{group.description}</p>}
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
                    {groupBudgets.length === 0 ? (
                      <tr><td colSpan={7}>No budgets in this group</td></tr>
                    ) : (
                      groupBudgets.map(budget => (
                        <tr
                          key={budget.id}
                          draggable
                          onDragStart={(e) => handleBudgetDragStart(budget, e)}
                          onDragEnd={handleBudgetDragEnd}
                          className={draggedBudget?.id === budget.id ? 'dragging' : ''}
                        >
                          <td><Link to={`/budgets/${budget.id}`}>{budget.name}</Link></td>
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
                              <button onClick={() => handleDeleteBudget(budget.id)} className="button small danger">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BudgetsList;
