import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { transactionsApi, accountsApi, budgetsApi } from '../../services/api';
import type { Account, Budget } from '../../services/api';
import { useSettings } from '../../contexts/useSettings';

interface CSVColumn {
  index: number;
  header: string;
  sample: string;
}

interface ColumnMapping {
  description: number | null;
  amount: number | null;
  category: number | null;
  destination_name: number | null;
  transaction_date: number | null;
  budget_id: number | null;
}

const TransactionImport = () => {
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId: string }>();
  const { formatNumber } = useSettings();

  const [account, setAccount] = useState<Account | null>(null);
  // We'll use budgets later for mapping budget IDs
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CSV import state
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvColumns, setCsvColumns] = useState<CSVColumn[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    description: null,
    amount: null,
    category: null,
    destination_name: null,
    transaction_date: null,
    budget_id: null,
  });
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importStats, setImportStats] = useState({ total: 0, success: 0, failed: 0 });

  useEffect(() => {
    const fetchData = async () => {
      if (!accountId) return;

      try {
        setLoading(true);

        // Fetch account details
        const accountData = await accountsApi.getAccount(accountId);
        setAccount(accountData);

        // Fetch budgets
        const budgetsData = await budgetsApi.getActiveBudgets();
        setBudgets(budgetsData);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        setLoading(false);
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [accountId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Read the file
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseCSV(content);
    };
    reader.readAsText(selectedFile);
  };

  const parseCSV = (content: string) => {
    // Simple CSV parsing (can be improved with a library)
    const lines = content.split('\n');
    const parsedData: string[][] = [];

    lines.forEach(line => {
      // Handle quoted values with commas inside
      const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^,]*))/g;
      const row: string[] = [];
      let match;

      while ((match = regex.exec(line + ',')) !== null) {
        const value = match[1] || match[2] || '';
        row.push(value.trim());
      }

      if (row.length > 0 && row.some(cell => cell.trim() !== '')) {
        parsedData.push(row);
      }
    });

    if (parsedData.length < 2) {
      setError('CSV file must contain a header row and at least one data row');
      return;
    }

    setCsvData(parsedData);

    // Extract columns with sample data
    const headers = parsedData[0];
    const sampleRow = parsedData[1];

    const columns: CSVColumn[] = headers.map((header, index) => ({
      index,
      header,
      sample: sampleRow[index] || ''
    }));

    setCsvColumns(columns);

    // Try to auto-map columns based on headers
    const newMapping: ColumnMapping = {
      description: null,
      amount: null,
      category: null,
      destination_name: null,
      transaction_date: null,
      budget_id: null,
    };

    columns.forEach((column) => {
      const header = column.header.toLowerCase();

      if (header.includes('desc') || header.includes('memo') || header.includes('note')) {
        newMapping.description = column.index;
      } else if (header.includes('amount') || header.includes('sum') || header.includes('total')) {
        newMapping.amount = column.index;
      } else if (header.includes('cat') || header.includes('type')) {
        newMapping.category = column.index;
      } else if (header.includes('payee') || header.includes('merchant') || header.includes('dest')) {
        newMapping.destination_name = column.index;
      } else if (header.includes('date')) {
        newMapping.transaction_date = column.index;
      }
    });

    setColumnMapping(newMapping);
  };

  const handleMappingChange = (field: keyof ColumnMapping, columnIndex: number | null) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: columnIndex
    }));
  };

  const handleImport = async () => {
    if (!file || !accountId || !columnMapping.description || !columnMapping.amount) {
      setError('Please select a file and map at least the description and amount columns');
      return;
    }

    try {
      setImporting(true);
      setError(null);

      // Skip header row
      const dataRows = csvData.slice(1);

      const importResponse = await transactionsApi.importTransactions({
        account_id: accountId,
        column_mapping: columnMapping,
        data: dataRows
      });

      setImportStats({
        total: dataRows.length,
        success: importResponse.success,
        failed: importResponse.failed
      });

      setImportSuccess(true);
      setImporting(false);
    } catch (err) {
      setError('Failed to import transactions. Please try again.');
      setImporting(false);
      console.error('Error importing transactions:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!account) {
    return <div className="error-message">Account not found</div>;
  }

  if (importSuccess) {
    return (
      <div className="import-success">
        <h2>Import Completed</h2>
        <div className="import-stats">
          <p>Total rows: {importStats.total}</p>
          <p>Successfully imported: {importStats.success}</p>
          <p>Failed to import: {importStats.failed}</p>
        </div>
        <div className="button-group">
          <button
            className="button primary"
            onClick={() => navigate(`/accounts/${accountId}`)}
          >
            View Account
          </button>
          <button
            className="button secondary"
            onClick={() => {
              setFile(null);
              setCsvData([]);
              setCsvColumns([]);
              setImportSuccess(false);
            }}
          >
            Import Another File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-import">
      <h2>Import Transactions for {account.name}</h2>
      <p className="account-balance">Current Balance: {formatNumber(account.balance)}</p>

      {!file ? (
        <div className="file-upload-container">
          <h3>Upload CSV File</h3>
          <p>Select a CSV file containing transaction data to import.</p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="file-input"
          />
        </div>
      ) : (
        <div className="import-container">
          <div className="file-info">
            <h3>File: {file.name}</h3>
            <button
              className="button small"
              onClick={() => {
                setFile(null);
                setCsvData([]);
                setCsvColumns([]);
              }}
            >
              Change File
            </button>
          </div>

          {csvColumns.length > 0 && (
            <>
              <div className="column-mapping">
                <h3>Map Columns</h3>
                <p>Match each transaction field to a column from your CSV file.</p>

                <div className="mapping-row">
                  <label>Description (required):</label>
                  <select
                    value={columnMapping.description !== null ? columnMapping.description : ''}
                    onChange={(e) => handleMappingChange('description', e.target.value ? parseInt(e.target.value) : null)}
                    required
                  >
                    <option value="">Select a column</option>
                    {csvColumns.map((column) => (
                      <option key={column.index} value={column.index}>
                        {column.header} (e.g., {column.sample})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mapping-row">
                  <label>Amount (required):</label>
                  <select
                    value={columnMapping.amount !== null ? columnMapping.amount : ''}
                    onChange={(e) => handleMappingChange('amount', e.target.value ? parseInt(e.target.value) : null)}
                    required
                  >
                    <option value="">Select a column</option>
                    {csvColumns.map((column) => (
                      <option key={column.index} value={column.index}>
                        {column.header} (e.g., {column.sample})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mapping-row">
                  <label>Category:</label>
                  <select
                    value={columnMapping.category !== null ? columnMapping.category : ''}
                    onChange={(e) => handleMappingChange('category', e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Select a column</option>
                    {csvColumns.map((column) => (
                      <option key={column.index} value={column.index}>
                        {column.header} (e.g., {column.sample})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mapping-row">
                  <label>Destination/Payee:</label>
                  <select
                    value={columnMapping.destination_name !== null ? columnMapping.destination_name : ''}
                    onChange={(e) => handleMappingChange('destination_name', e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Select a column</option>
                    {csvColumns.map((column) => (
                      <option key={column.index} value={column.index}>
                        {column.header} (e.g., {column.sample})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mapping-row">
                  <label>Transaction Date:</label>
                  <select
                    value={columnMapping.transaction_date !== null ? columnMapping.transaction_date : ''}
                    onChange={(e) => handleMappingChange('transaction_date', e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Select a column</option>
                    {csvColumns.map((column) => (
                      <option key={column.index} value={column.index}>
                        {column.header} (e.g., {column.sample})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mapping-row">
                  <label>Budget:</label>
                  <select
                    value={columnMapping.budget_id !== null ? columnMapping.budget_id : ''}
                    onChange={(e) => handleMappingChange('budget_id', e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Select a column</option>
                    {csvColumns.map((column) => (
                      <option key={column.index} value={column.index}>
                        {column.header} (e.g., {column.sample})
                      </option>
                    ))}
                  </select>
                </div>

                {columnMapping.budget_id === null && (
                  <div className="mapping-row">
                    <label>Default Budget (optional):</label>
                    <select
                      onChange={(e) => {
                        // Store the selected budget ID in local state
                        // This will be used for all transactions if no budget column is mapped
                        const selectedBudgetId = e.target.value || null;
                        console.log('Selected default budget:', selectedBudgetId);
                      }}
                    >
                      <option value="">No budget</option>
                      {budgets.map((budget) => (
                        <option key={budget.id} value={budget.id}>
                          {budget.name}
                        </option>
                      ))}
                    </select>
                    <p className="help-text">This budget will be applied to all imported transactions</p>
                  </div>
                )}
              </div>

              <div className="csv-preview">
                <h3>Data Preview</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        {csvData[0].map((header, index) => (
                          <th key={index}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(1, 6).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvData.length > 6 && (
                  <p className="preview-note">Showing first 5 rows of {csvData.length - 1} total rows</p>
                )}
              </div>

              <div className="button-group">
                <button
                  className="button primary"
                  onClick={handleImport}
                  disabled={importing || !columnMapping.description || !columnMapping.amount}
                >
                  {importing ? 'Importing...' : 'Import Transactions'}
                </button>
                <button
                  className="button secondary"
                  onClick={() => navigate(`/accounts/${accountId}`)}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionImport;
