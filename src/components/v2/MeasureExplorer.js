import { useState, useRef, useMemo, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './MeasureExplorer.css';
import AssignPanel, { UNASSIGNED } from './AssignPanel';
import { Skeleton, ErrorState, EmptyState } from '../ui/Feedback';
import { useToast } from '../ui/Toast';
import useAsync from '../../hooks/useAsync';
import {
  fetchAllMeasuresGrid,
  fetchCRSPLevelData,
  fetchMeasureStratification,
  fetchMeasureStratificationRace,
  fetchMeasureStratificationEthnicity,
  fetchMiniChartData,
} from '../../services/workflowService';
import {
  num, shortId, statusFor, STATUS_TONE,
  SAMPLE_MEASURES, sampleProviders, sampleEquity, sampleTrend,
} from './v2utils';
import { MiniTrend } from './OverviewExplore';

const toneFor = (rate, goal) => STATUS_TONE[statusFor(rate, goal)] || 'below';

const RateBadge = ({ rate, goal }) => (
  <span className={`mex-rate mex-rate-${toneFor(rate, goal)} num`}>{num(rate)}%</span>
);

// One global status filter (pills, top-right) drives all three columns and is
// inherited from the Overview selection.
const STATUS_FILTERS = [
  { status: 'Below Goal', tone: 'below', label: 'Below Goal' },
  { status: 'At Goal', tone: 'at', label: 'At Goal' },
  { status: 'Above Goal', tone: 'above', label: 'Above Goal' },
];

const EQUITY_SECTIONS = [
  { key: 'age', title: 'AGE' },
  { key: 'race', title: 'RACE' },
  { key: 'ethnicity', title: 'ETHNICITY' },
];

const byRateAsc = (a, b) => num(a.rate) - num(b.rate); // worst (lowest rate) first

const STATUS_LABEL = { 'Below Goal': 'Below goal', 'At Goal': 'At goal', 'Above Goal': 'Above goal' };
const countByStatus = (rows, fallbackGoal) =>
  rows.reduce((acc, r) => { acc[statusFor(r.rate, r.goal ?? fallbackGoal)] += 1; return acc; },
    { 'Above Goal': 0, 'At Goal': 0, 'Below Goal': 0 });

// The active measure's card carries the full detail (rate, gap, trend,
// numerator/denominator) — the same numbers as the Overview's selected panel,
// living right where the drill starts instead of a separate summary bar.
const ActiveMeasureCard = ({ measure, token, selectedMonth, nodeRef, onAssign }) => {
  const rate = num(measure?.rate), goal = num(measure?.goal_50th);
  const gap = Math.round((rate - goal) * 10) / 10;
  const tone = toneFor(rate, goal);
  const numerator = num(measure?.numerator);
  const denominator = num(measure?.denominator);
  const nonCompliant = Math.max(0, denominator - numerator);

  const { data: trend, loading: trendLoading } = useAsync(
    () => fetchMiniChartData(measure.measure_id, token).catch(() => []),
    [measure?.measure_id, selectedMonth], { enabled: !!token && !!measure?.measure_id }
  );
  const trendData = trend && trend.length >= 2 ? trend : sampleTrend(measure?.measure_id, rate);

  if (!measure) return null;
  return (
    <div ref={nodeRef} className="mex-card mex-card-detail is-active">
      <div className="mex-detail-head">
        <span className="mex-card-id mono">{shortId(measure.measure_id)}</span>
        <RateBadge rate={measure.rate} goal={measure.goal_50th} />
      </div>
      <h3 className="mex-detail-name">{measure.display_name}</h3>
      {measure.measure_definition && <p className="mex-detail-def">{measure.measure_definition}</p>}

      <div className="mex-detail-rate">
        <span className="num">{rate}%</span>
        <span className={`mex-detail-gap mex-detail-gap-${gap >= 0 ? 'pos' : 'neg'} num`}>
          {gap === 0 ? 'at goal' : `${gap > 0 ? '↗' : '↘'} ${Math.abs(gap)} pts ${gap > 0 ? 'above' : 'below'} goal`}
        </span>
      </div>
      <div className="mex-goalbar" title={`Goal ${goal}%`}>
        <span className={`mex-goalbar-fill mex-bar-${tone}`} style={{ width: `${Math.min(100, Math.max(0, rate))}%` }} />
        {goal > 0 && <span className="mex-goalbar-marker" style={{ left: `${Math.min(100, goal)}%` }} />}
      </div>

      {trendLoading ? <Skeleton height={70} radius={8} style={{ marginTop: 12 }} /> : <MiniTrend data={trendData} />}

      {denominator > 0 && (
        <div className="mex-detail-stats">
          <div><span className="mex-detail-k">Numerator</span><span className="mex-detail-v num">{numerator.toLocaleString()}</span></div>
          <div><span className="mex-detail-k">Denominator</span><span className="mex-detail-v num">{denominator.toLocaleString()}</span></div>
          <div><span className="mex-detail-k">Non-compliant</span><span className="mex-detail-v num is-neg">{nonCompliant.toLocaleString()}</span></div>
          <div><span className="mex-detail-k">Goal</span><span className="mex-detail-v num">{goal}%</span></div>
        </div>
      )}

      <div className="mex-detail-assign">
        <button type="button" className="btn btn-tonal" onClick={onAssign}>
          Assign intervention · all providers
        </button>
      </div>
    </div>
  );
};

const MeasureExplorer = ({ token, selectedMonth, measure, statusFilter = 'Below Goal', onStatusFilter, onOpenWorklist, breadcrumb }) => {
  const [measureId, setMeasureId] = useState(measure?.measure_id || null);
  const [providerIdx, setProviderIdx] = useState(0); // 0 = Overall
  const [expandedEq, setExpandedEq] = useState(null); // `${key}:${i}` of expanded stratum
  const [showMeasures, setShowMeasures] = useState(false); // Measures column expanded?
  const [assignScope, setAssignScope] = useState(null); // {level, provider?} — drives AssignPanel
  const toast = useToast();

  // ── Column data ────────────────────────────────────────────
  const measuresAsync = useAsync(async () => {
    try {
      const grid = await fetchAllMeasuresGrid(token);
      if (!grid || grid.length === 0) throw new Error('empty');
      return { rows: grid, sample: false };
    } catch (e) { return { rows: SAMPLE_MEASURES, sample: true }; }
  }, [token, selectedMonth], { enabled: !!token });

  const measures = measuresAsync.data?.rows || [];
  const activeMeasure = measures.find((m) => m.measure_id === measureId) || measure || measures[0];
  const activeId = activeMeasure?.measure_id;

  const providersAsync = useAsync(async () => {
    if (!activeId) return { rows: [], sample: false };
    try {
      const crsps = await fetchCRSPLevelData(activeId, token);
      const rows = [
        { crsp: 'Overall', rate: num(activeMeasure?.rate), goal: num(activeMeasure?.goal_50th), overall: true },
        ...crsps.map((c) => ({ ...c, goal: num(activeMeasure?.goal_50th) })),
      ];
      if (rows.length <= 1) throw new Error('empty');
      return { rows, sample: false };
    } catch (e) {
      return { rows: sampleProviders(activeId).map((p) => ({ ...p, goal: num(activeMeasure?.goal_50th), overall: p.crsp === 'Overall' })), sample: true };
    }
  }, [activeId, token, selectedMonth], { enabled: !!activeId });

  const providers = providersAsync.data?.rows || [];

  const equityAsync = useAsync(async () => {
    if (!activeId) return { age: [], race: [], ethnicity: [], sample: false };
    try {
      const [a, r, e] = await Promise.all([
        fetchMeasureStratification(activeId, token),
        fetchMeasureStratificationRace(activeId, token),
        fetchMeasureStratificationEthnicity(activeId, token),
      ]);
      const age = a?.[activeId]?.age || [];
      const race = r?.[activeId]?.race || [];
      const ethnicity = e?.[activeId]?.ethnicity || [];
      if (age.length + race.length + ethnicity.length === 0) throw new Error('empty');
      return { age, race, ethnicity, sample: false };
    } catch (e) { return { ...sampleEquity(activeId), sample: true }; }
  }, [activeId, token, selectedMonth], { enabled: !!activeId });

  const equity = equityAsync.data || { age: [], race: [], ethnicity: [] };
  const goal = num(activeMeasure?.goal_50th);

  // ── Shared status filter applied to all three columns, worst-first ─────────
  const measuresFiltered = useMemo(
    () => measures.filter((m) => m.kpi_status === statusFilter).sort(byRateAsc),
    [measures, statusFilter]
  );
  const providersFiltered = useMemo(() => {
    const overall = providers.filter((p) => p.overall);
    const rest = providers
      .filter((p) => !p.overall && statusFor(p.rate, p.goal ?? goal) === statusFilter)
      .sort(byRateAsc);
    return [...overall, ...rest];
  }, [providers, statusFilter, goal]);
  const equityFiltered = useMemo(() => {
    const f = {};
    EQUITY_SECTIONS.forEach(({ key }) => {
      f[key] = (equity[key] || [])
        .filter((g) => statusFor(g.rate, g.goal ?? goal) === statusFilter)
        .sort(byRateAsc);
    });
    return f;
  }, [equity, statusFilter, goal]);

  const activeProvider = providersFiltered[providerIdx] || providersFiltered[0];

  const pickMeasure = useCallback((id) => { setMeasureId(id); setProviderIdx(0); setShowMeasures(false); }, []);

  // The Overall row isn't a provider — assigning against it is a measure-wide fan-out.
  const openAssign = useCallback((p) => setAssignScope(p && !p.overall ? { level: 'provider', provider: p } : { level: 'measure' }), []);

  // No assignments API yet, so this confirms the scope rather than persisting it.
  const runAssign = useCallback((payload) => {
    setAssignScope(null);
    const { preview, scope, assignedTo } = payload;
    const where = scope.stratum ? scope.stratum.group
      : scope.providers ? `${scope.providers.length} providers`
      : scope.crsp || 'all providers';
    toast({ type: 'success', message: `${preview.created.toLocaleString()} tasks queued for ${where} · ${assignedTo === UNASSIGNED ? 'unassigned pool' : assignedTo}` });
  }, [toast]);

  // Reset selected provider, expanded stratum, and the measures list when the
  // measure or filter changes (Overall = 0).
  useEffect(() => { setProviderIdx(0); setExpandedEq(null); setShowMeasures(false); }, [activeId, statusFilter]);

  // If the active measure falls outside the current filter, snap to the first
  // matching measure so providers/equity stay coherent.
  useEffect(() => {
    if (measuresFiltered.length && !measuresFiltered.some((m) => m.measure_id === activeId)) {
      setMeasureId(measuresFiltered[0].measure_id);
    }
  }, [measuresFiltered, activeId]);

  // ── Connector geometry ─────────────────────────────────────
  // Anchors are read from the live DOM; we store the computed paths in state but
  // ONLY write when they actually change, so the layout effect + ResizeObserver
  // can't drive an infinite update loop.
  const boardRef = useRef(null);
  const nodeRefs = useRef({});
  const setNode = (key) => (el) => { if (el) nodeRefs.current[key] = el; };
  const [conn, setConn] = useState({ w: 0, h: 0, mp: [], pe: [] });
  const connRef = useRef(conn);

  const ageN = equityFiltered.age.length;
  const raceN = equityFiltered.race.length;
  const ethN = equityFiltered.ethnicity.length;
  const provN = providersFiltered.length;

  const recompute = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const b = board.getBoundingClientRect();
    const W = board.clientWidth;
    const H = board.clientHeight;
    const anchor = (key, side) => {
      const el = nodeRefs.current[key];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: (side === 'right' ? r.right : r.left) - b.left, y: r.top + r.height / 2 - b.top };
    };
    const curve = (a, c) => {
      if (!a || !c) return null;
      const dx = Math.max(40, (c.x - a.x) * 0.5);
      return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${(a.x + dx).toFixed(1)} ${a.y.toFixed(1)}, ${(c.x - dx).toFixed(1)} ${c.y.toFixed(1)}, ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
    };
    const from = anchor(`m:${activeId}`, 'right');
    const mp = [];
    for (let i = 0; i < provN; i++) { const c = curve(from, anchor(`p:${i}`, 'left')); if (c) mp.push(c); }
    const pFrom = anchor(`p:${providerIdx}`, 'right');
    const pe = [];
    EQUITY_SECTIONS.forEach(({ key }) => {
      const n = key === 'age' ? ageN : key === 'race' ? raceN : ethN;
      for (let i = 0; i < n; i++) { const c = curve(pFrom, anchor(`e:${key}:${i}`, 'left')); if (c) pe.push(c); }
    });
    const prev = connRef.current;
    if (prev.w === W && prev.h === H && prev.mp.join('|') === mp.join('|') && prev.pe.join('|') === pe.join('|')) return;
    const next = { w: W, h: H, mp, pe };
    connRef.current = next;
    setConn(next);
  }, [activeId, providerIdx, provN, ageN, raceN, ethN, expandedEq]);

  useLayoutEffect(() => {
    recompute();
    const board = boardRef.current;
    if (!board) return undefined;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(board);
    // Columns 1 & 2 are sticky, so their board-relative position shifts as the
    // page scrolls — recompute (rAF-throttled) so the connectors stay attached.
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; recompute(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [recompute]);

  const loading = measuresAsync.loading || providersAsync.loading || equityAsync.loading;

  const renderMeasureCard = (m) => {
    const active = m.measure_id === activeId;
    const r = num(m.rate);
    return (
      <button key={m.measure_id} ref={setNode(`m:${m.measure_id}`)}
        className={`mex-card ${active ? 'is-active' : ''}`} onClick={() => pickMeasure(m.measure_id)}>
        <span className="mex-card-main">
          <span className="mex-card-body">
            <span className="mex-card-id mono">{shortId(m.measure_id)}</span>
            <span className="mex-card-name">{m.display_name}</span>
          </span>
          <RateBadge rate={m.rate} goal={m.goal_50th} />
        </span>
        <span className="mex-card-bar" aria-hidden="true">
          <span className={`mex-card-bar-fill mex-bar-${toneFor(m.rate, m.goal_50th)}`} style={{ width: `${Math.min(100, Math.max(2, r))}%` }} />
        </span>
      </button>
    );
  };

  if (measuresAsync.error) {
    return <ErrorState message="Couldn't load the explorer." onRetry={measuresAsync.refetch} />;
  }

  return (
    <div className="mex">
      <div className="mex-toolbar">
        <div className="mex-toolbar-left">{breadcrumb}</div>
        <div className="mex-pills" role="group" aria-label="Filter by goal status">
          {STATUS_FILTERS.map((f) => (
            <button key={f.status} type="button"
              className={`mex-pill mex-pill-${f.tone} ${statusFilter === f.status ? 'is-active' : ''}`}
              aria-pressed={statusFilter === f.status} onClick={() => onStatusFilter && onStatusFilter(f.status)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mex-board" ref={boardRef}>
        {/* Connector overlay */}
        <svg className="mex-links" width={conn.w} height={conn.h} aria-hidden="true">
          {conn.mp.map((d, i) => <path key={`mp${i}`} d={d} className="mex-link mex-link-mp" />)}
          {conn.pe.map((d, i) => <path key={`pe${i}`} d={d} className="mex-link mex-link-pe" />)}
        </svg>

        {/* Column 1 — Measures */}
        <section className="mex-col mex-col-sticky">
          <div className="mex-col-head">
            <div>
              <h2 className="mex-col-title">Measures</h2>
              <span className="mex-col-sub">Sorted by lowest rate · {measuresFiltered.length}</span>
            </div>
          </div>
          <div className="mex-list">
            {measuresAsync.loading ? (
              [...Array(6)].map((_, i) => <Skeleton key={i} height={62} radius={12} style={{ marginBottom: 10 }} />)
            ) : measuresFiltered.length === 0 ? (
              <EmptyState icon="—" hint="No measures in this status." />
            ) : (() => {
              const active = measuresFiltered.find((m) => m.measure_id === activeId) || measuresFiltered[0];
              const rest = measuresFiltered.filter((m) => m.measure_id !== active.measure_id);
              return (
                <>
                  <ActiveMeasureCard measure={active} token={token} selectedMonth={selectedMonth}
                    nodeRef={setNode(`m:${active.measure_id}`)} onAssign={() => openAssign(null)} />
                  {rest.length > 0 && (
                    <button type="button" className="mex-showall" aria-expanded={showMeasures} onClick={() => setShowMeasures((s) => !s)}>
                      <span>{showMeasures ? 'HIDE MEASURES' : `SHOW REMAINING ${rest.length} MEASURES`}</span>
                      <span className={`mex-showall-chev ${showMeasures ? 'is-open' : ''}`} aria-hidden="true">⌄</span>
                    </button>
                  )}
                  {showMeasures && rest.map((m) => renderMeasureCard(m))}
                </>
              );
            })()}
          </div>
        </section>

        {/* Column 2 — Providers */}
        <section className="mex-col mex-col-providers">
          <div className="mex-col-head">
            <div>
              <h2 className="mex-col-title">Providers</h2>
              <span className="mex-col-sub">Overall + CRSPs · {Math.max(0, provN - 1)}</span>
            </div>
          </div>
          <div className="mex-list">
            {providersAsync.loading ? (
              [...Array(8)].map((_, i) => <Skeleton key={i} height={46} radius={10} style={{ marginBottom: 8 }} />)
            ) : providersFiltered.length === 0 ? (
              <EmptyState icon="—" hint="No providers in this status." />
            ) : (
              providersFiltered.map((p, i) => {
                const active = i === providerIdx;
                return (
                  <div key={`${p.crsp}-${i}`} ref={setNode(`p:${i}`)}
                    className={`mex-prow ${active ? 'is-active' : ''} ${p.overall ? 'is-overall' : ''}`}
                    role="button" tabIndex={0} aria-pressed={active}
                    onClick={() => setProviderIdx(i)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setProviderIdx(i); }
                    }}>
                    <span className="mex-prow-name">{p.crsp}</span>
                    <span className="mex-prow-right">
                      <RateBadge rate={p.rate} goal={p.goal} />
                      <button type="button" className="btn btn-tonal btn-sm"
                        title={p.overall ? 'Assign across all providers' : `Assign intervention · ${p.crsp}`}
                        onClick={(ev) => { ev.stopPropagation(); openAssign(p); }}>
                        Assign
                      </button>
                      <button type="button" className="btn btn-secondary btn-icon btn-sm"
                        title="Open member worklist" aria-label="Open member worklist"
                        onClick={(ev) => { ev.stopPropagation(); onOpenWorklist(activeMeasure, p, null); }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Column 3 — Equity */}
        <section className="mex-col mex-col-equity">
          <div className="mex-col-head">
            <h2 className="mex-col-title">Equity</h2>
          </div>
          {equityAsync.loading ? (
            [...Array(2)].map((_, i) => <Skeleton key={i} height={150} radius={14} style={{ marginBottom: 14 }} />)
          ) : (equity.age.length + equity.race.length + equity.ethnicity.length) === 0 ? (
            <EmptyState icon="—" hint="No equity data for this measure." />
          ) : (
            EQUITY_SECTIONS.map(({ key, title }) => {
              const full = equity[key] || [];
              if (full.length === 0) return null;
              const rows = equityFiltered[key] || [];
              const counts = countByStatus(full, goal);
              const chips = STATUS_FILTERS.filter((s) => s.status !== statusFilter && counts[s.status] > 0);
              return (
                <div key={key} className="mex-eq-card">
                  <div className="mex-eq-head">{title}</div>
                  <div className="mex-eq-list">
                    {rows.length === 0 ? (
                      <div className="mex-eq-empty">No {STATUS_LABEL[statusFilter].toLowerCase()} strata</div>
                    ) : rows.map((g, i) => {
                      const expKey = `${key}:${i}`;
                      const expanded = expandedEq === expKey;
                      const gGoal = num(g.goal ?? goal);
                      const d = Math.round((num(g.rate) - gGoal) * 10) / 10;
                      return (
                        <div key={i} className={`mex-eq-rowwrap ${expanded ? 'is-expanded' : ''}`}>
                          <button ref={setNode(`e:${key}:${i}`)} className="mex-eq-row"
                            aria-expanded={expanded} onClick={() => setExpandedEq(expanded ? null : expKey)}>
                            <span className="mex-eq-name">{g.group}</span>
                            <RateBadge rate={g.rate} goal={gGoal} />
                          </button>
                          {expanded && (
                            <div className="mex-eq-detail">
                              <div className="mex-eq-metrics">
                                <span>Rate: <b className="num">{num(g.rate)}%</b></span>
                                <span>Goal: <b className="num">{gGoal}%</b></span>
                                <span>Delta: <b className={`num ${d < 0 ? 'is-neg' : 'is-pos'}`}>{d >= 0 ? '+' : ''}{d} pts</b></span>
                              </div>
                              <div className="mex-eq-actions">
                                <button type="button" className="btn btn-primary btn-sm"
                                  onClick={() => onOpenWorklist(activeMeasure, activeProvider, { type: key, ...g, goal: gGoal })}>
                                  Open worklist
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {chips.length > 0 && (
                    <div className="mex-eq-tags">
                      {chips.map((s) => (
                        <button key={s.status} type="button" className={`mex-eq-tag mex-eq-tag-${s.tone}`}
                          onClick={() => onStatusFilter && onStatusFilter(s.status)}>
                          {STATUS_LABEL[s.status]} · {counts[s.status]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>

      {(measuresAsync.data?.sample || providersAsync.data?.sample || equityAsync.data?.sample) && !loading && (
        <div className="mex-sample">Showing sample data — live workflow unavailable.</div>
      )}

      {/* Portaled so the fixed scrim escapes the board's stacking context. The
          panel gets the unfiltered providers/equity — its own counts describe the
          whole population, not whatever the status pills are showing. */}
      {assignScope && createPortal(
        <AssignPanel measure={activeMeasure} providers={providers} equity={equity} scope={assignScope}
          onClose={() => setAssignScope(null)} onAssign={runAssign} />,
        document.body
      )}
    </div>
  );
};

export default MeasureExplorer;
