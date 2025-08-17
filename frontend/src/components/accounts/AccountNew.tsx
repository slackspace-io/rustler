import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountsApi } from '../../services/api';
import { ACCOUNT_TYPE, ACCOUNT_TYPES, ACCOUNT_SUBTYPES } from '../../constants/accountTypes';

const AccountNew = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState(ACCOUNT_TYPE.ON_BUDGET);
  const [accountSubtype, setAccountSubtype] = useState('');
  const [balance, setBalance] = useState('0');
  const [isDefault, setIsDefault] = useState(false);

  // Update subtype when account type changes
  useEffect(() => {
    // Set default subtype when account type changes
    const subtypes = ACCOUNT_SUBTYPES[accountType] || [];
    setAccountSubtype(subtypes.length > 0 ? subtypes[0] : '');
  }, [accountType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      setError('Account name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await accountsApi.createAccount({
        name,
        account_type: accountType,
        account_sub_type: accountSubtype || null,
        balance: parseFloat(balance),
        currency: "DEFAULT", // Using a default currency value since the app is currency-agnostic
        is_default: isDefault,
      });

      // Redirect to accounts list on success
      navigate('/accounts');
    } catch (err) {
      setError('Failed to create account. Please try again.');
      console.error('Error creating account:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="account-new">
      <h1>Create New Account</h1>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Account Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="account-type">Account Type</label>
          <select
            id="account-type"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
          >
            {ACCOUNT_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {ACCOUNT_SUBTYPES[accountType] && ACCOUNT_SUBTYPES[accountType].length > 0 && (
          <div className="form-group">
            <label htmlFor="account-subtype">Account Subtype</label>
            <select
              id="account-subtype"
              value={accountSubtype}
              onChange={(e) => setAccountSubtype(e.target.value)}
            >
              {ACCOUNT_SUBTYPES[accountType].map(subtype => (
                <option key={subtype} value={subtype}>{subtype}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="balance">Initial Balance</label>
          <input
            type="number"
            id="balance"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            step="0.01"
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            {' '}Make this the default account
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => navigate('/accounts')}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AccountNew;
