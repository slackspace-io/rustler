import { useState } from 'react';
import { fireflyImportApi } from '../../services/api';
import type { FireflyImportOptions, ImportResult } from '../../services/api';

const FireflyImport = () => {
  const [importMethod, setImportMethod] = useState<'api' | 'csv'>('api');
  const [apiUrl, setApiUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [accountsCsvPath, setAccountsCsvPath] = useState('');
  const [transactionsCsvPath, setTransactionsCsvPath] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const options: FireflyImportOptions = {
        import_method: importMethod,
        api_url: importMethod === 'api' ? apiUrl : undefined,
        api_token: importMethod === 'api' ? apiToken : undefined,
        accounts_csv_path: importMethod === 'csv' ? accountsCsvPath : undefined,
        transactions_csv_path: importMethod === 'csv' ? transactionsCsvPath : undefined,
      };

      const result = await fireflyImportApi.importFromFirefly(options);
      setImportResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="firefly-import">
      <h2>Import from Firefly III</h2>
      <p>Import your accounts and transactions from Firefly III into Rustler.</p>

      <div className="import-options">
        <div className="import-method">
          <h3>Import Method</h3>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="importMethod"
                value="api"
                checked={importMethod === 'api'}
                onChange={() => setImportMethod('api')}
              />
              API (Connect directly to Firefly III)
            </label>
            <label>
              <input
                type="radio"
                name="importMethod"
                value="csv"
                checked={importMethod === 'csv'}
                onChange={() => setImportMethod('csv')}
              />
              CSV (Import from exported files)
            </label>
          </div>
        </div>

        {importMethod === 'api' ? (
          <div className="api-options">
            <h3>API Connection</h3>
            <div className="form-group">
              <label htmlFor="apiUrl">Firefly III URL</label>
              <input
                type="text"
                id="apiUrl"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://your-firefly-instance.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="apiToken">API Token</label>
              <input
                type="password"
                id="apiToken"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Your Firefly III API token"
              />
            </div>
          </div>
        ) : (
          <div className="csv-options">
            <h3>CSV Files</h3>
            <div className="form-group">
              <label htmlFor="accountsCsvPath">Accounts CSV File Path</label>
              <input
                type="text"
                id="accountsCsvPath"
                value={accountsCsvPath}
                onChange={(e) => setAccountsCsvPath(e.target.value)}
                placeholder="/path/to/accounts.csv"
              />
            </div>
            <div className="form-group">
              <label htmlFor="transactionsCsvPath">Transactions CSV File Path</label>
              <input
                type="text"
                id="transactionsCsvPath"
                value={transactionsCsvPath}
                onChange={(e) => setTransactionsCsvPath(e.target.value)}
                placeholder="/path/to/transactions.csv"
              />
            </div>
          </div>
        )}

        <div className="import-actions">
          <button
            className="import-button"
            onClick={handleImport}
            disabled={isImporting || (
              importMethod === 'api' ? !apiUrl || !apiToken : !accountsCsvPath || !transactionsCsvPath
            )}
          >
            {isImporting ? 'Importing...' : 'Start Import'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}

      {importResult && (
        <div className="import-result">
          <h3>Import Results</h3>
          <div className="result-stats">
            <div className="stat">
              <span className="stat-label">Accounts Imported:</span>
              <span className="stat-value">{importResult.accounts_imported}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Transactions Imported:</span>
              <span className="stat-value">{importResult.transactions_imported}</span>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="import-errors">
              <h4>Errors</h4>
              <ul>
                {importResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <style>{`
        .firefly-import {
          margin-bottom: 30px;
        }
        
        .import-options {
          margin-top: 20px;
        }
        
        .import-method {
          margin-bottom: 20px;
        }
        
        .radio-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .radio-group label {
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        
        .radio-group input[type="radio"] {
          margin-right: 10px;
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        .form-group input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--color-border);
          border-radius: 4px;
          background-color: var(--color-bg-input);
          color: var(--color-text-primary);
          transition: border-color 0.3s ease;
        }
        
        .form-group input:focus {
          border-color: var(--color-primary);
          outline: none;
        }
        
        .import-actions {
          margin-top: 20px;
        }
        
        .import-button {
          padding: 10px 20px;
          background-color: var(--color-primary);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.3s ease;
        }
        
        .import-button:hover:not(:disabled) {
          background-color: var(--color-primary-dark);
        }
        
        .import-button:disabled {
          background-color: var(--color-disabled);
          cursor: not-allowed;
        }
        
        .error-message {
          margin-top: 20px;
          padding: 15px;
          background-color: var(--color-error-bg);
          color: var(--color-error-text);
          border: 1px solid var(--color-error-border);
          border-radius: 4px;
        }
        
        .import-result {
          margin-top: 20px;
          padding: 15px;
          background-color: var(--color-success-bg);
          border: 1px solid var(--color-success-border);
          border-radius: 4px;
        }
        
        .result-stats {
          display: flex;
          gap: 20px;
          margin-top: 10px;
        }
        
        .stat {
          display: flex;
          flex-direction: column;
        }
        
        .stat-label {
          font-weight: 500;
        }
        
        .stat-value {
          font-size: 1.2em;
          margin-top: 5px;
        }
        
        .import-errors {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid var(--color-border);
        }
        
        .import-errors ul {
          margin-top: 10px;
          padding-left: 20px;
        }
        
        .import-errors li {
          margin-bottom: 5px;
          color: var(--color-error-text);
        }
      `}</style>
    </div>
  );
};

export default FireflyImport;
