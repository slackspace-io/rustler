import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AccountSidebar from './accounts/AccountSidebar';
import AccountLedger from './transactions/AccountLedger';

// Key for storing the selected account ID in localStorage
const SELECTED_ACCOUNT_KEY = 'rustler_selected_account_id';

const LedgerLayout = () => {
  const location = useLocation();

  // Initialize with the stored account ID from localStorage, or null if not found
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(() => {
    const storedAccountId = localStorage.getItem(SELECTED_ACCOUNT_KEY);
    return storedAccountId || null;
  });

  // State to trigger a refresh of the AccountLedger component
  const [refreshKey, setRefreshKey] = useState(0);

  // Update refreshKey when location state indicates a refresh is needed
  useEffect(() => {
    if (location.state && location.state.refresh) {
      console.log('LedgerLayout: Refresh signal received', location.state);

      // Update refreshKey to trigger a re-render of AccountLedger
      const newRefreshKey = refreshKey + 1;
      console.log('LedgerLayout: Updating refreshKey from', refreshKey, 'to', newRefreshKey);
      setRefreshKey(newRefreshKey);

      // Clear the location state to prevent refreshing on subsequent renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state, refreshKey]);

  const handleSelectAccount = (accountId: string) => {
    // Update state
    setSelectedAccountId(accountId);

    // Store in localStorage for persistence
    localStorage.setItem(SELECTED_ACCOUNT_KEY, accountId);
  };

  return (
    <div className="ledger-layout">
      <div className="ledger-sidebar">
        <AccountSidebar
          selectedAccountId={selectedAccountId}
          onSelectAccount={handleSelectAccount}
          refreshKey={refreshKey}
        />
      </div>
      <div className="ledger-content">
        {selectedAccountId ? (
          <AccountLedger accountId={selectedAccountId} refreshKey={refreshKey} />
        ) : (
          <div className="no-account-selected">
            <p>Please select an account from the sidebar to view transactions.</p>
            <p className="help-text">You can choose from both On Budget and Off Budget accounts listed in the sidebar.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LedgerLayout;
