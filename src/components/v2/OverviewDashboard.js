import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './OverviewDashboard.css';
import MonthFilter from '../MonthFilter';
import { Skeleton, EmptyState } from '../ui/Feedback';
import { useToast } from '../ui/Toast';
import useAsync from '../../hooks/useAsync';
import AssignPanel, { UNASSIGNED } from './AssignPanel';
import {
  fetchAllMeasuresGrid,
  fetchDashboardKPI,
  fetchLowestPerformingMeasures,
  fetchCRSPsNeedingAttention,
  fetchEquityAlerts,
  fetchCRSPLevelData,
} from '../../services/workflowService';
import {
  STATUS_TONE,
  num,
  shortId,
  withCustomGoals,
  SAMPLE_MEASURES,
  sampleKpis,
  sampleLowest,
  sampleCrsps,
  sampleEquityAlerts,
  sampleProviders,
  sampleMembers,
  neededToGoal,
  openGaps,
} from './v2utils';

const STATUS = [
  { key: 'all', label: 'Total metrics', status: null, tone: 'total', helper: 'Active HEDIS measures' },
  { key: 'below', label: 'Below goal', status: 'Below Goal', tone: 'below', helper: 'Needs attention' },
  { key: 'at', label: 'On goal', status: 'At Goal', tone: 'at', helper: 'Within target band' },
  { key: 'above', label: 'Above goal', status: 'Above Goal', tone: 'above', helper: 'Exceeding target' },
];

const WORK_TABS = ['Measures', 'Providers', 'Members'];
const INSIGHT_TABS = ['Measures', 'Providers', 'Equity'];
const fmt = (n) => Math.round(num(n)).toLocaleString();
const gapOf = (m) => Math.round((num(m.rate) - num(m.goal_50th)) * 10) / 10;

const Icon = ({ name, size = 16 }) => {
  const paths = {
    metrics: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    spark: <><path d="m4 15 4-4 4 3 7-8"/><path d="M15 6h4v4"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    wand: <><path d="m15 4 5 5L8 21H3v-5Z"/><path d="m13 6 5 5"/><path d="M6 3v3M4.5 4.5h3M19 16v4M17 18h4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
};

const MetricCard = ({ def, active, value, total, meta, onClick }) => {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <button type="button" className={`od-metric od-metric-${def.tone} ${active ? 'is-active' : ''}`}
      aria-pressed={active} onClick={onClick}>
      <span className="od-metric-top">
        <span className="od-metric-icon"><Icon name={def.key === 'all' ? 'metrics' : def.key === 'below' ? 'target' : 'spark'} /></span>
        <span className="od-metric-select" aria-hidden="true">{active ? '✓' : ''}</span>
      </span>
      <span className="od-metric-label">{def.label}</span>
      <span className="od-metric-value num">{value}<small>{def.key !== 'all' ? ` / ${total}` : ''}</small></span>
      <span className="od-metric-foot">
        <span>{meta || def.helper}</span>
        <strong className="num">{def.key === 'all' ? '100%' : `${pct}%`}</strong>
      </span>
      <span className="od-metric-track" aria-hidden="true"><i style={{ width: `${def.key === 'all' ? 100 : pct}%` }} /></span>
    </button>
  );
};

