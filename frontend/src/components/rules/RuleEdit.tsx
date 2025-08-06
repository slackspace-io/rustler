import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { rulesApi } from '../../services/api';
import type { Rule, RuleCondition, RuleAction, ConditionType, ActionType } from '../../services/api';
import RuleForm from './RuleForm';

const RuleEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rule, setRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRule = async () => {
      if (!id) {
        navigate('/rules');
        return;
      }

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
  }, [id, navigate]);

  const handleSubmit = async (ruleData: {
    name: string;
    description?: string;
    is_active: boolean;
    priority?: number;
    conditions: Array<{
      condition_type: string;
      value: string;
    }>;
    actions: Array<{
      action_type: string;
      value: string;
    }>;
  }) => {
    if (!id) return;

    try {
      // Convert string types to proper enum types
      const typedConditions: RuleCondition[] = ruleData.conditions.map(c => ({
        condition_type: c.condition_type as ConditionType,
        value: c.value
      }));

      const typedActions: RuleAction[] = ruleData.actions.map(a => ({
        action_type: a.action_type as ActionType,
        value: a.value
      }));

      // Extract only the fields that updateRule expects
      const updateData = {
        name: ruleData.name,
        description: ruleData.description,
        is_active: ruleData.is_active,
        priority: ruleData.priority,
        conditions: typedConditions,
        actions: typedActions
      };

      await rulesApi.updateRule(id, updateData);
    } catch (err) {
      console.error('Error updating rule:', err);
      setError('Failed to update rule. Please try again later.');
      throw err; // Re-throw to let the form component handle the error state
    }
  };

  if (loading) {
    return <div>Loading rule...</div>;
  }

  if (error && !rule) {
    return <div className="error">{error}</div>;
  }

  if (!rule) {
    return <div className="error">Rule not found</div>;
  }

  return (
    <div className="rule-edit">
      {error && <div className="error">{error}</div>}
      <RuleForm
        initialRule={rule}
        isEditMode={true}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default RuleEdit;
