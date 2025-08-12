import { useEffect, useMemo, useState } from 'react';
import { accountsApi, reportsApi } from '../../services/api';
import type { Account, InflowOutflowReportRow } from '../../services/api';
import { ACCOUNT_TYPE } from '../../constants/accountTypes';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { useRechartsRedraw } from '../../hooks/useRechartsRedraw';

const defaultStartEnd = () => {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

const InflowVsOutflow = () => {
  useRechartsRedraw();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [startDate, setStartDate] = useState<string>(defaultStartEnd().start);
  const [endDate, setEndDate] = useState<string>(defaultStartEnd().end);
  type DatePreset = 'last-month' | '3-months' | '6-months' | 'ytd' | '1-year' | 'all-time' | 'custom';
  const [activePreset, setActivePreset] = useState<DatePreset>('3-months');
  const [rows, setRows] = useState<InflowOutflowReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Chart type state
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  // Presets
  type SavedPreset = {
    id: string;
    name: string;
    selectedAccounts: string[];
    period: 'day' | 'week' | 'month';
    startDate: string;
    endDate: string;
    chartType: 'line' | 'bar';
  };
  const PRESETS_KEY = 'rustler:savedPresets:inflowVsOutflow';
  const loadSavedPresets = (): SavedPreset[] => {
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as SavedPreset[] : [];
    } catch (e) {
      console.warn('Failed to load saved presets', e);
      return [];
    }
  };
  const saveSavedPresets = (items: SavedPreset[]) => {
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(items)); } catch (e) { console.warn('Failed to save presets', e); }
  };

  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [presetName, setPresetName] = useState<string>('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const preset: SavedPreset = {
      id: String(Date.now()),
      name,
      selectedAccounts,
      period,
      startDate,
      endDate,
      chartType,
    };
    const next = [...savedPresets, preset];
    setSavedPresets(next);
    saveSavedPresets(next);
    setPresetName('');
  };
  const handleApplyPreset = () => {
    const p = savedPresets.find(x => x.id === selectedPresetId);
    if (!p) return;
    setSelectedAccounts(p.selectedAccounts);
    setPeriod(p.period);
    setStartDate(p.startDate);
    setEndDate(p.endDate);
    setChartType(p.chartType || 'line');
    fetchReport();
  };
  const handleDeletePreset = () => {
    if (!selectedPresetId) return;
    const next = savedPresets.filter(x => x.id !== selectedPresetId);
    setSavedPresets(next);
    saveSavedPresets(next);
    setSelectedPresetId('');
  };

  useEffect(() => { setSavedPresets(loadSavedPresets()); }, []);

  // Load on-budget accounts and preselect all
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
      const data = await reportsApi.getInflowOutflow({
        start_date: startDate,
        end_date: endDate,
        account_ids: selectedAccounts,
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

  const fetchReportForDates = async (s: string, e: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getInflowOutflow({
        start_date: s,
        end_date: e,
        account_ids: selectedAccounts,
        period,
      });
      setRows(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch report';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); /* initial load */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const periods = useMemo(() => {
    return [...new Set(rows.map(r => r.period))].sort();
  }, [rows]);

  const chartData = useMemo(() => periods.map(p => {
    const r = rows.find(x => x.period === p);
    return { period: p, inflow: r?.inflow || 0, outflow: r?.outflow || 0, net: (r?.inflow || 0) - (r?.outflow || 0) };
  }), [rows, periods]);

  const handleToggleAll = (checked: boolean) => {
    if (checked) setSelectedAccounts(accounts.map(a => a.id));
    else setSelectedAccounts([]);
  };
  const allSelected = selectedAccounts.length === accounts.length && accounts.length > 0;

  return (
    <div>
      <h2>Inflow vs Outflow Over Time</h2>

      <div className="controls" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: 16 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <strong>Date Range</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <button className={activePreset === 'last-month' ? 'active' : ''} onClick={async () => { setActivePreset('last-month'); const s=new Date(); const e=new Date(); s.setMonth(s.getMonth()-1); const sStr=s.toISOString().split('T')[0]; const eStr=e.toISOString().split('T')[0]; setStartDate(sStr); setEndDate(eStr); await fetchReportForDates(sStr, eStr); }}>Last Month</button>
            <button className={activePreset === '3-months' ? 'active' : ''} onClick={async () => { setActivePreset('3-months'); const s=new Date(); const e=new Date(); s.setMonth(s.getMonth()-3); const sStr=s.toISOString().split('T')[0]; const eStr=e.toISOString().split('T')[0]; setStartDate(sStr); setEndDate(eStr); await fetchReportForDates(sStr, eStr); }}>3 Months</button>
            <button className={activePreset === '6-months' ? 'active' : ''} onClick={async () => { setActivePreset('6-months'); const s=new Date(); const e=new Date(); s.setMonth(s.getMonth()-6); const sStr=s.toISOString().split('T')[0]; const eStr=e.toISOString().split('T')[0]; setStartDate(sStr); setEndDate(eStr); await fetchReportForDates(sStr, eStr); }}>6 Months</button>
            <button className={activePreset === 'ytd' ? 'active' : ''} onClick={async () => { setActivePreset('ytd'); const now=new Date(); const s=new Date(now.getFullYear(),0,1); const e=new Date(); const sStr=s.toISOString().split('T')[0]; const eStr=e.toISOString().split('T')[0]; setStartDate(sStr); setEndDate(eStr); await fetchReportForDates(sStr, eStr); }}>YTD</button>
            <button className={activePreset === '1-year' ? 'active' : ''} onClick={async () => { setActivePreset('1-year'); const s=new Date(); const e=new Date(); s.setFullYear(s.getFullYear()-1); const sStr=s.toISOString().split('T')[0]; const eStr=e.toISOString().split('T')[0]; setStartDate(sStr); setEndDate(eStr); await fetchReportForDates(sStr, eStr); }}>1 Year</button>
            <button className={activePreset === 'all-time' ? 'active' : ''} onClick={async () => { setActivePreset('all-time'); const s=new Date(); const e=new Date(); s.setFullYear(s.getFullYear()-5); const sStr=s.toISOString().split('T')[0]; const eStr=e.toISOString().split('T')[0]; setStartDate(sStr); setEndDate(eStr); await fetchReportForDates(sStr, eStr); }}>All Time</button>
          </div>
        </div>
        <div>
          <label>Start date</label>
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setActivePreset('custom'); }} />
        </div>
        <div>
          <label>End date</label>
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setActivePreset('custom'); }} />
        </div>
        <div>
          <label>Period</label>
          <select value={period} onChange={e => setPeriod(e.target.value as 'day' | 'week' | 'month')}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
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

      <div className="chart-type" style={{ marginBottom: 16 }}>
        <strong>Chart Type</strong>
        <div>
          <label style={{ marginRight: 12 }}>
            <input type="radio" name="chartType" value="line" checked={chartType === 'line'} onChange={() => setChartType('line')} />{' '}
            Line
          </label>
          <label>
            <input type="radio" name="chartType" value="bar" checked={chartType === 'bar'} onChange={() => setChartType('bar')} />{' '}
            Bar
          </label>
        </div>
      </div>

      <div className="saved-presets" style={{ marginBottom: 16 }}>
        <strong>Saved Configurations</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, marginBottom: 8 }}>
          <input type="text" placeholder="Preset name" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
          <button type="button" className="button small" onClick={handleSavePreset} disabled={!presetName.trim()}>
            Save
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={selectedPresetId} onChange={(e) => setSelectedPresetId(e.target.value)}>
            <option value="">Select a saved preset...</option>
            {savedPresets.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button type="button" className="button small" onClick={handleApplyPreset} disabled={!selectedPresetId}>Apply</button>
          <button type="button" className="button small" onClick={handleDeletePreset} disabled={!selectedPresetId}>Delete</button>
        </div>
      </div>

      {error && <div className="error" style={{ color: 'var(--color-error, #c00)', marginBottom: 12 }}>{error}</div>}
      {loading && <div>Loading...</div>}

      {!loading && rows.length === 0 && <div>No data for the selected filters.</div>}

      {!loading && rows.length > 0 && (
        <div className="chart-container" style={{ marginBottom: 16 }}>
          <ResponsiveContainer width="100%" height={360}>
            {chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="inflow" name="Inflow" stroke="#2ca02c" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="outflow" name="Outflow" stroke="#d62728" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="inflow" name="Inflow" fill="#2ca02c" />
                <Bar dataKey="outflow" name="Outflow" fill="#d62728" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default InflowVsOutflow;
