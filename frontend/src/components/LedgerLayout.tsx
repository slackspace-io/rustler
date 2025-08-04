import { useState } from 'react';
import AccountSidebar from './accounts/AccountSidebar';
import AccountLedger from './transactions/AccountLedger';

const LedgerLayout = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
  };

  return (
    <div className="ledger-layout">
      <div className="ledger-sidebar">
        <AccountSidebar
          selectedAccountId={selectedAccountId}
          onSelectAccount={handleSelectAccount}
        />
      </div>
      <div className="ledger-content">
        {selectedAccountId ? (
          <AccountLedger accountId={selectedAccountId} />
        ) : (
          <div className="no-account-selected">
            <p>Please select an account from the sidebar to view transactions.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LedgerLayout;
