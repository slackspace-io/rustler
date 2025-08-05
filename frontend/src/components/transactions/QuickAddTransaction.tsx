import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionsApi, accountsApi } from '../../services/api';
import type { Account } from '../../services/api';
import AccountInput from '../common/AccountInput';

const QuickAddTransaction = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);

  // Form state - simplified for quick add
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
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
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const accountsData = await accountsApi.getAccounts();
        setAccounts(accountsData);

        // If there are accounts, preselect the first one
        if (accountsData.length > 0) {
          setSourceAccountId(accountsData[0].id);
        }

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch accounts. Please try again later.');
        setLoading(false);
        console.error('Error fetching accounts:', err);
      }
    };

    fetchAccounts();
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
        category: 'Uncategorized', // Default category for quick add
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

  return (
    <div className="quick-add-transaction">
      <h1>Quick Add Transaction</h1>

      {error && <div className="error">{error}</div>}

      <form ref={formRef} onSubmit={handleSubmit} className={`quick-add-form ${isAndroid ? 'android-form' : ''}`}>
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

        <div className="form-group" style={isAndroid ? { marginBottom: '16px' } : {}}>
          <label htmlFor="amount" style={isAndroid ? { fontSize: '16px', marginBottom: '8px', display: 'block' } : {}}>Amount</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            required
            placeholder="Use negative values for income"
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
            Use negative values for income, positive for expenses
          </small>
        </div>

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
    </div>
  );
};

export default QuickAddTransaction;
