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
          border: 1px solid #ddd;
          border-radius: 5px;
          background-color: var(--color-bg-secondary);
        }
        
        .setting-option {
          margin: 10px 0;
        }
        
        .example-box {
          margin-top: 15px;
          padding: 10px;
          background-color: #fff;
          border: 1px solid #eee;
          border-radius: 4px;
        }
        
        .success-message {
          padding: 10px;
          margin-bottom: 20px;
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default SettingsPage;
