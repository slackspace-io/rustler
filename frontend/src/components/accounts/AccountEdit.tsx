import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { accountsApi } from '../../services/api';
import { ACCOUNT_TYPES, ACCOUNT_SUBTYPES } from '../../constants/accountTypes';

const AccountEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('');
  const [accountSubtype, setAccountSubtype] = useState('');
  const [isDefault, setIsDefault] = useState(false);


  useEffect(() => {
    const fetchAccount = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const account = await accountsApi.getAccount(id);

        // Initialize form with account data
        setName(account.name);
        setAccountType(account.account_type);
        setAccountSubtype(account.account_sub_type || '');
        setIsDefault(!!account.is_default);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch account details. Please try again later.');
        setLoading(false);
        console.error('Error fetching account:', err);
      }
    };

    fetchAccount();
  }, [id]);

  // Update available subtypes when account type changes
  useEffect(() => {
    if (accountType && ACCOUNT_SUBTYPES[accountType]) {
      const subtypes = ACCOUNT_SUBTYPES[accountType];
      // If current subtype is not valid for the selected account type, reset it
      if (subtypes.length > 0 && !subtypes.includes(accountSubtype)) {
        setAccountSubtype(subtypes[0]);
      } else if (subtypes.length === 0) {
        setAccountSubtype('');
      }
    }
  }, [accountType, accountSubtype]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    if (!name) {
      setError('Account name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await accountsApi.updateAccount(id, {
        name,
        account_type: accountType,
        account_sub_type: accountSubtype || null,
        currency: "DEFAULT", // Using a default currency value since the app is currency-agnostic
        is_default: isDefault,
      });

      // Redirect to account view on success
      navigate(`/accounts/${id}`);
    } catch (err) {
      setError('Failed to update account. Please try again.');
      console.error('Error updating account:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading account details...</div>;
  }

  if (error && !saving) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="account-edit">
      <h1>Edit Account</h1>

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
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => navigate(`/accounts/${id}`)}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AccountEdit;
