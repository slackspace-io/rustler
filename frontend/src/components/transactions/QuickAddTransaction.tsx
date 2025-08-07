import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionsApi, accountsApi, budgetsApi } from '../../services/api';
import type { Account, Budget } from '../../services/api';
import AccountInput from '../common/AccountInput';
import CategoryInput from '../common/CategoryInput';
import QuickAddFieldSettings from './QuickAddFieldSettings';
import { useSettings } from '../../contexts/useSettings';

const QuickAddTransaction = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const { settings } = useSettings();
  const fieldSettings = settings.quickAddFields || {
    sourceAccount: true,
    destinationAccount: true,
    description: true,
    amount: true,
    category: true,
    budget: true,
    date: true,
  };

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Form state - simplified for quick add
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [category, setCategory] = useState('Uncategorized');
  const [budgetId, setBudgetId] = useState<string>('');
  const [budgetName, setBudgetName] = useState('');
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Detect Android devices
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidDevice = /android/.test(userAgent);
    setIsAndroid(isAndroidDevice);

    // Apply Android-specific styles
    if (isAndroidDevice && formRef.current) {
      // Add Android-specific class to the form
      formRef.current.classList.add('android-form');

      // Apply Android-specific styles to form elements
      const inputs = formRef.current.querySelectorAll('input, select');
      inputs.forEach(input => {
        input.classList.add('android-input');
        // Increase touch target size
        (input as HTMLElement).style.minHeight = '48px';
        (input as HTMLElement).style.fontSize = '16px';
      });

      // Increase padding for better touch experience
      const buttons = formRef.current.querySelectorAll('button');
      buttons.forEach(button => {
        button.classList.add('android-button');
        (button as HTMLElement).style.minHeight = '48px';
        (button as HTMLElement).style.padding = '12px 16px';
      });
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch accounts
        const accountsData = await accountsApi.getAccounts();
        setAccounts(accountsData);

        // If there are accounts, preselect the first one
        if (accountsData.length > 0) {
          setSourceAccountId(accountsData[0].id);
        }

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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceAccountId) {
      setError('Account is required');
      return;
    }

    if (!description) {
      setError('Description is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Create the transaction with optional destination account
      await transactionsApi.createTransaction({
        source_account_id: sourceAccountId,
        destination_account_id: destinationAccountId || undefined,
        description,
        amount: parseFloat(amount),
        category, // Use the selected category
        budget_id: budgetId || undefined, // Include budget if selected
        transaction_date: new Date(transactionDate).toISOString(),
      });

      // Redirect to transactions list on success
      navigate('/transactions');
    } catch (err) {
      setError('Failed to create transaction. Please try again.');
      console.error('Error creating transaction:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="quick-add-loading">Loading accounts...</div>;
  }

  if (accounts.length === 0) {
    return (
      <div className="quick-add-no-accounts">
        <p>You need to create an account before adding transactions.</p>
        <button onClick={() => navigate('/accounts/new')} className="button">
          Create Account
        </button>
      </div>
    );
  }

  // Modal for field settings
  const renderSettingsModal = () => {
    if (!showSettings) return null;

    return (
      <div className="settings-modal-overlay" onClick={() => setShowSettings(false)}>
        <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
          <QuickAddFieldSettings onClose={() => setShowSettings(false)} />
        </div>
      </div>
    );
  };

  return (
    <div className="quick-add-transaction">
      <div className="quick-add-header">
        <h1>Quick Add Transaction</h1>
        <button
          type="button"
          className="settings-button"
          onClick={() => setShowSettings(true)}
          aria-label="Configure fields"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {renderSettingsModal()}

      <form ref={formRef} onSubmit={handleSubmit} className={`quick-add-form ${isAndroid ? 'android-form' : ''}`}>
        {/* Source Account - Always required */}
        <div className="form-group" style={isAndroid ? { marginBottom: '16px' } : {}}>
          <AccountInput
            accounts={accounts}
            value={sourceAccountId}
            onChange={setSourceAccountId}
            placeholder="Select Source Account"
            label="Source Account"
            required={true}
            isAndroid={isAndroid}
          />
        </div>

        {/* Destination Account - Optional field */}
        {fieldSettings.destinationAccount && (
          <div className="form-group" style={isAndroid ? { marginBottom: '16px' } : {}}>
            <AccountInput
              accounts={accounts}
              value={destinationAccountId}
              onChange={setDestinationAccountId}
              placeholder="Select Destination Account (Optional)"
              label="Destination Account"
              required={false}
              isAndroid={isAndroid}
            />
          </div>
        )}

        {/* Description - Always required */}
        <div className="form-group" style={isAndroid ? { marginBottom: '16px' } : {}}>
          <label htmlFor="description" style={isAndroid ? { fontSize: '16px', marginBottom: '8px', display: 'block' } : {}}>Description</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="What was this transaction for?"
            className="mobile-input"
            style={isAndroid ? {
              height: '56px',
              fontSize: '16px',
              width: '100%',
              borderRadius: '8px',
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid #cccccc'
            } : {}}
          />
        </div>

        {/* Amount - Always required */}
        <div className="form-group" style={isAndroid ? { marginBottom: '16px' } : {}}>
          <label htmlFor="amount" style={isAndroid ? { fontSize: '16px', marginBottom: '8px', display: 'block' } : {}}>Amount</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
            required
            placeholder="Enter amount (positive numbers only)"
            className="mobile-input"
            inputMode="decimal"
            style={isAndroid ? {
              height: '56px',
              fontSize: '16px',
              width: '100%',
              borderRadius: '8px',
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid #cccccc'
            } : {}}
          />
          <small style={isAndroid ? { fontSize: '14px', marginTop: '4px', display: 'block' } : {}}>
            Money will be withdrawn from source account and deposited into destination account
          </small>
        </div>

        {/* Category - Optional field */}
        {fieldSettings.category && (
          <div className="form-group" style={isAndroid ? { marginBottom: '16px' } : {}}>
            <label htmlFor="category" style={isAndroid ? { fontSize: '16px', marginBottom: '8px', display: 'block' } : {}}>Category</label>
            <CategoryInput
              value={category}
              onChange={setCategory}
              placeholder="Select or create a category"
              className={isAndroid ? 'android-input' : ''}
            />
          </div>
        )}

        {/* Budget - Optional field */}
        {fieldSettings.budget && (
          <div className="form-group" style={isAndroid ? { marginBottom: '16px' } : {}}>
            <label htmlFor="budget" style={isAndroid ? { fontSize: '16px', marginBottom: '8px', display: 'block' } : {}}>Budget (Optional)</label>
            <input
              type="text"
              id="budget"
              value={budgetName}
              onChange={(e) => {
                const inputValue = e.target.value;
                setBudgetName(inputValue);
                setBudgetError(null);

                if (inputValue === '') {
                  // Empty input is valid (budget is optional)
                  setBudgetId('');
                  return;
                }

                // Check if the input matches an existing budget
                const matchedBudget = budgets.find(
                  budget => budget.name === inputValue ||
                          budget.name.toLowerCase() === inputValue.toLowerCase()
                );

                // If matched, set the budget ID, otherwise set error
                if (matchedBudget) {
                  setBudgetId(matchedBudget.id);
                } else {
                  setBudgetId('');
                  setBudgetError('Please select an existing budget from the list');
                }
              }}
              list="budgets-list"
              placeholder="Select an existing budget"
              className={`mobile-input ${budgetError ? 'error-input' : ''}`}
              style={isAndroid ? {
                height: '56px',
                fontSize: '16px',
                width: '100%',
                borderRadius: '8px',
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #cccccc'
              } : {}}
            />
            <datalist id="budgets-list">
              {budgets.map(budget => (
                <option key={budget.id} value={budget.name} />
              ))}
            </datalist>
            {budgetError && <div className="field-error" style={isAndroid ? { fontSize: '14px', color: 'red', marginTop: '4px' } : {}}>{budgetError}</div>}
          </div>
        )}

        {/* Date - Optional field */}
        {fieldSettings.date && (
          <div className="form-group" style={isAndroid ? { marginBottom: '16px' } : {}}>
            <label htmlFor="transaction-date" style={isAndroid ? { fontSize: '16px', marginBottom: '8px', display: 'block' } : {}}>Date</label>
            <input
              type="date"
              id="transaction-date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
              className="mobile-input"
              style={isAndroid ? {
                height: '56px',
                fontSize: '16px',
                width: '100%',
                borderRadius: '8px',
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #cccccc'
              } : {}}
            />
          </div>
        )}

        <div className="form-actions" style={isAndroid ? { marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' } : {}}>
          <button
            type="submit"
            disabled={saving}
            className="mobile-button"
            style={isAndroid ? {
              minHeight: '56px',
              fontSize: '18px',
              borderRadius: '8px',
              width: '100%',
              fontWeight: 'bold',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            } : {}}
          >
            {saving ? 'Creating...' : 'Add Transaction'}
          </button>
          <button
            type="button"
            className="secondary mobile-button"
            onClick={() => navigate('/transactions')}
            disabled={saving}
            style={isAndroid ? {
              minHeight: '56px',
              fontSize: '16px',
              borderRadius: '8px',
              width: '100%'
            } : {}}
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Styles moved to CSS classes in a separate stylesheet */}
    </div>
  );
};

export default QuickAddTransaction;
