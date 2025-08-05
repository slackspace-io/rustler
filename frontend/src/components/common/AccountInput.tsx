import { useState, useEffect, useRef } from 'react';
import type { Account } from '../../services/api';
import { useSettings } from '../../contexts/useSettings';
import './AccountInput.css';

interface AccountInputProps {
  accounts: Account[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  required?: boolean;
  isAndroid?: boolean;
}

const AccountInput: React.FC<AccountInputProps> = ({
  accounts,
  value,
  onChange,
  placeholder = 'Select an account',
  className = '',
  label,
  required = false,
  isAndroid = false,
}) => {
  const { formatNumber } = useSettings();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Initialize the input value when the selected account changes
  useEffect(() => {
    if (value) {
      const selectedAccount = accounts.find(account => account.id === value);
      if (selectedAccount) {
        setInputValue(selectedAccount.name);
      }
    } else {
      setInputValue('');
    }
  }, [value, accounts]);

  // Filter accounts based on input value
  useEffect(() => {
    if (inputValue.trim() === '') {
      setFilteredAccounts(accounts);
    } else {
      const filtered = accounts.filter(account =>
        account.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredAccounts(filtered);
    }
    // Reset selected index when filtered accounts change
    setSelectedIndex(-1);
  }, [inputValue, accounts]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
    setSelectedIndex(-1);

    // If the input is cleared, also clear the selected account
    if (e.target.value === '') {
      onChange('');
    }
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
    setSelectedIndex(-1);
    // Auto-clear the input value when focused
    setInputValue('');
    onChange('');
  };

  const handleSelectAccount = (accountId: string, accountName: string) => {
    onChange(accountId);
    setInputValue(accountName);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      if (filteredAccounts[selectedIndex]) {
        const account = filteredAccounts[selectedIndex];
        handleSelectAccount(account.id, account.name);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault();
      if (filteredAccounts.length > 0) {
        setSelectedIndex(prev => (prev < filteredAccounts.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Tab' && showSuggestions && selectedIndex >= 0) {
      e.preventDefault();
      if (filteredAccounts[selectedIndex]) {
        const account = filteredAccounts[selectedIndex];
        handleSelectAccount(account.id, account.name);
        // Move focus to the next form field
        const form = inputRef.current?.form;
        if (form) {
          const inputs = Array.from(form.elements) as HTMLElement[];
          const currentIndex = inputs.indexOf(inputRef.current as HTMLElement);
          if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
            (inputs[currentIndex + 1] as HTMLElement).focus();
          }
        }
      }
    }
  };

  const androidStyles = isAndroid ? {
    height: '56px',
    fontSize: '16px',
    width: '100%',
    borderRadius: '8px',
    padding: '12px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #cccccc'
  } : {};

  const labelStyles = isAndroid ? {
    fontSize: '16px',
    marginBottom: '8px',
    display: 'block'
  } : {};

  return (
    <div className={`account-input-container ${className}`}>
      {label && (
        <label htmlFor={`account-input-${label.replace(/\s+/g, '-').toLowerCase()}`} style={labelStyles}>
          {label}{required && <span className="required">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        id={label ? `account-input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`account-input ${isAndroid ? 'android-input' : ''}`}
        autoComplete="off"
        required={required}
        style={androidStyles}
      />

      {showSuggestions && (
        <div ref={suggestionsRef} className="account-suggestions">
          {filteredAccounts.length > 0 ? (
            <>
              {filteredAccounts.map((account, index) => (
                <div
                  key={account.id}
                  className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleSelectAccount(account.id, account.name)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {account.name} ({formatNumber(account.balance)})
                </div>
              ))}
            </>
          ) : (
            <div className="suggestion-item">
              <span>No matching accounts.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountInput;