const PerformanceChart = ({ rows, loading, filterLabel, filterTone, onSelect }) => {
  const maxMembers = Math.max(1, ...rows.map(openGaps));
  return (
    <section className="od-card od-chart-card">
      <div className="od-section-head">
        <div><span className="od-kicker">PERFORMANCE OVERVIEW</span><h2>Goal attainment by measure</h2></div>
        <span className={`od-context-pill is-${filterTone}`}>{filterLabel}</span>
      </div>
      <div className="od-chart-legend">
        <span><i className="is-rate" />Achieved</span><span><i className="is-goal" />Goal marker</span><span><i className="is-gap" />Open members</span>
      </div>
      {loading ? (
        <div className="od-chart-loading">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={52} radius={10} />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon="✓" title="No measures in this segment" hint="Choose another status card." />
      ) : (
        <div className="od-chart" role="list" aria-label={`${filterLabel} measure performance`}>
          {rows.slice(0, 6).map((m) => {
            const rate = num(m.rate); const goal = num(m.goal_50th); const gap = gapOf(m); const open = openGaps(m);
            const tone = STATUS_TONE[m.kpi_status] || 'below';
            return (
              <button type="button" className="od-chart-row" key={m.measure_id} onClick={() => onSelect(m)} role="listitem">
                <span className="od-chart-name"><strong className="mono">{shortId(m.measure_id)}</strong><span>{m.display_name}</span></span>
                <span className="od-bullet">
                  <span className="od-bullet-track"><i className={`od-bullet-fill is-${tone}`} style={{ width: `${Math.max(2, Math.min(100, rate))}%` }} /><b style={{ left: `${Math.min(100, goal)}%` }} /></span>
                  <span className="od-bullet-values"><strong className="num">{rate}%</strong><span className={`num ${gap < 0 ? 'is-negative' : 'is-positive'}`}>{gap >= 0 ? '+' : ''}{gap} pts</span><em>Goal {goal}%</em></span>
                </span>
                <span className="od-member-gap">
                  <span><strong className="num">{fmt(open)}</strong> open</span>
                  <i><b style={{ width: `${Math.max(5, (open / maxMembers) * 100)}%` }} /></i>
                </span>
                <Icon name="arrow" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

const InsightPanel = ({ activeTab, onTab, items, loading, onPick }) => (
  <aside className="od-card od-insights">
    <div className="od-section-head"><div><span className="od-kicker">DECISION SUPPORT</span><h2>Where to focus</h2></div></div>
    <div className="od-insight-tabs" role="tablist" aria-label="Insight type">
      {INSIGHT_TABS.map((t) => <button key={t} role="tab" aria-selected={activeTab === t} className={activeTab === t ? 'is-active' : ''} onClick={() => onTab(t)}>{t}</button>)}
    </div>
    <div className="od-insight-list" role="tabpanel">
      {loading ? <Skeleton height={230} radius={12} /> : items.length === 0 ? <EmptyState icon="✓" title="Nothing flagged" hint="No focus items match this status." /> : items.slice(0, 5).map((item, i) => (
        <button type="button" key={item.key || i} className="od-insight-row" onClick={() => onPick(item)}>
          <span className="od-insight-rank num">{String(i + 1).padStart(2, '0')}</span>
          <span className="od-insight-copy"><strong>{item.title}</strong><small>{item.meta}</small></span>
          <span className="od-insight-score num">{item.rate}%<small>{item.delta}</small></span>
          <Icon name="arrow" size={14} />
        </button>
      ))}
    </div>
    <div className="od-insight-note"><Icon name="wand" /><span>Insights update with the selected metric card.</span></div>
  </aside>
);

const OverviewDashboard = ({ token, selectedMonth, onMonthChange, availableMonths, onInvestigate, onOpenProvider, onOpenMember }) => {
  const [statusKey, setStatusKey] = useState('all');
  const [insightTab, setInsightTab] = useState('Measures');
  const [workTab, setWorkTab] = useState('Measures');
  const [search, setSearch] = useState('');
  const [selectedMeasureId, setSelectedMeasureId] = useState(null);
  const [assignScope, setAssignScope] = useState(null);
  const toast = useToast();

  const { data, loading, refetch } = useAsync(async () => {
    try {
      const [grid, kpis, lowest, crsps, equity] = await Promise.all([
        fetchAllMeasuresGrid(token), fetchDashboardKPI(token), fetchLowestPerformingMeasures(token),
        fetchCRSPsNeedingAttention(token), fetchEquityAlerts(token),
      ]);
      if (!grid?.length) throw new Error('empty');
      return { grid: withCustomGoals(grid), kpis, lowest, crsps, equity, sample: false };
    } catch (e) {
      return { grid: withCustomGoals(SAMPLE_MEASURES), kpis: sampleKpis(), lowest: sampleLowest(), crsps: sampleCrsps(), equity: sampleEquityAlerts(), sample: true };
    }
  }, [token, selectedMonth], { enabled: !!token });

  const grid = data?.grid || [];
  const activeDef = STATUS.find((x) => x.key === statusKey) || STATUS[0];
  const filtered = useMemo(() => {
    const rows = activeDef.status ? grid.filter((m) => m.kpi_status === activeDef.status) : grid;
    return [...rows].sort((a, b) => {
      if (statusKey === 'above') return gapOf(b) - gapOf(a);
      return gapOf(a) - gapOf(b);
    });
  }, [grid, activeDef.status, statusKey]);

  useEffect(() => {
    if (!filtered.some((m) => m.measure_id === selectedMeasureId)) setSelectedMeasureId(filtered[0]?.measure_id || null);
  }, [filtered, selectedMeasureId]);
  const selectedMeasure = grid.find((m) => m.measure_id === selectedMeasureId) || filtered[0] || grid[0];

  const providersAsync = useAsync(async () => {
    if (!selectedMeasure) return [];
    try {
      const rows = await fetchCRSPLevelData(selectedMeasure.measure_id, token);
      if (!rows?.length) throw new Error('empty');
      return rows.map((p) => ({ ...p, goal: num(selectedMeasure.goal_50th) }));
    } catch (e) {
      return sampleProviders(selectedMeasure.measure_id).filter((p) => p.crsp !== 'Overall').map((p) => ({ ...p, goal: num(selectedMeasure.goal_50th) }));
    }
  }, [selectedMeasure?.measure_id, token, selectedMonth], { enabled: !!selectedMeasure && !!token });
  const providers = providersAsync.data || [];
  const selectedProvider = providers[0] || null;
  const members = useMemo(() => sampleMembers(24, selectedProvider?.crsp), [selectedProvider?.crsp, selectedMeasure?.measure_id]);

  const counts = useMemo(() => {
    const c = { below: 0, at: 0, above: 0 };
    grid.forEach((m) => { const tone = STATUS_TONE[m.kpi_status]; if (tone) c[tone] += 1; });
    return c;
  }, [grid]);
  const eligible = grid.reduce((s, m) => s + num(m.denominator), 0);
  const totalNeed = grid.filter((m) => m.kpi_status === 'Below Goal').reduce((s, m) => s + neededToGoal(m), 0);
  const avgAbove = counts.above ? grid.filter((m) => m.kpi_status === 'Above Goal').reduce((s, m) => s + gapOf(m), 0) / counts.above : 0;
  const metricMeta = { all: `${fmt(eligible)} eligible members`, below: `${fmt(totalNeed)} closures to goal`, at: 'Stable this period', above: `Avg +${avgAbove.toFixed(1)} pts` };

  const insightItems = useMemo(() => {
    const allowed = new Set(filtered.map((m) => m.measure_id));
    if (insightTab === 'Providers') {
      return (data?.crsps || []).filter((x) => statusKey === 'all' || allowed.has(x.measure_id)).map((x, i) => ({ key: `p-${i}`, title: x.crsp_name, meta: `${shortId(x.measure_id)} · provider opportunity`, rate: num(x.rate), delta: 'performance', measureId: x.measure_id, kind: 'provider', source: x }));
    }
    if (insightTab === 'Equity') {
      return (data?.equity || []).filter((x) => statusKey === 'all' || allowed.has(x.measure_id)).map((x, i) => ({ key: `e-${i}`, title: x.race_strat, meta: `${shortId(x.measure_id)} · equity gap`, rate: num(x.rate), delta: 'stratified rate', measureId: x.measure_id, kind: 'equity', source: x }));
    }
    const source = (data?.lowest || []).filter((x) => statusKey === 'all' || allowed.has(x.measure_id));
    const rows = source.length ? source : filtered;
    return rows.map((x) => ({ key: x.measure_id, title: x.display_name, meta: `${shortId(x.measure_id)} · measure opportunity`, rate: num(x.rate), delta: 'achieved', measureId: x.measure_id, kind: 'measure', source: x }));
  }, [insightTab, data, filtered, statusKey]);

  const chooseInsight = (item) => {
    const m = grid.find((x) => x.measure_id === item.measureId);
    if (!m) return;

    setSelectedMeasureId(m.measure_id);

    if (item.kind === 'provider') {
      const provider = {
        ...item.source,
        crsp: item.source?.crsp || item.source?.crsp_name,
        goal: num(m.goal_50th),
        overall: false,
      };
      setWorkTab('Providers');
      onOpenProvider?.(m, provider);
      return;
    }

    if (item.kind === 'equity') {
      const strat = {
        group: item.source?.race_strat,
        type: 'race',
        rate: num(item.source?.rate),
        goal: num(m.goal_50th),
      };
      setWorkTab('Measures');
      onOpenProvider?.(m, null, strat);
      return;
    }

    setWorkTab('Measures');
    onInvestigate?.(m);
  };

  const openMeasure = (m) => {
    setSelectedMeasureId(m.measure_id);
    setWorkTab('Measures');
    onInvestigate?.(m);
  };
  const workRows = workTab === 'Measures' ? filtered : workTab === 'Providers' ? providers : members;
  const searchedRows = workRows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));

  const openProvider = (p) => onOpenProvider?.(selectedMeasure, { ...p, overall: false });
  const providerForMember = (m) => selectedProvider || { crsp: m?.crsp || 'Network provider', rate: num(selectedMeasure?.rate), goal: num(selectedMeasure?.goal_50th), denominator: members.length, numerator: members.filter((x) => x.compliant).length, overall: false };
  const openMember = (m) => onOpenMember?.(selectedMeasure, providerForMember(m), m);

  return (
    <div className="od">
      <header className="od-head">
        <div><span className="od-kicker">QUALITY MANAGEMENT</span><h1>HEDIS performance overview</h1><p>Monitor goals, find member gaps, and move directly into action.</p></div>
        <MonthFilter selectedMonth={selectedMonth} onMonthChange={onMonthChange} availableMonths={availableMonths} />
      </header>

      {data?.sample && !loading && <div className="od-data-note" role="status"><span>Live workflow unavailable — showing representative data.</span><button onClick={refetch}>Retry</button></div>}

      <div className="od-metrics" role="group" aria-label="Filter dashboard by goal status">
        {STATUS.map((def) => {
          const value = def.key === 'all' ? grid.length : counts[def.key];
          return <MetricCard key={def.key} def={def} active={statusKey === def.key} value={loading ? '—' : value} total={grid.length} meta={metricMeta[def.key]} onClick={() => setStatusKey(def.key)} />;
        })}
      </div>

      <div className="od-analysis-grid">
        <PerformanceChart rows={filtered} loading={loading} filterLabel={activeDef.label} filterTone={activeDef.tone} onSelect={openMeasure} />
        <InsightPanel activeTab={insightTab} onTab={setInsightTab} items={insightItems} loading={loading} onPick={chooseInsight} />
      </div>

      <section className="od-card od-worklist">
        <div className="od-work-head">
          <div><span className="od-kicker">ACTION WORKLIST</span><h2>Explore and take action</h2><p>{activeDef.label} · drill from measures to providers to members</p></div>
          <div className="od-work-tools">
            <label className="od-search"><Icon name="search" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${workTab.toLowerCase()}`} /></label>
          </div>
        </div>
        <div className="od-work-tabs" role="tablist" aria-label="Worklist level">
          {WORK_TABS.map((tab) => <button key={tab} role="tab" aria-selected={workTab === tab} className={workTab === tab ? 'is-active' : ''} onClick={() => setWorkTab(tab)}>{tab}<span className="num">{tab === 'Measures' ? filtered.length : tab === 'Providers' ? providers.length : members.length}</span></button>)}
        </div>
        <div className="od-table-scroll">
          {loading || (workTab === 'Providers' && providersAsync.loading) ? <div className="od-table-loading">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={55} radius={8} />)}</div> : searchedRows.length === 0 ? <EmptyState icon="—" title={`No ${workTab.toLowerCase()} found`} hint="Try a different status or search." /> : (
            <table className="od-table">
              {workTab === 'Measures' && <><thead><tr><th>Measure</th><th>Achieved</th><th>Goal</th><th>Gap</th><th>Member gap</th><th>Status</th><th>Actions</th></tr></thead><tbody>{searchedRows.slice(0, 10).map((m) => { const tone = STATUS_TONE[m.kpi_status] || 'below'; const gap = gapOf(m); const openMeasure = () => { setSelectedMeasureId(m.measure_id); onInvestigate?.(m); }; return <tr key={m.measure_id} className={`od-measure-row ${m.measure_id === selectedMeasureId ? 'is-selected' : ''}`} tabIndex={0} onClick={openMeasure} onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMeasure(); } }}><td><span className="od-entity"><i className={`is-${tone}`}>{shortId(m.measure_id).slice(0, 3)}</i><span><strong>{m.display_name}</strong><small className="mono">{shortId(m.measure_id)}</small></span></span></td><td className="num od-strong">{num(m.rate)}%</td><td className="num">{num(m.goal_50th)}%</td><td className={`num ${gap < 0 ? 'is-negative' : 'is-positive'}`}>{gap >= 0 ? '+' : ''}{gap} pts</td><td><strong className="num">{fmt(openGaps(m))}</strong><small> open</small></td><td><span className={`od-status is-${tone}`}><i />{m.kpi_status}</span></td><td><span className="od-row-actions"><button className="btn btn-assign btn-sm" onClick={(e) => { e.stopPropagation(); setAssignScope({ measure: m, level: 'measure' }); }}>Assign intervention</button><button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); openMeasure(); }}>Open list <Icon name="arrow" size={13} /></button></span></td></tr>; })}</tbody></>}
              {workTab === 'Providers' && <><thead><tr><th>Provider</th><th>Measure</th><th>Achieved</th><th>Goal</th><th>Eligible</th><th>Open members</th><th>Actions</th></tr></thead><tbody>{searchedRows.slice(0, 10).map((p, i) => { const gap = Math.round((num(p.rate) - num(p.goal)) * 10) / 10; return <tr key={`${p.crsp}-${i}`}><td><span className="od-entity"><i className="is-provider"><Icon name="users" /></i><span><strong>{p.crsp}</strong><small>CRSP provider</small></span></span></td><td><span className="mono od-code">{shortId(selectedMeasure?.measure_id)}</span></td><td className="num od-strong">{num(p.rate)}%</td><td className="num">{num(p.goal)}%</td><td className="num">{fmt(p.denominator)}</td><td className="num">{fmt(Math.max(0, num(p.denominator) - num(p.numerator)))}</td><td><span className="od-row-actions"><button className="btn btn-assign btn-sm" onClick={() => setAssignScope({ measure: selectedMeasure, level: 'provider', provider: p })}>Assign intervention</button><button className="btn btn-primary btn-sm" onClick={() => openProvider(p)}>Open list <Icon name="arrow" size={13} /></button></span></td></tr>; })}</tbody></>}
              {workTab === 'Members' && <><thead><tr><th>Member</th><th>Provider</th><th>Age</th><th>Care gap</th><th>Source</th><th>Priority</th><th>Actions</th></tr></thead><tbody>{searchedRows.slice(0, 10).map((m, i) => <tr key={`${m.memberId}-${i}`}><td><span className="od-entity"><i className="is-member">{m.memberName.split(',')[1]?.trim()[0]}{m.memberName[0]}</i><span><strong>{m.memberName}</strong><small className="mono">{m.memberId}</small></span></span></td><td>{m.crsp}</td><td className="num">{m.age}</td><td><span className={`od-status ${m.compliant ? 'is-above' : 'is-below'}`}><i />{m.compliant ? 'Closed' : 'Open'}</span></td><td>{m.source}</td><td>{m.compliant ? 'Routine' : 'High'}</td><td><span className="od-row-actions"><button className="btn btn-assign btn-sm" onClick={() => setAssignScope({ measure: selectedMeasure, level: 'provider', provider: providerForMember(m), members: [m] })}>Assign intervention</button><button className="btn btn-primary btn-sm" onClick={() => openMember(m)}>Open 360 <Icon name="arrow" size={13} /></button></span></td></tr>)}</tbody></>}
            </table>
          )}
        </div>
      </section>

      {assignScope && createPortal(<AssignPanel measure={assignScope.measure} providers={providers} equity={{ age: [], race: [], ethnicity: [] }} scope={assignScope} token={token} selectedMonth={selectedMonth} onClose={() => setAssignScope(null)} onAssign={(payload) => { setAssignScope(null); toast({ type: 'success', message: `${payload.preview.created.toLocaleString()} tasks queued · ${payload.assignedTo === UNASSIGNED ? 'unassigned pool' : payload.assignedTo}` }); }} />, document.body)}
    </div>
  );
};

export default OverviewDashboard;
