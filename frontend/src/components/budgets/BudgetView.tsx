import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { budgetsApi } from '../../services/api';
import type { Transaction } from '../../services/api';
import type { Budget } from '../../services/api';

const BudgetView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [spent, setSpent] = useState<number>(0);
  const [remaining, setRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);

        // Fetch budget details
        const budgetData = await budgetsApi.getBudget(id);
        setBudget(budgetData);

        // Fetch transactions for the month linked to this budget
        try {
          const txs = await budgetsApi.getBudgetTransactionsForMonth(id);
          setTransactions(txs);
        } catch (e) {
          console.error('Error fetching budget transactions:', e);
        }

        // Fetch spent amount
        const spentAmount = await budgetsApi.getBudgetSpent(id);
        setSpent(spentAmount);

        // Fetch remaining amount
        const remainingAmount = await budgetsApi.getBudgetRemaining(id);
        setRemaining(remainingAmount);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch budget details. Please try again later.');
        setLoading(false);
        console.error('Error fetching budget details:', err);
      }
    };

    fetchData();
  }, [id]);

  const handleDeleteBudget = async () => {
    if (!budget || !id) return;

    if (window.confirm(`Are you sure you want to delete the budget "${budget.name}"?`)) {
      try {
        await budgetsApi.deleteBudget(id);
        navigate('/budgets');
      } catch (err) {
        setError('Failed to delete budget. Please try again later.');
        console.error('Error deleting budget:', err);
      }
    }
  };

  // Format date string to a more readable format
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Ongoing';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div>Loading budget details...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!budget) {
    return <div className="error">Budget not found</div>;
  }

  return (
    <div className="budget-view">
      <div className="header-actions">
        <h1>{budget.name}</h1>
        <div>
          <Link to={`/budgets/${id}/edit`} className="button">Edit Budget</Link>
          <button onClick={handleDeleteBudget} className="button danger">Delete Budget</button>
        </div>
      </div>

      <div className="budget-details">
        <div className="summary-boxes">
          <div className="summary-box">
            <h2>Total Budget</h2>
            <p className="total-amount">{budget.amount.toFixed(2)}</p>
          </div>

          <div className="summary-box">
            <h2>Spent</h2>
            <p className="spent-amount">{spent.toFixed(2)}</p>
          </div>

          <div className="summary-box">
            <h2>Remaining</h2>
            <p className={`remaining-amount ${remaining >= 0 ? 'positive' : 'negative'}`}>
              {remaining.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="budget-info">
          <h2>Budget Details</h2>
          <p><strong>Name:</strong> {budget.name}</p>
          <p><strong>Description:</strong> {budget.description || 'No description provided'}</p>
          <p><strong>Amount:</strong> {budget.amount.toFixed(2)}</p>
          <p><strong>Start Date:</strong> {formatDate(budget.start_date)}</p>
          <p><strong>End Date:</strong> {formatDate(budget.end_date)}</p>
          <p><strong>Created:</strong> {new Date(budget.created_at).toLocaleDateString()}</p>
          <p><strong>Last Updated:</strong> {new Date(budget.updated_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="budget-progress">
        <h2>Budget Progress</h2>
        <div className="progress-bar-container">
          <div
            className="progress-bar"
            style={{
              width: `${Math.min(100, (spent / budget.amount) * 100)}%`,
              backgroundColor: remaining >= 0 ? '#4caf50' : '#f44336'
            }}
          ></div>
        </div>
        <p className="progress-text">
          {Math.round((spent / budget.amount) * 100)}% used
          ({remaining >= 0 ? `${Math.round((remaining / budget.amount) * 100)}% remaining` : 'Over budget'})
        </p>
      </div>

      <div className="budget-transactions">
        <h2>Transactions for {new Date(budget.start_date).toLocaleString(undefined, { month: 'long', year: 'numeric' })}</h2>
        {transactions.length === 0 ? (
          <p className="note">No transactions found for this budget in the selected month.</p>
        ) : (
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Destination</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{new Date(tx.transaction_date).toLocaleDateString()}</td>
                  <td>{tx.description}</td>
                  <td>{tx.destination_name || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{tx.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BudgetView;
