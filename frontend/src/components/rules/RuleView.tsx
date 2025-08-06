import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { rulesApi } from '../../services/api';
import type { Rule, ConditionType, ActionType } from '../../services/api';

const RuleView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rule, setRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRule = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await rulesApi.getRule(id);
        setRule(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching rule:', err);
        setError('Failed to load rule. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRule();
  }, [id]);

  const handleToggleActive = async () => {
    if (!rule) return;

    try {
      const updatedRule = await rulesApi.updateRule(rule.id, {
        is_active: !rule.is_active
      });

      setRule(updatedRule);
    } catch (err) {
      console.error('Error toggling rule active state:', err);
      setError('Failed to update rule. Please try again later.');
    }
  };

  const handleDelete = async () => {
    if (!rule) return;

    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await rulesApi.deleteRule(rule.id);
        navigate('/rules');
      } catch (err) {
        console.error('Error deleting rule:', err);
        setError('Failed to delete rule. Please try again later.');
      }
    }
  };

  // Helper function to get human-readable condition type
  const getConditionTypeLabel = (type: ConditionType): string => {
    switch (type) {
      case 'description_contains':
        return 'Description contains';
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

  if (loading) {
    return <div>Loading rule...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!rule) {
    return <div className="error">Rule not found</div>;
  }

  return (
    <div className="rule-view">
      <div className="header-with-button">
        <h1>{rule.name}</h1>
        <div className="button-group">
          <button
            onClick={handleToggleActive}
            className={`button ${!rule.is_active ? 'primary' : 'secondary'}`}
          >
            {rule.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <Link to={`/rules/${rule.id}/edit`} className="button">
            Edit
          </Link>
          <button onClick={handleDelete} className="button danger">
            Delete
          </button>
        </div>
      </div>

      <div className="rule-details">
        <div className="detail-row">
          <div className="detail-label">Description</div>
          <div className="detail-value">{rule.description || '-'}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Priority</div>
          <div className="detail-value">{rule.priority}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Status</div>
          <div className="detail-value">
            <span className={`status ${rule.is_active ? 'active' : 'inactive'}`}>
              {rule.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Created</div>
          <div className="detail-value">{new Date(rule.created_at).toLocaleString()}</div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Last Updated</div>
          <div className="detail-value">{new Date(rule.updated_at).toLocaleString()}</div>
        </div>
      </div>

      <div className="rule-sections">
        <div className="rule-section">
          <h2>Conditions</h2>
          <p className="section-description">
            All of these conditions must match for the rule to be applied.
          </p>

          {rule.conditions.length === 0 ? (
            <p className="empty-message">No conditions defined.</p>
          ) : (
            <ul className="conditions-list">
              {rule.conditions.map((condition, index) => (
                <li key={index} className="condition-item">
                  <span className="condition-type">{getConditionTypeLabel(condition.condition_type)}</span>
                  <span className="condition-value">{condition.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rule-section">
          <h2>Actions</h2>
          <p className="section-description">
            These actions will be applied when all conditions match.
          </p>

          {rule.actions.length === 0 ? (
            <p className="empty-message">No actions defined.</p>
          ) : (
            <ul className="actions-list">
              {rule.actions.map((action, index) => (
                <li key={index} className="action-item">
                  <span className="action-type">{getActionTypeLabel(action.action_type)}</span>
                  <span className="action-value">{action.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="button-row">
        <Link to="/rules" className="button secondary">
          Back to Rules
        </Link>
      </div>
    </div>
  );
};

export default RuleView;
