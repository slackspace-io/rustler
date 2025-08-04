import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { budgetsApi } from '../../services/api';
import type { Budget } from '../../services/api';

const BudgetsList = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalAllocated, setTotalAllocated] = useState(0);

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        setLoading(true);
        const data = await budgetsApi.getBudgets();
        setBudgets(data);

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

    fetchBudgets();
  }, []);

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

  return (
    <div className="budgets-list">
      <div className="header-actions">
        <h1>Budgets</h1>
        <Link to="/budgets/new" className="button">Add New Budget</Link>
      </div>

      <div className="summary-box">
        <h2>Total Allocated</h2>
        <p className="total-allocated">{totalAllocated.toFixed(2)}</p>
      </div>

      {budgets.length === 0 ? (
        <p>No budgets found. Create your first budget to get started.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Amount</th>
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
