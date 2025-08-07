import React, { useState } from 'react';
import { useSettings } from '../../contexts/useSettings';

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

const QuickAddFieldSettings: React.FC<QuickAddFieldSettingsProps> = ({ onClose }) => {
  const { settings, updateQuickAddFields } = useSettings();

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

  // Save changes and close
  const handleSave = () => {
    // Pass fields as Settings['quickAddFields'] to updateQuickAddFields
    updateQuickAddFields(fields);
    onClose();
  };

  return (
    <div className="quick-add-field-settings">
      <div className="settings-header">
        <h2>Quick Add Fields</h2>
        <p>Select which fields to show in the quick add transaction form</p>
      </div>

      <div className="settings-fields">
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
