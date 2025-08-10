import { useState, useEffect } from 'react';
import type React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { rulesApi, ruleGroupsApi } from '../../services/api';
import type { Rule, RuleGroup } from '../../services/api';
import './Rules.css';

const RulesList = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningRules, setRunningRules] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // Rule groups state
  const [ruleGroups, setRuleGroups] = useState<RuleGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Drag-and-drop state for grouped visualization
  const [draggedRule, setDraggedRule] = useState<Rule | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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

    const fetchGroups = async () => {
      try {
        setLoadingGroups(true);
        const groups = await ruleGroupsApi.getRuleGroups();
        setRuleGroups(groups);
        setGroupsError(null);
      } catch (err) {
        console.error('Error fetching rule groups:', err);
        setGroupsError('Failed to load rule groups.');
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchRules();
    fetchGroups();
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

  const handleChangeRuleGroup = async (rule: Rule, newGroupId: string) => {
    try {
      const updated = await rulesApi.updateRule(rule.id, {
        group_id: newGroupId || null,
      });
      setRules(prev => prev.map(r => (r.id === rule.id ? updated : r)));
    } catch (err) {
      console.error('Error updating rule group:', err);
      setError('Failed to update rule group.');
    }
  };

  // Helpers for grouped visualization and drag-and-drop

  const handleDragStart = (rule: Rule) => (e: React.DragEvent<HTMLLIElement>) => {
    setDraggedRule(rule);
    try {
      e.dataTransfer.setData('text/plain', rule.id);
    } catch {
      return; // ignore setData failures in some browsers/environments
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const rulesForGroup = (groupId: string | null) => {
    return rules.filter(r => (r.group_id ?? null) === (groupId ?? null));
  };

  const handleDragOverGroup = (groupId: string | null) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverGroupId(groupId);
  };

  const handleDragLeaveGroup = () => () => {
    setDragOverGroupId(null);
  };

  const handleDropOnGroup = (groupId: string | null) => async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedRule) return;
    setIsUpdatingGroup(true);
    try {
      await handleChangeRuleGroup(draggedRule, groupId ?? '');
    } finally {
      setIsUpdatingGroup(false);
      setDraggedRule(null);
      setDragOverGroupId(null);
    }
  };

  const toggleGroupCollapsed = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
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

      <div className="panel">
        <div className="header-with-button">
          <h2>Rule Groups</h2>
        </div>
        {groupsError && <div className="error">{groupsError}</div>}
        {loadingGroups ? (
          <div>Loading groups...</div>
        ) : (
          <>
            {ruleGroups.length === 0 ? (
              <div className="empty-state">
                <p>No rule groups yet.</p>
              </div>
            ) : (
              <ul className="list">
                {ruleGroups.map(group => (
                  <li key={group.id} className="list-item">
                    <div className="list-item-content">
                      <div className="title">{group.name}</div>
                      <div className="subtitle">{group.description || ''}</div>
                    </div>
                    <div className="actions">
                      <button
                        className="button small danger"
                        onClick={async () => {
                          if (window.confirm(`Delete group "${group.name}"?`)) {
                            try {
                              await ruleGroupsApi.deleteRuleGroup(group.id);
                              setRuleGroups(prev => prev.filter(g => g.id !== group.id));
                              // Clear group assignment for rules in this group locally
                              setRules(prev => prev.map(r => r.group_id === group.id ? { ...r, group_id: undefined } : r));
                            } catch (err) {
                              console.error('Error deleting rule group:', err);
                              setGroupsError('Failed to delete rule group.');
                            }
                          }
                        }}
                        title="Delete group"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="inline-form"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setCreatingGroup(true);
                  const created = await ruleGroupsApi.createRuleGroup({ name: newGroupName.trim(), description: newGroupDescription.trim() || undefined });
                  setRuleGroups(prev => [...prev, created]);
                  setNewGroupName('');
                  setNewGroupDescription('');
                } catch (err) {
                  console.error('Error creating rule group:', err);
                  setGroupsError('Failed to create rule group.');
                } finally {
                  setCreatingGroup(false);
                }
              }}
            >
              <input
                type="text"
                placeholder="New group name"
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
              <button className="button" disabled={creatingGroup || !newGroupName.trim()}>
                {creatingGroup ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          </>
        )}
      </div>

      <div className="panel">
        <div className="header-with-button">
          <h2>Rules by Group</h2>
          <div className="button-group">
            <button
              className="button small"
              onClick={() => setCollapsedGroups(new Set(['UNGROUPED', ...ruleGroups.map(g => g.id)]))}
              title="Collapse all groups"
            >
              Collapse All
            </button>
            <button
              className="button small"
              onClick={() => setCollapsedGroups(new Set())}
              title="Expand all groups"
            >
              Expand All
            </button>
          </div>
          {isUpdatingGroup && <span className="subtitle updating">Updating...</span>}
        </div>
        {/* Ungrouped section */}
        <div
          className={`group-section ${draggedRule && dragOverGroupId === null ? 'over' : ''}`}
          onDragOver={handleDragOverGroup(null)}
          onDrop={handleDropOnGroup(null)}
          onDragLeave={handleDragLeaveGroup()}
        >
          <div className="group-header" onClick={() => toggleGroupCollapsed('UNGROUPED')}>
            <strong>Ungrouped</strong>
            <span>{rulesForGroup(null).length} rule(s)</span>
          </div>
          {!collapsedGroups.has('UNGROUPED') && (
            <ul className="list">
              {rulesForGroup(null).length === 0 ? (
                <li className="list-item"><div className="subtitle">No rules</div></li>
              ) : (
                rulesForGroup(null).map(rule => (
                  <li key={rule.id} className="list-item" draggable onDragStart={handleDragStart(rule)}>
                    <div className="list-item-content">
                      <div className="title"><Link to={`/rules/${rule.id}`}>{rule.name}</Link></div>
                      <div className="subtitle">Priority: {rule.priority} • {rule.is_active ? 'Active' : 'Inactive'}</div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        {/* Grouped sections */}
        {ruleGroups.map(group => {
          const key = group.id;
          const over = draggedRule && dragOverGroupId === group.id;
          return (
            <div
              key={group.id}
              className={`group-section ${over ? 'over' : ''}`}
              onDragOver={handleDragOverGroup(group.id)}
              onDrop={handleDropOnGroup(group.id)}
              onDragLeave={handleDragLeaveGroup()}
            >
              <div className="group-header" onClick={() => toggleGroupCollapsed(key)}>
                <strong>{group.name}</strong>
                <span>{rulesForGroup(group.id).length} rule(s)</span>
              </div>
              {!collapsedGroups.has(key) && (
                <ul className="list">
                  {rulesForGroup(group.id).length === 0 ? (
                    <li className="list-item"><div className="subtitle">No rules</div></li>
                  ) : (
                    rulesForGroup(group.id).map(rule => (
                      <li key={rule.id} className="list-item" draggable onDragStart={handleDragStart(rule)}>
                        <div className="list-item-content">
                          <div className="title"><Link to={`/rules/${rule.id}`}>{rule.name}</Link></div>
                          <div className="subtitle">Priority: {rule.priority} • {rule.is_active ? 'Active' : 'Inactive'}</div>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>

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
                <th>Group</th>
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
                    <select
                      value={rule.group_id || ''}
                      onChange={(e) => handleChangeRuleGroup(rule, e.target.value)}
                    >
                      <option value="">None</option>
                      {ruleGroups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </td>
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
