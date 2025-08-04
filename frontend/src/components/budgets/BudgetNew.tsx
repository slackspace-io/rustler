import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { budgetsApi } from '../../services/api';

const BudgetNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Today's date in YYYY-MM-DD format
  const [endDate, setEndDate] = useState(''); // Empty string for no end date (ongoing budget)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      setError('Budget name is required');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Budget amount must be greater than zero');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convert dates to ISO format for the API
      const startDateISO = new Date(startDate).toISOString();
      // Only convert end date if it's provided
      const endDateISO = endDate ? new Date(endDate).toISOString() : undefined;

      await budgetsApi.createBudget({
        name,
        description: description || undefined, // Don't send empty string
        amount: parseFloat(amount),
        start_date: startDateISO,
        end_date: endDateISO,
      });

      // Redirect to budgets list on success
      navigate('/budgets');
    } catch (err) {
      setError('Failed to create budget. Please try again.');
      console.error('Error creating budget:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="budget-new">
      <h1>Create New Budget</h1>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Budget Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Monthly Groceries"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details about this budget"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">Budget Amount</label>
          <div className="input-with-prefix">
            <span className="prefix">$</span>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="start-date">Start Date</label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="end-date">End Date (Optional)</label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <small className="form-text">Leave blank for ongoing budgets</small>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Budget'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => navigate('/budgets')}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default BudgetNew;
