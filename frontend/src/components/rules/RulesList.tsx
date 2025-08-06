import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { rulesApi } from '../../services/api';
import type { Rule } from '../../services/api';

const RulesList = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningRules, setRunningRules] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRules = async () => {
      try {
        setLoading(true);
        const data = await rulesApi.getRules();
        setRules(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching rules:', err);
        setError('Failed to load rules. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, []);

  const handleToggleActive = async (rule: Rule) => {
    try {
      const updatedRule = await rulesApi.updateRule(rule.id, {
        is_active: !rule.is_active
      });

      // Update the rules list with the updated rule
      setRules(prevRules =>
        prevRules.map(r => r.id === updatedRule.id ? updatedRule : r)
      );
    } catch (err) {
      console.error('Error toggling rule active state:', err);
      setError('Failed to update rule. Please try again later.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      try {
        await rulesApi.deleteRule(id);
        // Remove the deleted rule from the list
        setRules(prevRules => prevRules.filter(rule => rule.id !== id));
      } catch (err) {
        console.error('Error deleting rule:', err);
        setError('Failed to delete rule. Please try again later.');
      }
    }
  };

  const handleRunAllRules = async () => {
    try {
      setRunningRules(true);
      setError(null);
      setSuccessMessage(null);

      const result = await rulesApi.runAllRules();

      setSuccessMessage(result.message);
    } catch (err) {
      console.error('Error running all rules:', err);
      setError('Failed to run rules. Please try again later.');
    } finally {
      setRunningRules(false);
    }
  };

  const handleRunRule = async (id: string, ruleName: string) => {
    try {
      setRunningRules(true);
      setError(null);
      setSuccessMessage(null);

      const result = await rulesApi.runRule(id);

      setSuccessMessage(`${result.message} for rule "${ruleName}"`);
    } catch (err) {
      console.error(`Error running rule ${id}:`, err);
      setError(`Failed to run rule "${ruleName}". Please try again later.`);
    } finally {
      setRunningRules(false);
    }
  };

  if (loading) {
    return <div>Loading rules...</div>;
  }

  return (
    <div className="rules-list">
      <div className="header-with-button">
        <h1>Transaction Rules</h1>
        <div className="button-group">
          <button
            onClick={handleRunAllRules}
            className="button secondary"
            disabled={runningRules || rules.length === 0}
          >
            {runningRules ? 'Running Rules...' : 'Run All Rules'}
          </button>
          <Link to="/rules/new" className="button">Create New Rule</Link>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {successMessage && <div className="success">{successMessage}</div>}

      {rules.length === 0 ? (
        <div className="empty-state">
          <p>No rules found. Create your first rule to automate transaction categorization and more.</p>
          <button onClick={() => navigate('/rules/new')} className="button">
            Create Rule
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Conditions</th>
                <th>Actions</th>
                <th>Operations</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule.id} className={!rule.is_active ? 'inactive' : ''}>
                  <td>
                    <Link to={`/rules/${rule.id}`}>{rule.name}</Link>
                  </td>
                  <td>{rule.description || '-'}</td>
                  <td>{rule.priority}</td>
                  <td>
                    <span className={`status ${rule.is_active ? 'active' : 'inactive'}`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{rule.conditions.length} condition(s)</td>
                  <td>{rule.actions.length} action(s)</td>
                  <td className="actions">
                    <button
                      onClick={() => handleToggleActive(rule)}
                      className="button small"
                      title={rule.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {rule.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    {rule.is_active && (
                      <button
                        onClick={() => handleRunRule(rule.id, rule.name)}
                        className="button small secondary"
                        disabled={runningRules}
                        title="Run this rule on all transactions"
                      >
                        {runningRules ? 'Running...' : 'Run Rule'}
                      </button>
                    )}
                    <Link to={`/rules/${rule.id}/edit`} className="button small">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="button small danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rules-help">
        <h2>About Transaction Rules</h2>
        <p>
          Rules automatically apply actions to transactions when certain conditions are met.
          For example, you can automatically categorize all transactions from a specific vendor.
        </p>
        <h3>How Rules Work</h3>
        <ul>
          <li><strong>Priority:</strong> Rules are applied in order of priority (lower numbers have higher priority).</li>
          <li><strong>Conditions:</strong> All conditions must match for a rule to be applied.</li>
          <li><strong>Actions:</strong> When a rule matches, all of its actions are applied to the transaction.</li>
          <li><strong>When Rules Run:</strong> Rules are automatically applied when transactions are created or updated. You can also manually run rules using the "Run All Rules" button or the "Run Rule" button for a specific rule.</li>
        </ul>
      </div>
    </div>
  );
};

export default RulesList;
