import React, { useState } from 'react';
import { useSettings } from '../../contexts/useSettings';
import type { QuickAddFieldKey } from '../../services/types';

// Define a non-optional type for QuickAddFields
type QuickAddFields = {
  sourceAccount: boolean;
  destinationAccount: boolean;
  description: boolean;
  amount: boolean;
  category: boolean;
  budget: boolean;
  date: boolean;
};

interface QuickAddFieldSettingsProps {
  onClose: () => void;
}

const DEFAULT_ORDER: QuickAddFieldKey[] = [
  'sourceAccount',
  'destinationAccount',
  'description',
  'amount',
  'category',
  'budget',
  'date',
];

const QuickAddFieldSettings: React.FC<QuickAddFieldSettingsProps> = ({ onClose }) => {
  const { settings, updateQuickAddFields, updateQuickAddOrder } = useSettings();

  // Initialize state with current settings or defaults
  const [fields, setFields] = useState<QuickAddFields>(
    settings.quickAddFields || {
      sourceAccount: true,
      destinationAccount: true,
      description: true,
      amount: true,
      category: true,
      budget: true,
      date: true,
    }
  );

  const [order, setOrder] = useState<QuickAddFieldKey[]>(
    (settings.quickAddOrder && settings.quickAddOrder.length > 0)
      ? settings.quickAddOrder
      : DEFAULT_ORDER
  );

  // Handle checkbox changes
  const handleFieldChange = (field: keyof QuickAddFields) => {
    // Don't allow disabling required fields (sourceAccount, description, amount)
    if (
      (field === 'sourceAccount' || field === 'description' || field === 'amount') &&
      fields[field] === true
    ) {
      return; // Prevent disabling required fields
    }

    const updatedFields: QuickAddFields = {
      ...fields,
      [field]: !fields[field],
    };

    setFields(updatedFields);
  };

  const move = (key: QuickAddFieldKey, direction: 'up' | 'down') => {
    const idx = order.indexOf(key);
    if (idx === -1) return;
    const newOrder = [...order];
    if (direction === 'up' && idx > 0) {
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    } else if (direction === 'down' && idx < newOrder.length - 1) {
      [newOrder[idx + 1], newOrder[idx]] = [newOrder[idx], newOrder[idx + 1]];
    }
    setOrder(newOrder);
  };

  // Save changes and close
  const handleSave = () => {
    updateQuickAddFields(fields);
    updateQuickAddOrder(order);
    onClose();
  };

  return (
    <div className="quick-add-field-settings">
      <div className="settings-header">
        <h2>Quick Add Fields</h2>
        <p>Select which fields to show and reorder them for the quick add transaction form</p>
      </div>

      <div className="settings-fields">
        <h3>Visibility</h3>
        <div className="field-option">
          <input
            type="checkbox"
            id="sourceAccount"
            checked={fields.sourceAccount}
            onChange={() => handleFieldChange('sourceAccount')}
            disabled={fields.sourceAccount} // Required field
          />
          <label htmlFor="sourceAccount">
            Source Account <span className="required">(Required)</span>
          </label>
        </div>

        <div className="field-option">
          <input
            type="checkbox"
            id="destinationAccount"
            checked={fields.destinationAccount}
            onChange={() => handleFieldChange('destinationAccount')}
          />
          <label htmlFor="destinationAccount">Destination Account</label>
        </div>

        <div className="field-option">
          <input
            type="checkbox"
            id="description"
            checked={fields.description}
            onChange={() => handleFieldChange('description')}
            disabled={fields.description} // Required field
          />
          <label htmlFor="description">
            Description <span className="required">(Required)</span>
          </label>
        </div>

        <div className="field-option">
          <input
            type="checkbox"
            id="amount"
            checked={fields.amount}
            onChange={() => handleFieldChange('amount')}
            disabled={fields.amount} // Required field
          />
          <label htmlFor="amount">
            Amount <span className="required">(Required)</span>
          </label>
        </div>

        <div className="field-option">
          <input
            type="checkbox"
            id="category"
            checked={fields.category}
            onChange={() => handleFieldChange('category')}
          />
          <label htmlFor="category">Category</label>
        </div>

        <div className="field-option">
          <input
            type="checkbox"
            id="budget"
            checked={fields.budget}
            onChange={() => handleFieldChange('budget')}
          />
          <label htmlFor="budget">Budget</label>
        </div>

        <div className="field-option">
          <input
            type="checkbox"
            id="date"
            checked={fields.date}
            onChange={() => handleFieldChange('date')}
          />
          <label htmlFor="date">Date</label>
        </div>
      </div>

      <div className="settings-order">
        <h3>Order</h3>
        <ul className="order-list">
          {order.map((key, index) => (
            <li key={key} className="order-item">
              <span className="order-label">
                {key === 'sourceAccount' && 'Source Account'}
                {key === 'destinationAccount' && 'Destination Account'}
                {key === 'description' && 'Description'}
                {key === 'amount' && 'Amount'}
                {key === 'category' && 'Category'}
                {key === 'budget' && 'Budget'}
                {key === 'date' && 'Date'}
              </span>
              <div className="order-actions">
                <button type="button" className="button small" onClick={() => move(key, 'up')} disabled={index === 0}>Up</button>
                <button type="button" className="button small" onClick={() => move(key, 'down')} disabled={index === order.length - 1}>Down</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="settings-actions">
        <button onClick={handleSave} className="button primary">
          Save
        </button>
        <button onClick={onClose} className="button secondary">
          Cancel
        </button>
      </div>

      {/* Styles moved to CSS classes in a separate stylesheet */}
    </div>
  );
};

export default QuickAddFieldSettings;
