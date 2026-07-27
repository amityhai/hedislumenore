import { useState, useRef, useMemo, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './MeasureExplorer.css';
import AssignPanel, { UNASSIGNED } from './AssignPanel';
import MonthFilter from '../MonthFilter';
import { Skeleton, ErrorState, EmptyState } from '../ui/Feedback';
import { useToast } from '../ui/Toast';
import useAsync from '../../hooks/useAsync';
import {
  fetchAllMeasuresGrid,
  fetchCRSPLevelData,
  fetchMeasureStratification,
  fetchMeasureStratificationRace,
  fetchMeasureStratificationEthnicity,
} from '../../services/workflowService';
import {
  num, shortId, statusFor, STATUS_TONE, categoryOf, categoriesOf,
  SAMPLE_MEASURES, sampleProviders, sampleEquity, withCustomGoals,
} from './v2utils';
import { MeasureIntel } from './OverviewExplore';
import CategoryTabs from './CategoryTabs';

const toneFor = (rate, goal) => STATUS_TONE[statusFor(rate, goal)] || 'below';

const RateBadge = ({ rate, goal }) => (
  <span className={`mex-rate mex-rate-${toneFor(rate, goal)} num`}>{num(rate)}%</span>
);

// The rate badge paired with the goal it is judged against. The detail cards no
// longer carry the big rate line and its goal-marked bar, so the header is the
// only place left that can say what the badge's colour is measured against.
const RateVsGoal = ({ rate, goal }) => (
  <span className="mex-detail-rvg">
    {num(goal) > 0 && <span className="mex-detail-goal mono">Goal {num(goal)}%</span>}
    <RateBadge rate={rate} goal={goal} />
  </span>
);

// A bare goal-status dot — the "circled color, not full text" read carried at the
// measure/provider/stratum level now that every row is shown (no status filter).
const StatusDot = ({ rate, goal, className = '' }) => (
  <span className={`mex-dot mex-dot-${toneFor(rate, goal)} ${className}`}
    title={`${statusFor(rate, goal)} · ${num(rate)}% vs ${num(goal)}% goal`} aria-hidden="true" />
);

const EQUITY_SECTIONS = [
  { key: 'age', title: 'AGE' },
  { key: 'race', title: 'RACE' },
  { key: 'ethnicity', title: 'ETHNICITY' },
];

const byRateAsc = (a, b) => num(a.rate) - num(b.rate); // worst (lowest rate) first

// The active measure's card carries the full detail — the same read as the
// Overview's selected panel (rate, gap, trend, and the Behavior / Priority /
// Recommended-action intelligence), living right where the drill starts. It
// shares the exact MeasureIntel block so a measure reads identically on both
// surfaces. `peers` rank it; `crsps` feed its driver line.
const ActiveMeasureCard = ({ measure, token, selectedMonth, peers, crsps, nodeRef, onAssign }) => {
  const rate = num(measure?.rate), goal = num(measure?.goal_50th);
  const gap = Math.round((rate - goal) * 10) / 10;
  const tone = toneFor(rate, goal);

  if (!measure) return null;
  return (
    <div ref={nodeRef} className="mex-card mex-card-detail is-active">
      <div className="mex-detail-head">
        <span className="mex-card-idrow">
          <StatusDot rate={measure.rate} goal={measure.goal_50th} />
          <span className="mex-card-id mono">{shortId(measure.measure_id)}</span>
        </span>
        <RateVsGoal rate={measure.rate} goal={measure.goal_50th} />
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

      {/* The assign action lives inside the Recommended-action stage (seeded with
          the recommended play) — no separate footer button. */}
      <MeasureIntel measure={measure} crsps={crsps} token={token} peers={peers} selectedMonth={selectedMonth} onAssign={onAssign} />
    </div>
  );
};

// The active provider's card, kept deliberately thin: who the provider is and how
// it rates against goal on the active measure, then straight to the actions. The
// portfolio roll-up (measure counts, avg gap) and the intelligence read both live
// on the full Provider Analysis page — inlining them here buried the provider list
// below the fold and restated numbers the drill already owns.
const ActiveProviderCard = ({ provider, nodeRef, onAssign, onOpenWorklist }) => {
  if (!provider) return null;
  const overall = !!provider.overall;
  const providerName = overall ? 'All providers (Overall)' : (provider.crsp || 'Provider');
  const rate = num(provider.rate), goal = num(provider.goal);

  return (
    <div ref={nodeRef} className="mex-card mex-card-detail mex-pv-detail is-active">
      <div className="mex-detail-head">
        <span className="mex-card-idrow">
          {!overall && <StatusDot rate={rate} goal={goal} />}
          <span className="eyebrow mex-pv-eyebrow">Provider</span>
        </span>
        {/* Rate only — the goal is a property of the measure, not the provider. */}
        <RateBadge rate={rate} goal={goal} />
      </div>
      <h3 className="mex-detail-name">{providerName}</h3>

      <div className="mex-pv-actions">
        <button type="button" className="btn btn-assign btn-sm" onClick={onAssign}>Assign intervention</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={onOpenWorklist}>
          Open worklist
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const MeasureExplorer = ({ token, selectedMonth, onMonthChange, availableMonths, measure, category = null, onCategory, onOpenWorklist, breadcrumb }) => {
  const setCategory = onCategory || (() => {});
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
      return { rows: withCustomGoals(grid), sample: false };
    } catch (e) { return { rows: withCustomGoals(SAMPLE_MEASURES), sample: true }; }
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

  // The active card's Behavior read wants CRSP rows in the "needing attention"
  // shape (measure_id + crsp_name + rate). The provider column already holds this
  // measure's CRSP rates, so reshape them rather than a second fetch — the Overall
  // roll-up isn't a provider, so drop it.
  const crspsForRead = useMemo(
    () => providers.filter((p) => !p.overall).map((p) => ({ measure_id: activeId, crsp_name: p.crsp, rate: p.rate })),
    [providers, activeId]
  );

  // Category ("sub-category") tabs, scoping the Measures column only. Providers
  // and equity always show in full — the status filter is gone; goal standing is
  // carried by each row's tinted background instead (see StatusDot / row tones).
  const categories = useMemo(() => categoriesOf(measures), [measures]);
  // No "All" tab — seed the first category as soon as the data names one.
  useEffect(() => {
    if (!category && categories.length) setCategory(categories[0]);
    // setCategory is a prop-or-noop; re-running on its identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, categories]);
  const measuresFiltered = useMemo(
    () => measures
      .filter((m) => !category || categoryOf(m) === category)
      .slice()
      .sort(byRateAsc),
    [measures, category]
  );
  // Every provider (Overall pinned first), worst-first. Nothing hidden.
  const providersFiltered = useMemo(() => {
    const overall = providers.filter((p) => p.overall);
    const rest = providers.filter((p) => !p.overall).sort(byRateAsc);
    return [...overall, ...rest];
  }, [providers]);
  // Every stratum in every dimension, worst-first.
  const equityFiltered = useMemo(() => {
    const f = {};
    EQUITY_SECTIONS.forEach(({ key }) => {
      f[key] = (equity[key] || []).slice().sort(byRateAsc);
    });
    return f;
  }, [equity]);

  const activeProvider = providersFiltered[providerIdx] || providersFiltered[0];

  const pickMeasure = useCallback((id) => { setMeasureId(id); setProviderIdx(0); setShowMeasures(false); }, []);
  // Selecting a provider promotes it to the card at the top of the column; the
  // rest of the providers stay listed below it (always visible).
  const pickProvider = useCallback((i) => { setProviderIdx(i); }, []);

  // The Overall row isn't a provider — assigning against it is a measure-wide
  // fan-out. `intervention` is an optional preset carried in from a Recommended-
  // action button so the panel opens with that play already selected.
  const openAssign = useCallback((p, intervention) => setAssignScope(
    p && !p.overall
      ? { level: 'provider', provider: p, intervention }
      : { level: 'measure', intervention }
  ), []);

  // No assignments API yet, so this confirms the scope rather than persisting it.
  const runAssign = useCallback((payload) => {
    setAssignScope(null);
    const { preview, scope, assignedTo } = payload;
    const parts = [];
    if (scope.providers) parts.push(`${scope.providers.length} providers`);
    else if (scope.crsp) parts.push(scope.crsp);
    if (scope.strata) parts.push(scope.strata.map((s) => s.group).join(', '));
    const where = parts.join(' · ') || 'all providers';
    toast({ type: 'success', message: `${preview.created.toLocaleString()} tasks queued for ${where} · ${assignedTo === UNASSIGNED ? 'unassigned pool' : assignedTo}` });
  }, [toast]);

  // Reset selected provider, expanded stratum, and the measures list when the
  // measure or category changes (Overall = 0).
  useEffect(() => { setProviderIdx(0); setExpandedEq(null); setShowMeasures(false); }, [activeId, category]);

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
  const equityColRef = useRef(null);
  const nodeRefs = useRef({});
  const setNode = (key) => (el) => { if (el) nodeRefs.current[key] = el; };
  // Only the selected-provider → equity wires are drawn now: with every provider
  // and stratum shown, a measure → all-providers fan would be noise. The wire
  // reads "these are the equity strata sitting under this provider".
  const [conn, setConn] = useState({ w: 0, h: 0, pe: [] });
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
    const pFrom = anchor(`p:${providerIdx}`, 'right');
    const pe = [];
    EQUITY_SECTIONS.forEach(({ key }) => {
      const n = key === 'age' ? ageN : key === 'race' ? raceN : ethN;
      for (let i = 0; i < n; i++) { const c = curve(pFrom, anchor(`e:${key}:${i}`, 'left')); if (c) pe.push(c); }
    });
    const prev = connRef.current;
    if (prev.w === W && prev.h === H && prev.pe.join('|') === pe.join('|')) return;
    const next = { w: W, h: H, pe };
    connRef.current = next;
    setConn(next);
  }, [providerIdx, ageN, raceN, ethN, expandedEq]);

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
    // The Equity column is sticky with its own internal scroll, so its rows (the
    // connector endpoints) move independently of the page — track that too.
    const equityCol = equityColRef.current;
    if (equityCol) equityCol.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (equityCol) equityCol.removeEventListener('scroll', onScroll);
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
            <span className="mex-card-idrow">
              <StatusDot rate={m.rate} goal={m.goal_50th} />
              <span className="mex-card-id mono">{shortId(m.measure_id)}</span>
            </span>
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

  // A compact provider row for the folded remainder of the column — the active
  // provider is promoted to ActiveProviderCard, so rows here are always inactive.
  const renderProviderRow = (p, i) => {
    // Overall is the aggregate, not a goal-standing row — keep it neutral.
    const tone = p.overall ? '' : `mex-prow-${toneFor(p.rate, p.goal)}`;
    return (
      <div key={`${p.crsp}-${i}`} ref={setNode(`p:${i}`)}
        className={`mex-prow ${tone} ${p.overall ? 'is-overall' : ''}`}
        role="button" tabIndex={0} aria-pressed={false}
        onClick={() => pickProvider(i)}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pickProvider(i); }
        }}>
        <span className="mex-prow-name">{p.crsp}</span>
        <span className="mex-prow-right">
          <RateBadge rate={p.rate} goal={p.goal} />
          <button type="button" className="btn btn-assign btn-sm"
            title={p.overall ? 'Assign across all providers' : `Assign intervention · ${p.crsp}`}
            onClick={(ev) => { ev.stopPropagation(); openAssign(p); }}>
            Assign
          </button>
          <button type="button" className="btn btn-primary btn-icon btn-sm mex-prow-open"
            title="Open member worklist" aria-label="Open member worklist"
            onClick={(ev) => { ev.stopPropagation(); onOpenWorklist(activeMeasure, p, null); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </span>
      </div>
    );
  };

  if (measuresAsync.error) {
    return <ErrorState message="Couldn't load the explorer." onRetry={measuresAsync.refetch} />;
  }

  return (
    <div className="mex">
      <div className="mex-toolbar">
        <div className="mex-toolbar-left">{breadcrumb}</div>
        <div className="mex-toolbar-right">
          {categories.length > 1 && (
            <CategoryTabs categories={categories} value={category} onChange={setCategory} />
          )}
          {onMonthChange && (
            <MonthFilter selectedMonth={selectedMonth} onMonthChange={onMonthChange} availableMonths={availableMonths} />
          )}
        </div>
      </div>

      <div className="mex-board" ref={boardRef}>
        {/* Connector overlay */}
        <svg className="mex-links" width={conn.w} height={conn.h} aria-hidden="true">
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
              <EmptyState icon="—" hint="No measures in this category." />
            ) : (() => {
              const active = measuresFiltered.find((m) => m.measure_id === activeId) || measuresFiltered[0];
              const rest = measuresFiltered.filter((m) => m.measure_id !== active.measure_id);
              return (
                <>
                  <ActiveMeasureCard measure={active} token={token} selectedMonth={selectedMonth}
                    peers={measuresFiltered} crsps={crspsForRead}
                    nodeRef={setNode(`m:${active.measure_id}`)}
                    onAssign={(intervention) => openAssign(null, intervention)} />
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
            ) : (() => {
              // The selected provider expands into its detail card *in place* —
              // its position in the list never changes, the others stay as rows.
              const activeIdx = providerIdx < providersFiltered.length ? providerIdx : 0;
              return providersFiltered.map((p, i) => (
                i === activeIdx ? (
                  <ActiveProviderCard key={`p-card-${i}`} provider={p}
                    nodeRef={setNode(`p:${i}`)}
                    onAssign={() => openAssign(p)}
                    onOpenWorklist={() => onOpenWorklist(activeMeasure, p, null)} />
                ) : renderProviderRow(p, i)
              ));
            })()}
          </div>
        </section>

        {/* Column 3 — Equity */}
        <section ref={equityColRef} className="mex-col mex-col-equity">
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
              return (
                <div key={key} className="mex-eq-card">
                  <div className="mex-eq-head">{title}</div>
                  <div className="mex-eq-list">
                    {rows.length === 0 ? (
                      <div className="mex-eq-empty">No strata</div>
                    ) : rows.map((g, i) => {
                      const expKey = `${key}:${i}`;
                      const expanded = expandedEq === expKey;
                      const gGoal = num(g.goal ?? goal);
                      const d = Math.round((num(g.rate) - gGoal) * 10) / 10;
                      const gTone = toneFor(g.rate, gGoal);
                      return (
                        <div key={i} className={`mex-eq-rowwrap ${expanded ? 'is-expanded' : ''}`}>
                          <button ref={setNode(`e:${key}:${i}`)} className={`mex-eq-row mex-eq-row-${gTone}`}
                            aria-expanded={expanded} onClick={() => setExpandedEq(expanded ? null : expKey)}>
                            {/* Dot rides the left border so the incoming connector
                                wire lands on it — the wire is anchored to this row's
                                left edge (see `anchor('e:…','left')`). */}
                            <StatusDot rate={g.rate} goal={gGoal} className="mex-eq-dot" />
                            <span className="mex-eq-name">{g.group}</span>
                            <RateBadge rate={g.rate} goal={gGoal} />
                          </button>
                          {expanded && (
                            <div className="mex-eq-detail">
                              <div className="mex-eq-metrics">
                                <div><span className="mex-detail-k">Rate</span><span className="mex-detail-v num">{num(g.rate)}%</span></div>
                                <div><span className="mex-detail-k">Goal</span><span className="mex-detail-v num">{gGoal}%</span></div>
                                <div><span className="mex-detail-k">Delta</span><span className={`mex-detail-v num ${d < 0 ? 'is-neg' : 'is-pos'}`}>{d >= 0 ? '+' : ''}{d} pts</span></div>
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
          token={token} selectedMonth={selectedMonth}
          onClose={() => setAssignScope(null)} onAssign={runAssign} />,
        document.body
      )}
    </div>
  );
};

export default MeasureExplorer;
