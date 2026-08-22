import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './MeasureOverview.css';
import { Skeleton, EmptyState } from '../ui/Feedback';
import { useToast } from '../ui/Toast';
import useAsync from '../../hooks/useAsync';
import AssignPanel, { UNASSIGNED } from './AssignPanel';
import {
  fetchCRSPLevelData,
  fetchMiniChartData,
  fetchMeasureStratification,
  fetchMeasureStratificationRace,
  fetchMeasureStratificationEthnicity,
} from '../../services/workflowService';
import {
  num, shortId, statusFor, STATUS_TONE, sampleProviders, sampleTrend,
  sampleEquity, neededToGoal, openGaps,
} from './v2utils';

const fmt = (v) => Math.round(num(v)).toLocaleString();
const gapOf = (rate, goal) => Math.round((num(rate) - num(goal)) * 10) / 10;
const toneOf = (rate, goal) => STATUS_TONE[statusFor(rate, goal)] || 'below';

const Icon = ({ name, size = 15 }) => {
  const paths = {
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    trend: <><path d="m4 15 4-4 4 3 7-8"/><path d="M15 6h4v4"/></>,
    gaps: <><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
};

const TrendChart = ({ rows, goal }) => {
  if (!rows?.length) return <EmptyState icon="—" title="No trend available" hint="Current performance is still shown above." />;
  const W = 760; const H = 190; const left = 30; const right = 30; const top = 18; const bottom = 35;
  const values = rows.map((r) => num(r.rate));
  const min = Math.max(0, Math.min(...values, goal) - 8); const max = Math.min(100, Math.max(...values, goal) + 8);
  const x = (i) => left + (i / Math.max(1, rows.length - 1)) * (W - left - right);
  const y = (v) => top + ((max - v) / Math.max(1, max - min)) * (H - top - bottom);
  const points = rows.map((r, i) => `${x(i)},${y(num(r.rate))}`).join(' ');
  const area = `${left},${H - bottom} ${points} ${W - right},${H - bottom}`;
  return (
    <svg className="mov-trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Measure rate trend compared with goal">
      {[0, .5, 1].map((p) => <line key={p} x1={left} x2={W-right} y1={top + p*(H-top-bottom)} y2={top + p*(H-top-bottom)} className="mov-gridline" />)}
      <line x1={left} x2={W-right} y1={y(goal)} y2={y(goal)} className="mov-goalline" />
      <text x={W-right} y={y(goal)-7} textAnchor="end" className="mov-goallabel">Goal {goal}%</text>
      <polygon points={area} className="mov-area" />
      <polyline points={points} className="mov-line" />
      {rows.map((r, i) => <g key={`${r.month}-${i}`}><circle cx={x(i)} cy={y(num(r.rate))} r={i === rows.length-1 ? 5 : 3} className={i === rows.length-1 ? 'mov-dot is-last' : 'mov-dot'} /><text x={x(i)} y={H-10} textAnchor="middle" className="mov-month">{String(r.month || '').split('-')[0]}</text></g>)}
    </svg>
  );
};

const MeasureOverview = ({ token, selectedMonth, measure, onOpenWorklist, breadcrumb }) => {
  const [query, setQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('All');
  const [assignScope, setAssignScope] = useState(null);
  const toast = useToast();
  const goal = num(measure?.goal_50th); const rate = num(measure?.rate); const gap = gapOf(rate, goal);
  const tone = toneOf(rate, goal); const eligible = num(measure?.denominator); const compliant = num(measure?.numerator);
  const open = openGaps(measure); const need = neededToGoal(measure);

  const { data, loading } = useAsync(async () => {
    try {
      const [providers, trend, ageRaw, raceRaw, ethRaw] = await Promise.all([
        fetchCRSPLevelData(measure.measure_id, token), fetchMiniChartData(measure.measure_id, token),
        fetchMeasureStratification(measure.measure_id, token), fetchMeasureStratificationRace(measure.measure_id, token),
        fetchMeasureStratificationEthnicity(measure.measure_id, token),
      ]);
      if (!providers?.length) throw new Error('empty');
      return {
        providers: providers.map((p) => ({ ...p, goal, overall: false })),
        trend: trend?.length ? trend : sampleTrend(measure.measure_id, rate),
        equity: {
          age: ageRaw?.[measure.measure_id]?.age || [], race: raceRaw?.[measure.measure_id]?.race || [],
          ethnicity: ethRaw?.[measure.measure_id]?.ethnicity || [],
        }, sample: false,
      };
    } catch (e) {
      return {
        providers: sampleProviders(measure.measure_id).filter((p) => p.crsp !== 'Overall').map((p) => ({ ...p, goal, overall: false })),
        trend: sampleTrend(measure.measure_id, rate), equity: sampleEquity(measure.measure_id), sample: true,
      };
    }
  }, [measure?.measure_id, token, selectedMonth], { enabled: !!measure?.measure_id && !!token });

  const providers = data?.providers || [];
  const providerStats = useMemo(() => {
    const below = providers.filter((p) => toneOf(p.rate, goal) === 'below').length;
    const at = providers.filter((p) => toneOf(p.rate, goal) === 'at').length;
    const above = providers.length - below - at;
    const totalEligible = providers.reduce((s, p) => s + num(p.denominator), 0);
    const totalOpen = providers.reduce((s, p) => s + Math.max(0, num(p.denominator) - num(p.numerator)), 0);
    return { below, at, above, totalEligible, totalOpen };
  }, [providers, goal]);

  const equityRows = useMemo(() => ['age', 'race', 'ethnicity'].flatMap((type) => (data?.equity?.[type] || []).map((x) => ({ ...x, type }))), [data?.equity]);
  const lowestEquity = [...equityRows].sort((a, b) => num(a.rate) - num(b.rate))[0];
  const filtered = providers.filter((p) => {
    const matchesQuery = p.crsp?.toLowerCase().includes(query.toLowerCase());
    const pTone = toneOf(p.rate, goal);
    return matchesQuery && (providerFilter === 'All' || providerFilter.toLowerCase() === pTone);
  }).sort((a, b) => num(a.rate) - num(b.rate));

  return (
    <div className="mov">
      <div className="mov-topnav">{breadcrumb}</div>

      <section className="mov-hero">
        <div className="mov-hero-copy">
          <div className="mov-identity"><span className={`mov-code is-${tone} mono`}>{shortId(measure?.measure_id)}</span><span className={`mov-status is-${tone}`}><i />{measure?.kpi_status || statusFor(rate, goal)}</span></div>
          <h1>{measure?.display_name}</h1>
          <p>{measure?.measure_definition || 'Performance and provider-level opportunity for this HEDIS measure.'}</p>
        </div>
        <div className="mov-score">
          <div><small>ACHIEVED RATE</small><strong className="num">{rate}%</strong></div>
          <span className={`mov-delta ${gap < 0 ? 'is-negative' : 'is-positive'} num`}>{gap >= 0 ? '↗' : '↘'} {Math.abs(gap)} pts {gap >= 0 ? 'above' : 'below'} goal</span>
          <div className="mov-goaltrack"><i className={`is-${tone}`} style={{ width: `${Math.min(100, rate)}%` }} /><b style={{ left: `${Math.min(100, goal)}%` }} /></div>
          <div className="mov-goalends"><span>0%</span><strong>Goal {goal}%</strong><span>100%</span></div>
        </div>
      </section>

      <div className="mov-stats">
        <article><span className="mov-stat-icon is-purple"><Icon name="users" /></span><div><small>Eligible members</small><strong className="num">{fmt(eligible)}</strong><em>Current denominator</em></div></article>
        <article><span className="mov-stat-icon is-green"><Icon name="target" /></span><div><small>Compliant members</small><strong className="num">{fmt(compliant)}</strong><em>{eligible ? Math.round((compliant/eligible)*100) : 0}% of eligible</em></div></article>
        <article><span className="mov-stat-icon is-red"><Icon name="gaps" /></span><div><small>Open member gaps</small><strong className="num">{fmt(open)}</strong><em>Available to work</em></div></article>
        <article><span className="mov-stat-icon is-blue"><Icon name="trend" /></span><div><small>Closures to goal</small><strong className="num">{fmt(need)}</strong><em>To reach {goal}%</em></div></article>
      </div>

      <div className="mov-context-grid">
        <section className="mov-card mov-trend-card">
          <div className="mov-card-head"><div><span className="mov-kicker">PERFORMANCE TREND</span><h2>Rate over time</h2></div><span className="mov-period">Selected period</span></div>
          {loading ? <div className="mov-loading"><Skeleton height={190} radius={12} /></div> : <TrendChart rows={data?.trend} goal={goal} />}
        </section>
        <aside className="mov-card mov-opportunity">
          <div className="mov-card-head"><div><span className="mov-kicker">MEASURE OPPORTUNITY</span><h2>Where to focus</h2></div></div>
          {loading ? <div className="mov-loading"><Skeleton height={190} radius={12} /></div> : <div className="mov-opportunity-body">
            <div className="mov-callout"><strong>{providerStats.below} providers</strong><span>are below the {goal}% goal</span></div>
            <dl>
              <div><dt>Provider population</dt><dd className="num">{fmt(providerStats.totalEligible)}</dd></div>
              <div><dt>Provider-level open gaps</dt><dd className="num">{fmt(providerStats.totalOpen)}</dd></div>
              <div><dt>Lowest equity group</dt><dd>{lowestEquity ? `${lowestEquity.group} · ${num(lowestEquity.rate)}%` : 'Not available'}</dd></div>
              <div><dt>Data confidence</dt><dd>Claims + eligibility</dd></div>
            </dl>
            <button type="button" className="btn btn-assign" onClick={() => setAssignScope({ level: 'measure' })}>Assign measure intervention</button>
          </div>}
        </aside>
      </div>

      <section className="mov-card mov-providers">
        <div className="mov-provider-head">
          <div><span className="mov-kicker">PROVIDER PERFORMANCE</span><h2>Providers in this measure</h2><p>Sorted by lowest achieved rate so the largest opportunities appear first.</p></div>
          <div className="mov-provider-tools"><label className="mov-search"><Icon name="search"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search providers" /></label></div>
        </div>
        <div className="mov-provider-filters" role="tablist" aria-label="Filter providers by status">
          {[['All', providers.length], ['Below', providerStats.below], ['At', providerStats.at], ['Above', providerStats.above]].map(([name, count]) => <button key={name} role="tab" aria-selected={providerFilter === name} className={providerFilter === name ? 'is-active' : ''} onClick={() => setProviderFilter(name)}>{name}<span className="num">{count}</span></button>)}
        </div>
        <div className="mov-table-scroll">
          {loading ? <div className="mov-provider-loading">{Array.from({length: 7}).map((_,i) => <Skeleton key={i} height={58} radius={8}/>)}</div> : filtered.length === 0 ? <EmptyState icon="—" title="No providers found" hint="Try another filter or search." /> : <table className="mov-table">
            <thead><tr><th>Provider</th><th>Achieved</th><th>Goal</th><th>Gap</th><th>Eligible</th><th>Compliant</th><th>Open members</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{filtered.map((p, i) => { const pGap = gapOf(p.rate, goal); const pTone = toneOf(p.rate, goal); const pOpen = Math.max(0, num(p.denominator)-num(p.numerator)); return <tr key={`${p.crsp}-${i}`}>
              <td><span className="mov-provider"><i>{p.crsp?.split(/\s+/).map((x) => x[0]).join('').slice(0,2)}</i><span><strong>{p.crsp}</strong><small>CRSP provider</small></span></span></td>
              <td><strong className="num mov-rate">{num(p.rate)}%</strong></td><td className="num">{goal}%</td><td className={`num ${pGap < 0 ? 'is-negative' : 'is-positive'}`}>{pGap >= 0 ? '+' : ''}{pGap} pts</td><td className="num">{fmt(p.denominator)}</td><td className="num">{fmt(p.numerator)}</td><td><strong className="num">{fmt(pOpen)}</strong><small> open</small></td><td><span className={`mov-row-status is-${pTone}`}><i />{statusFor(p.rate, goal)}</span></td>
              <td><span className="mov-actions"><button type="button" className="btn btn-assign btn-sm" onClick={() => setAssignScope({ level: 'provider', provider: p })}>Assign intervention</button><button type="button" className="btn btn-primary btn-sm" onClick={() => onOpenWorklist(measure, p, null)}>Open members <Icon name="arrow" size={13}/></button></span></td>
            </tr>;})}</tbody>
          </table>}
        </div>
        {data?.sample && !loading && <p className="mov-sample">Showing representative provider data because the live workflow is unavailable.</p>}
      </section>

      {assignScope && createPortal(<AssignPanel measure={measure} providers={providers} equity={data?.equity || {age:[],race:[],ethnicity:[]}} scope={assignScope} token={token} selectedMonth={selectedMonth} onClose={() => setAssignScope(null)} onAssign={(payload) => { setAssignScope(null); toast({type:'success', message:`${payload.preview.created.toLocaleString()} tasks queued · ${payload.assignedTo === UNASSIGNED ? 'unassigned pool' : payload.assignedTo}`}); }} />, document.body)}
    </div>
  );
};

export default MeasureOverview;
