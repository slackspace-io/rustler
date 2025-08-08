import { useEffect, useMemo, useState } from 'react';
import { accountsApi, reportsApi } from '../../services/api';
import type { Account, SpendingReportRow } from '../../services/api';
import { ACCOUNT_TYPE } from '../../constants/accountTypes';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// Minimal spending over time report UI
// - Select on-budget accounts to include
// - Toggle grouping (by category group vs. category)
// - Choose period (day/week/month)
// - Pick date range (defaults to last 3 months)
// - Render results in a simple table grouped by period

const defaultStartEnd = () => {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

const SpendingOverTime = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [group, setGroup] = useState<boolean>(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [startDate, setStartDate] = useState<string>(defaultStartEnd().start);
  const [endDate, setEndDate] = useState<string>(defaultStartEnd().end);
  const [rows, setRows] = useState<SpendingReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'summed' | 'individual'>('summed');
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  // Load on-budget accounts by default and preselect all on-budget
  useEffect(() => {
    const load = async () => {
      try {
        const all = await accountsApi.getAccounts();
        const onBudget = all.filter(a => a.account_type.startsWith(ACCOUNT_TYPE.ON_BUDGET));
        setAccounts(onBudget);
        setSelectedAccounts(onBudget.map(a => a.id));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to load accounts';
        setError(msg);
      }
    };
    load();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getSpending({
        start_date: startDate,
        end_date: endDate,
        account_ids: selectedAccounts,
        group,
        period,
      });
      setRows(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch report';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const periods = useMemo(() => {
    const set = new Set(rows.map(r => r.period));
    return Array.from(set).sort();
  }, [rows]);

  const names = useMemo(() => {
    const set = new Set(rows.map(r => r.name));
    return Array.from(set).sort();
  }, [rows]);

  // Build a matrix for display: periods x names => amount
  const matrix = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      if (!map[r.period]) map[r.period] = {} as Record<string, number>;
      map[r.period][r.name] = r.amount;
    }
    return map;
  }, [rows]);

  const handleToggleAll = (checked: boolean) => {
    if (checked) setSelectedAccounts(accounts.map(a => a.id));
    else setSelectedAccounts([]);
  };

  const allSelected = selectedAccounts.length === accounts.length && accounts.length > 0;

  // Keep name selection in sync with available names
  useEffect(() => {
    setSelectedNames(prev => {
      if (prev.length === 0) return names;
      // keep intersection of previous selection with new names; if none, default to all
      const intersect = prev.filter(n => names.includes(n));
      return intersect.length > 0 ? intersect : names;
    });
  }, [names]);

  const effectiveSelectedNames = selectedNames.length > 0 ? selectedNames : names;

  const COLORS = ['#8884d8','#82ca9d','#ff7300','#a6cee3','#b2df8a','#fb9a99','#fdbf6f','#cab2d6','#1f78b4','#33a02c','#e31a1c','#ff7f00','#6a3d9a'];
  const getColor = (i: number) => COLORS[i % COLORS.length];

  // Prepare chart data for both modes. Each data point includes per-name amounts and a total of selected names
  type ChartPoint = { period: string; totalSelected: number } & Record<string, number | string>;
  const chartData = useMemo<ChartPoint[]>(() => {
    return periods.map(p => {
      const row = matrix[p] || {};
      const dataPoint: ChartPoint = { period: p, totalSelected: 0 };
      for (const n of names) {
        dataPoint[n] = (row[n] as number) || 0;
      }
      const totalSelected = effectiveSelectedNames.reduce((sum, n) => sum + ((row[n] as number) || 0), 0);
      dataPoint.totalSelected = totalSelected;
      return dataPoint;
    });
  }, [periods, matrix, names, effectiveSelectedNames]);

  return (
    <div>
      <h2>Spending Over Time</h2>
      <div className="controls" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: 16 }}>
        <div>
          <label>Start date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label>End date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div>
          <label>Period</label>
          <select value={period} onChange={e => setPeriod(e.target.value as 'day' | 'week' | 'month')}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
        <div>
          <label>Group by</label>
          <select value={group ? 'group' : 'category'} onChange={e => setGroup(e.target.value === 'group')}>
            <option value="group">Category Group</option>
            <option value="category">Category</option>
          </select>
        </div>
        <div style={{ alignSelf: 'end' }}>
          <button onClick={fetchReport} disabled={loading}>Apply</button>
        </div>
      </div>

      <div className="account-select" style={{ marginBottom: 16 }}>
        <strong>On-budget accounts</strong>
        <div>
          <label>
            <input type="checkbox" checked={allSelected} onChange={e => handleToggleAll(e.target.checked)} />
            Select All
          </label>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {accounts.map(a => {
            const checked = selectedAccounts.includes(a.id);
            return (
              <label key={a.id} style={{ border: '1px solid var(--color-border, #ddd)', padding: '4px 8px', borderRadius: 6 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => {
                    if (e.target.checked) setSelectedAccounts(prev => [...new Set([...prev, a.id])]);
                    else setSelectedAccounts(prev => prev.filter(id => id !== a.id));
                  }}
                />{' '}
                {a.name}
              </label>
            );
          })}
        </div>
      </div>

      <div className="name-select" style={{ marginBottom: 16 }}>
        <strong>{group ? 'Category Groups' : 'Categories'} to include in chart</strong>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8, marginBottom: 8 }}>
          <button type="button" onClick={() => setSelectedNames(names)} className="button small">Select All</button>
          <button type="button" onClick={() => setSelectedNames([])} className="button small">Select None</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, maxHeight: 160, overflowY: 'auto', padding: 4, border: '1px solid var(--color-border, #ddd)', borderRadius: 6 }}>
          {names.map(n => {
            const checked = selectedNames.includes(n);
            return (
              <label key={n} style={{ border: '1px solid var(--color-border, #ddd)', padding: '4px 8px', borderRadius: 6 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => {
                    if (e.target.checked) setSelectedNames(prev => [...new Set([...prev, n])]);
                    else setSelectedNames(prev => prev.filter(x => x !== n));
                  }}
                />{' '}
                {n}
              </label>
            );
          })}
        </div>
      </div>

      <div className="display-mode" style={{ marginBottom: 16 }}>
        <strong>Chart Display Mode</strong>
        <div>
          <label style={{ marginRight: 12 }}>
            <input
              type="radio"
              name="displayMode"
              value="summed"
              checked={displayMode === 'summed'}
              onChange={() => setDisplayMode('summed')}
            />{' '}
            Combined (sum of selected)
          </label>
          <label>
            <input
              type="radio"
              name="displayMode"
              value="individual"
              checked={displayMode === 'individual'}
              onChange={() => setDisplayMode('individual')}
            />{' '}
            Split by selection (one line per {group ? 'group' : 'category'})
          </label>
        </div>
      </div>

      {error && <div className="error" style={{ color: 'var(--color-error, #c00)', marginBottom: 12 }}>{error}</div>}
      {loading && <div>Loading...</div>}

      {!loading && rows.length === 0 && <div>No data for the selected filters.</div>}

      {!loading && rows.length > 0 && (
        <>
          <div className="chart-container" style={{ marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                {displayMode === 'individual' ? (
                  effectiveSelectedNames.map((n, idx) => (
                    <Line
                      key={n}
                      type="monotone"
                      dataKey={n}
                      name={n}
                      stroke={getColor(idx)}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  ))
                ) : (
                  <Line type="monotone" dataKey="totalSelected" name="Total Spending" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 6 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--color-border, #ddd)' }}>Period</th>
                {names.map(n => (
                  <th key={n} style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--color-border, #ddd)' }}>{n}</th>
                ))}
                <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--color-border, #ddd)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {periods.map(p => {
                const row = matrix[p] || {};
                const total = names.reduce((sum, n) => sum + (row[n] || 0), 0);
                return (
                  <tr key={p}>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--color-border, #eee)' }}>{p}</td>
                    {names.map(n => (
                      <td key={n} style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--color-border, #eee)' }}>
                        {(row[n] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    ))}
                    <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid var(--color-border, #eee)' }}>
                      {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
};

export default SpendingOverTime;
