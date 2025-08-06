import { useState } from 'react';
import { rulesApi } from '../../services/api';
import type { RuleCondition, RuleAction, ConditionType, ActionType } from '../../services/api';
import RuleForm from './RuleForm';

const RuleNew = () => {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (rule: {
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
    try {
      // Convert string types to proper enum types
      const typedConditions: RuleCondition[] = rule.conditions.map(c => ({
        condition_type: c.condition_type as ConditionType,
        value: c.value
      }));

      const typedActions: RuleAction[] = rule.actions.map(a => ({
        action_type: a.action_type as ActionType,
        value: a.value
      }));

      // Extract only the fields that createRule expects
      const createData = {
        name: rule.name,
        description: rule.description,
        is_active: rule.is_active,
        priority: rule.priority,
        conditions: typedConditions,
        actions: typedActions
      };

      await rulesApi.createRule(createData);
    } catch (err) {
      console.error('Error creating rule:', err);
      setError('Failed to create rule. Please try again later.');
      throw err; // Re-throw to let the form component handle the error state
    }
  };

  return (
    <div className="rule-new">
      {error && <div className="error">{error}</div>}
      <RuleForm
        isEditMode={false}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default RuleNew;
