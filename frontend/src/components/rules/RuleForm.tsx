import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  accountsApi,
  budgetsApi,
  categoriesApi,
  rulesApi
} from '../../services/api';
import type {
  Rule,
  RuleCondition,
  RuleAction,
  ConditionType,
  ActionType,
  Account,
  Budget,
  Category
} from '../../services/api';

interface RuleFormProps {
  initialRule?: Rule;
  // Optional initial data for creating a new rule (used to prefill form when not editing)
  initialCreateData?: {
    name?: string;
    description?: string;
    is_active?: boolean;
    priority?: number;
    conditions?: RuleCondition[];
    actions?: RuleAction[];
  };
  isEditMode: boolean;
  onSubmit: (rule: {
    name: string;
    description?: string;
    is_active: boolean;
    priority?: number;
    conditions: RuleCondition[];
    actions: RuleAction[];
  }) => Promise<void>;
}

const RuleForm: React.FC<RuleFormProps> = ({ initialRule, initialCreateData, isEditMode, onSubmit }) => {
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [priority, setPriority] = useState('100');
  const [conditions, setConditions] = useState<RuleCondition[]>([]);
  const [actions, setActions] = useState<RuleAction[]>([]);

  // New condition/action state
  const [newConditionType, setNewConditionType] = useState<ConditionType>('description_contains');
  const [newConditionValue, setNewConditionValue] = useState('');
  const [newActionType, setNewActionType] = useState<ActionType>('set_category');
  const [newActionValue, setNewActionValue] = useState('');

  // Reference data for dropdowns
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test conditions state
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testTotal, setTestTotal] = useState<number | null>(null);
  const [testSample, setTestSample] = useState<RuleFormTransactionSample[]>([]);

  interface RuleFormTransactionSample {
    id: string;
    description: string;
    amount: number;
    transaction_date: string;
    destination_name?: string;
    category: string;
  }

  // Load initial data if in edit mode
  useEffect(() => {
    if (initialRule) {
      setName(initialRule.name);
      setDescription(initialRule.description || '');
      setIsActive(initialRule.is_active);
      setPriority(initialRule.priority.toString());
      setConditions(initialRule.conditions);
      setActions(initialRule.actions);
    }
  }, [initialRule]);

  // Load initial data for create mode if provided
  useEffect(() => {
    if (!initialRule && !isEditMode && initialCreateData) {
      if (initialCreateData.name !== undefined) setName(initialCreateData.name);
      if (initialCreateData.description !== undefined) setDescription(initialCreateData.description);
      if (initialCreateData.is_active !== undefined) setIsActive(initialCreateData.is_active);
      if (initialCreateData.priority !== undefined) setPriority(String(initialCreateData.priority));
      if (initialCreateData.conditions !== undefined) setConditions(initialCreateData.conditions);
      if (initialCreateData.actions !== undefined) setActions(initialCreateData.actions);
    }
  }, [initialCreateData, isEditMode, initialRule]);

  // Load reference data for dropdowns
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [accountsData, budgetsData, categoriesData] = await Promise.all([
          accountsApi.getAccounts(),
          budgetsApi.getActiveBudgets(),
          categoriesApi.getCategories()
        ]);

        setAccounts(accountsData);
        setBudgets(budgetsData);
        setCategories(categoriesData);
      } catch (err) {
        console.error('Error fetching reference data:', err);
        setError('Failed to load reference data. Some dropdown options may be unavailable.');
      }
    };

    fetchReferenceData();
  }, []);

  // Add a new condition
  const handleAddCondition = () => {
    if (!newConditionValue.trim()) {
      setError('Condition value cannot be empty');
      return;
    }

    const newCondition: RuleCondition = {
      condition_type: newConditionType,
      value: newConditionValue.trim()
    };

    setConditions([...conditions, newCondition]);
    setNewConditionValue('');
    setError(null);
  };

  // Remove a condition
  const handleRemoveCondition = (index: number) => {
    const updatedConditions = [...conditions];
    updatedConditions.splice(index, 1);
    setConditions(updatedConditions);
  };

  // Test conditions handler
  const handleTestConditions = async () => {
    try {
      setTestLoading(true);
      setTestError(null);
      setTestTotal(null);
      setTestSample([]);

      const res = await rulesApi.testConditions(conditions);
      setTestTotal(res.total_matches);
      // Map to a small subset of fields for display
      const sample = res.sample.map(tx => ({
        id: tx.id,
        description: tx.description,
        amount: tx.amount,
        transaction_date: tx.transaction_date,
        destination_name: tx.destination_name,
        category: tx.category,
      }));
      setTestSample(sample);
    } catch (err) {
      console.error('Error testing conditions:', err);
      setTestError('Failed to test conditions. Please try again.');
    } finally {
      setTestLoading(false);
    }
  };

  // Add a new action
  const handleAddAction = () => {
    if (!newActionValue.trim()) {
      setError('Action value cannot be empty');
      return;
    }

    const newAction: RuleAction = {
      action_type: newActionType,
      value: newActionValue.trim()
    };

    setActions([...actions, newAction]);
    setNewActionValue('');
    setError(null);
  };

  // Remove an action
  const handleRemoveAction = (index: number) => {
    const updatedActions = [...actions];
    updatedActions.splice(index, 1);
    setActions(updatedActions);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Rule name is required');
      return;
    }

    if (conditions.length === 0) {
      setError('At least one condition is required');
      return;
    }

    if (actions.length === 0) {
      setError('At least one action is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        is_active: isActive,
        priority: parseInt(priority, 10),
        conditions,
        actions
      });

      // Navigate back to rules list on success
      navigate('/rules');
    } catch (err) {
      console.error('Error saving rule:', err);
      setError('Failed to save rule. Please try again later.');
      setLoading(false);
    }
  };

  // Helper function to get human-readable condition type
  const getConditionTypeLabel = (type: ConditionType): string => {
    switch (type) {
      case 'description_contains':
        return 'Description contains';
      case 'description_starts_with':
        return 'Description starts with';
      case 'description_equals':
        return 'Description equals';
      case 'source_account_equals':
        return 'Source account equals';
      case 'destination_account_equals':
        return 'Destination account equals';
      case 'destination_name_contains':
        return 'Destination name contains';
      case 'destination_name_equals':
        return 'Destination name equals';
      case 'amount_greater_than':
        return 'Amount greater than';
      case 'amount_less_than':
        return 'Amount less than';
      case 'amount_equals':
        return 'Amount equals';
      default:
        return type;
    }
  };

  // Helper function to get human-readable action type
  const getActionTypeLabel = (type: ActionType): string => {
    switch (type) {
      case 'set_category':
        return 'Set category to';
      case 'set_budget':
        return 'Set budget to';
      case 'set_description':
        return 'Set description to';
      case 'set_destination_name':
        return 'Set destination name to';
      default:
        return type;
    }
  };

  // Render value input based on condition type
  const renderConditionValueInput = () => {
    switch (newConditionType) {
      case 'source_account_equals':
      case 'destination_account_equals':
        return (
          <select
            value={newConditionValue}
            onChange={(e) => setNewConditionValue(e.target.value)}
          >
            <option value="">Select Account</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        );

      case 'amount_greater_than':
      case 'amount_less_than':
      case 'amount_equals':
        return (
          <input
            type="number"
            step="0.01"
            value={newConditionValue}
            onChange={(e) => setNewConditionValue(e.target.value)}
            placeholder="Enter amount"
          />
        );

      default:
        return (
          <input
            type="text"
            value={newConditionValue}
            onChange={(e) => setNewConditionValue(e.target.value)}
            placeholder="Enter value"
          />
        );
    }
  };

  // Render value input based on action type
  const renderActionValueInput = () => {
    switch (newActionType) {
      case 'set_category':
        return (
          <select
            value={newActionValue}
            onChange={(e) => setNewActionValue(e.target.value)}
          >
            <option value="">Select Category</option>
            {categories.map(category => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        );

      case 'set_budget':
        return (
          <select
            value={newActionValue}
            onChange={(e) => setNewActionValue(e.target.value)}
          >
            <option value="">Select Budget</option>
            {budgets.map(budget => (
              <option key={budget.id} value={budget.id}>
                {budget.name}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type="text"
            value={newActionValue}
            onChange={(e) => setNewActionValue(e.target.value)}
            placeholder="Enter value"
          />
        );
    }
  };

  return (
    <div className="rule-form">
      <h1>{isEditMode ? 'Edit Rule' : 'Create New Rule'}</h1>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="name">Rule Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter rule name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter rule description"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <input
            type="number"
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            placeholder="Enter priority (lower numbers have higher priority)"
            required
          />
          <small>Lower numbers have higher priority</small>
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Rule is active
          </label>
        </div>

        <div className="rule-section">
          <h2>Conditions</h2>
          <p className="section-description">
            All of these conditions must match for the rule to be applied.
          </p>

          <div className="conditions-list">
            {conditions.length === 0 ? (
              <p className="empty-message">No conditions defined yet.</p>
            ) : (
              <ul>
                {conditions.map((condition, index) => (
                  <li key={index} className="condition-item">
                    <span className="condition-type">{getConditionTypeLabel(condition.condition_type)}</span>
                    <span className="condition-value">{condition.value}</span>
                    <button
                      type="button"
                      className="button small danger"
                      onClick={() => handleRemoveCondition(index)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="add-condition">
            <h3>Add Condition</h3>
            <div className="condition-form">
              <select
                value={newConditionType}
                onChange={(e) => setNewConditionType(e.target.value as ConditionType)}
              >
                <option value="description_contains">Description contains</option>
                <option value="description_starts_with">Description starts with</option>
                <option value="description_equals">Description equals</option>
                <option value="source_account_equals">Source account equals</option>
                <option value="destination_account_equals">Destination account equals</option>
                <option value="destination_name_contains">Destination name contains</option>
                <option value="destination_name_equals">Destination name equals</option>
                <option value="amount_greater_than">Amount greater than</option>
                <option value="amount_less_than">Amount less than</option>
                <option value="amount_equals">Amount equals</option>
              </select>

              {renderConditionValueInput()}

              <button
                type="button"
                className="button"
                onClick={handleAddCondition}
              >
                Add Condition
              </button>
            </div>
          </div>
        </div>

        <div className="rule-section">
          <h2>Actions</h2>
          <p className="section-description">
            These actions will be applied when all conditions match.
          </p>

          <div className="actions-list">
            {actions.length === 0 ? (
              <p className="empty-message">No actions defined yet.</p>
            ) : (
              <ul>
                {actions.map((action, index) => (
                  <li key={index} className="action-item">
                    <span className="action-type">{getActionTypeLabel(action.action_type)}</span>
                    <span className="action-value">{action.value}</span>
                    <button
                      type="button"
                      className="button small danger"
                      onClick={() => handleRemoveAction(index)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="add-action">
            <h3>Add Action</h3>
            <div className="action-form">
              <select
                value={newActionType}
                onChange={(e) => setNewActionType(e.target.value as ActionType)}
              >
                <option value="set_category">Set category to</option>
                <option value="set_budget">Set budget to</option>
                <option value="set_description">Set description to</option>
                <option value="set_destination_name">Set destination name to</option>
              </select>

              {renderActionValueInput()}

              <button
                type="button"
                className="button"
                onClick={handleAddAction}
              >
                Add Action
              </button>
            </div>
          </div>
        </div>

        {/* Test Conditions Section */}
        <div className="rule-section">
          <h2>Test Conditions</h2>
          <p className="section-description">See how many transactions would match these conditions and preview a sample of the first 100 (most recent first).</p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <button
              type="button"
              className="button"
              onClick={handleTestConditions}
              disabled={testLoading || conditions.length === 0}
            >
              {testLoading ? 'Testing…' : 'Test Conditions'}
            </button>
            {conditions.length === 0 && (
              <small>Add at least one condition to enable testing.</small>
            )}
          </div>
          {testError && <div className="error">{testError}</div>}
          {typeof testTotal === 'number' && (
            <div className="info" style={{ marginBottom: '0.5rem' }}>
              Total matches: <strong>{testTotal}</strong>
            </div>
          )}
          {testSample.length > 0 && (
            <div className="sample-list" style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Destination</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {testSample.map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.transaction_date).toLocaleDateString()}</td>
                      <td>{tx.description}</td>
                      <td>{tx.destination_name || ''}</td>
                      <td>{tx.category}</td>
                      <td style={{ textAlign: 'right' }}>{tx.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="button primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : (isEditMode ? 'Update Rule' : 'Create Rule')}
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => navigate('/rules')}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default RuleForm;
