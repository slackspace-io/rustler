import { useState } from 'react';
import { useSettings } from '../../contexts/useSettings';

const SettingsPage = () => {
  const { settings, updateNumberFormat, formatNumber } = useSettings();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Example values to show the difference between formats
  const exampleValue = 1234.56;

  const handleNumberFormatChange = (format: 'decimal' | 'comma') => {
    updateNumberFormat(format);

    // Show save message
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Format the example value according to the current setting
  const formattedExample = formatNumber(exampleValue);

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      {saveMessage && (
        <div className="success-message">{saveMessage}</div>
      )}

      <div className="settings-section">
        <h2>Number Format</h2>
        <p>Choose how numbers are displayed throughout the application.</p>

        <div className="setting-option">
          <label>
            <input
              type="radio"
              name="numberFormat"
              value="decimal"
              checked={settings.numberFormat === 'decimal'}
              onChange={() => handleNumberFormatChange('decimal')}
            />
            Use decimal point (1234.56)
          </label>
        </div>

        <div className="setting-option">
          <label>
            <input
              type="radio"
              name="numberFormat"
              value="comma"
              checked={settings.numberFormat === 'comma'}
              onChange={() => handleNumberFormatChange('comma')}
            />
            Use comma (1234,56)
          </label>
        </div>

        <div className="example-box">
          <p>Example: <strong>{formattedExample}</strong></p>
        </div>
      </div>

      <style>{`
        .settings-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .settings-section {
          margin-bottom: 30px;
          padding: 20px;
          border: 1px solid var(--color-border);
          border-radius: 5px;
          background-color: var(--color-bg-secondary);
          box-shadow: 0 2px 4px var(--color-shadow);
          transition: var(--transition-standard);
        }
        
        .setting-option {
          margin: 15px 0;
          display: flex;
          align-items: center;
        }
        
        .setting-option label {
          display: flex;
          align-items: center;
          cursor: pointer;
          color: var(--color-text-primary);
          transition: color 0.3s ease;
        }
        
        .setting-option input[type="radio"] {
          margin-right: 10px;
          cursor: pointer;
        }
        
        .example-box {
          margin-top: 20px;
          padding: 15px;
          background-color: var(--color-bg-tertiary);
          border: 1px solid var(--color-border);
          border-radius: 4px;
          transition: var(--transition-standard);
        }
        
        .success-message {
          padding: 15px;
          margin-bottom: 20px;
          background-color: var(--color-success-bg);
          color: var(--color-success-text);
          border: 1px solid var(--color-success-border);
          border-radius: 4px;
          transition: var(--transition-standard);
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
          .settings-page {
            padding: 15px;
          }
          
          .settings-section {
            padding: 15px;
          }
        }
        
        @media (max-width: 576px) {
          .settings-page {
            padding: 10px;
          }
          
          .settings-section {
            padding: 12px;
            margin-bottom: 20px;
          }
          
          .example-box {
            padding: 12px;
          }
          
          .success-message {
            padding: 12px;
          }
        }
        
        @media (max-width: 375px) {
          .settings-section {
            padding: 10px;
          }
          
          .setting-option {
            margin: 10px 0;
          }
          
          .example-box {
            padding: 10px;
            margin-top: 15px;
          }
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;
