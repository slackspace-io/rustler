import { useState } from 'react';
import BalanceOverTime from './BalanceOverTime';
import SpendingOverTime from './SpendingOverTime';

const ReportsList = () => {
  const [activeReport, setActiveReport] = useState<string>('balance-over-time');

  return (
    <div className="reports">
      <h1>Reports</h1>

      <div className="reports-navigation">
        <button
          className={activeReport === 'balance-over-time' ? 'active' : ''}
          onClick={() => setActiveReport('balance-over-time')}
        >
          Balance Over Time
        </button>
        <button
          className={activeReport === 'spending-over-time' ? 'active' : ''}
          onClick={() => setActiveReport('spending-over-time')}
        >
          Spending Over Time
        </button>
      </div>

      <div className="report-content">
        {activeReport === 'balance-over-time' && <BalanceOverTime />}
        {activeReport === 'spending-over-time' && <SpendingOverTime />}
      </div>
    </div>
  );
};

export default ReportsList;
