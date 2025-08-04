import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { budgetsApi } from '../../services/api';

const BudgetEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchBudget = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const budget = await budgetsApi.getBudget(id);

        // Initialize form with budget data
        setName(budget.name);
        setDescription(budget.description || '');
        setAmount(budget.amount.toString());

        // Format dates for the date inputs (YYYY-MM-DD)
        const formatDateForInput = (dateString: string | undefined) => {
          if (!dateString) return '';
          return new Date(dateString).toISOString().split('T')[0];
        };

        setStartDate(formatDateForInput(budget.start_date));
        setEndDate(formatDateForInput(budget.end_date));

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch budget details. Please try again later.');
        setLoading(false);
        console.error('Error fetching budget:', err);
      }
    };

    fetchBudget();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    if (!name) {
      setError('Budget name is required');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Budget amount must be greater than zero');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Convert dates to ISO format for the API
      const startDateISO = startDate ? new Date(startDate).toISOString() : undefined;
      // Only convert end date if it's provided
      const endDateISO = endDate ? new Date(endDate).toISOString() : undefined;

      await budgetsApi.updateBudget(id, {
        name,
        description: description || undefined, // Don't send empty string
        amount: parseFloat(amount),
        start_date: startDateISO,
        end_date: endDateISO,
      });

      // Redirect to budget view on success
      navigate(`/budgets/${id}`);
    } catch (err) {
      setError('Failed to update budget. Please try again.');
      console.error('Error updating budget:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading budget details...</div>;
  }

  if (error && !saving) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="budget-edit">
      <h1>Edit Budget</h1>

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
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => navigate(`/budgets/${id}`)}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default BudgetEdit;
