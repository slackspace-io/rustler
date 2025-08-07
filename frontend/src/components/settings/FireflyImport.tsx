import { useState, useRef } from 'react';
import { fireflyImportApi } from '../../services/api';
import type { FireflyImportOptions, ImportResult } from '../../services/api';

const FireflyImport = () => {
  const [importMethod, setImportMethod] = useState<'api' | 'csv'>('api');
  const [apiUrl, setApiUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [accountsCsvPath, setAccountsCsvPath] = useState('');
  const [transactionsCsvPath, setTransactionsCsvPath] = useState('');
  const [accountsFile, setAccountsFile] = useState<File | null>(null);
  const [transactionsFile, setTransactionsFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // References for file inputs to clear them when needed
  const accountsFileInputRef = useRef<HTMLInputElement>(null);
  const transactionsFileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection for accounts
  const handleAccountsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAccountsFile(e.target.files[0]);
    }
  };

  // Handle file selection for transactions
  const handleTransactionsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setTransactionsFile(e.target.files[0]);
    }
  };

  // Reset file inputs
  const resetFileInputs = () => {
    if (accountsFileInputRef.current) {
      accountsFileInputRef.current.value = '';
    }
    if (transactionsFileInputRef.current) {
      transactionsFileInputRef.current.value = '';
    }
    setAccountsFile(null);
    setTransactionsFile(null);
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    setImportResult(null);

    try {
      let result: ImportResult;

      if (importMethod === 'api') {
        // Import using API
        const options: FireflyImportOptions = {
          import_method: 'api',
          api_url: apiUrl,
          api_token: apiToken,
        };
        result = await fireflyImportApi.importFromFirefly(options);
      } else if (importMethod === 'csv') {
        if (accountsFile && transactionsFile) {
          // Import using file upload
          result = await fireflyImportApi.uploadFireflyCsv(accountsFile, transactionsFile);
          // Reset file inputs after successful upload
          resetFileInputs();
        } else if (accountsCsvPath && transactionsCsvPath) {
          // Import using file paths (server-side files)
          const options: FireflyImportOptions = {
            import_method: 'csv',
            accounts_csv_path: accountsCsvPath,
            transactions_csv_path: transactionsCsvPath,
          };
          result = await fireflyImportApi.importFromFirefly(options);
        } else {
          throw new Error('Please provide both accounts and transactions files or paths');
        }
      } else {
        throw new Error('Invalid import method');
      }

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

            <div className="csv-upload-section">
              <h4>Upload CSV Files</h4>
              <p>Upload your exported Firefly III CSV files directly from your computer.</p>

              <div className="form-group">
                <label htmlFor="accountsFile">Accounts CSV File</label>
                <input
                  type="file"
                  id="accountsFile"
                  accept=".csv"
                  onChange={handleAccountsFileChange}
                  ref={accountsFileInputRef}
                />
                {accountsFile && (
                  <div className="file-info">
                    Selected: {accountsFile.name} ({Math.round(accountsFile.size / 1024)} KB)
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="transactionsFile">Transactions CSV File</label>
                <input
                  type="file"
                  id="transactionsFile"
                  accept=".csv"
                  onChange={handleTransactionsFileChange}
                  ref={transactionsFileInputRef}
                />
                {transactionsFile && (
                  <div className="file-info">
                    Selected: {transactionsFile.name} ({Math.round(transactionsFile.size / 1024)} KB)
                  </div>
                )}
              </div>
            </div>

            <div className="csv-path-section">
              <h4>Or Specify Server-Side File Paths</h4>
              <p>If your CSV files are already on the server, you can specify their paths.</p>

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
          </div>
        )}

        <div className="import-actions">
          {/*
            Fixed button disabled condition to enable the button when either:
            1. For API import: both API URL and token are provided
            2. For CSV import: EITHER both file paths are provided OR both files are uploaded
            This fixes the issue where users couldn't click import even if they had selected files to upload
          */}
          <button
            className="import-button"
            onClick={handleImport}
            disabled={isImporting || (
              importMethod === 'api'
                ? !apiUrl || !apiToken
                : !(
                    (accountsCsvPath && transactionsCsvPath) ||
                    (accountsFile && transactionsFile)
                  )
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
        
        .csv-options {
          display: flex;
          flex-direction: column;
          gap: 25px;
        }
        
        .csv-upload-section, .csv-path-section {
          background-color: var(--color-bg-secondary);
          padding: 20px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
        }
        
        .csv-upload-section h4, .csv-path-section h4 {
          margin-top: 0;
          margin-bottom: 10px;
          color: var(--color-text-primary);
        }
        
        .csv-upload-section p, .csv-path-section p {
          margin-bottom: 15px;
          color: var(--color-text-secondary);
          font-size: 0.9em;
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
        
        .form-group input[type="file"] {
          padding: 8px;
          background-color: var(--color-bg-input);
          border: 1px dashed var(--color-border);
          cursor: pointer;
        }
        
        .form-group input[type="file"]:hover {
          border-color: var(--color-primary);
        }
        
        .file-info {
          margin-top: 5px;
          font-size: 0.85em;
          color: var(--color-text-secondary);
          background-color: var(--color-bg-tertiary);
          padding: 5px 10px;
          border-radius: 4px;
          display: inline-block;
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
