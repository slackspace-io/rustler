import { useState } from 'react';
import BalanceOverTime from './BalanceOverTime';

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
        {/* Add more report types here in the future */}
      </div>

      <div className="report-content">
        {activeReport === 'balance-over-time' && <BalanceOverTime />}
        {/* Add more report components here in the future */}
      </div>
    </div>
  );
};

export default ReportsList;
