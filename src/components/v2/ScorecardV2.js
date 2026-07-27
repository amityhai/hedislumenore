import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import './ScorecardV2.css';
import OverviewExplore from './OverviewExplore';
import MeasureExplorer from './MeasureExplorer';
import MemberWorklist from './MemberWorklist';
import ProviderAnalysis from './ProviderAnalysis';
import useAsync from '../../hooks/useAsync';
import MonthFilter from '../MonthFilter';
import { useToast } from '../ui/Toast';
import { fetchAllMeasuresGrid, fetchCRSPLevelData } from '../../services/workflowService';
import { num, shortId, withCustomGoals, SAMPLE_MEASURES, sampleProviders } from './v2utils';

// A breadcrumb crumb that is also a switcher. Deep in the flow the trail is the
// only thing on screen naming the measure and the provider, so it's also the
// most direct place to change them — no walking back up to the board and down
// again. A crumb with no options stays a plain link/label.
const CrumbMenu = ({ label, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <span className="sc2-crumb-menu" ref={ref}>
      <button type="button" className="sc2-crumb sc2-crumb-switch" aria-expanded={open} aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}>
        {label}
        <span className={`sc2-crumb-chev ${open ? 'is-open' : ''}`} aria-hidden="true">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </span>
      </button>
      {open && (
        <div className="sc2-crumb-pop" role="listbox">
          {options.length === 0 ? (
            <p className="sc2-crumb-empty">Nothing to switch to.</p>
          ) : options.map((o) => (
            <button key={o.key} type="button" role="option" aria-selected={!!o.current}
              className={`sc2-crumb-opt ${o.current ? 'is-current' : ''}`}
              onClick={() => { setOpen(false); if (!o.current) onSelect(o.value); }}>
              {o.tag && <span className="sc2-crumb-opt-tag mono">{o.tag}</span>}
              <span className="sc2-crumb-opt-name">{o.label}</span>
              {o.rate != null && <span className="sc2-crumb-opt-rate num">{o.rate}%</span>}
            </button>
          ))}
        </div>
      )}
    </span>
  );
};

// Self-contained v2 flow. Keeps the full drill context (measure → provider →
// stratum → members) in local state so we get rich breadcrumbs without bolting
// multi-param routing onto the app's hash router. The flow lives under #/v2.
const ScorecardV2 = ({ token, selectedMonth, onMonthChange, availableMonths, onSidebar }) => {
  const [view, setView] = useState('overview'); // overview | explore | worklist | provider
  const [ctx, setCtx] = useState({ measure: null, provider: null, strat: null });
  // Navigation history — a stack of prior {view, ctx} snapshots so a single Back
  // button returns to the LAST page (not just a breadcrumb ancestor). Breadcrumb
  // jumps push onto it too, so Back consistently undoes the previous move.
  const [history, setHistory] = useState([]);
  // Category ("sub-category") filter — chosen on the Overview, carried into the
  // Explorer. null = All categories, so nothing is hidden by default.
  const [category, setCategory] = useState(null);
  const toast = useToast();

  // The whole v2 flow is data-dense — the Overview bubble field included — so keep
  // the sidebar collapsed for the room. The user can still expand it manually.
  useEffect(() => {
    if (onSidebar) onSidebar(false);
  }, [view, onSidebar]);

  // Every forward move records where we were, then switches. Guard against a
  // no-op push when a handler is fired for the page we're already on.
  const navigate = useCallback((nextView, nextCtx) => {
    setHistory((h) => [...h, { view, ctx }]);
    setCtx(nextCtx);
    setView(nextView);
  }, [view, ctx]);

  const goOverview = useCallback(() => navigate('overview', { measure: null, provider: null, strat: null }), [navigate]);
  const goExplore = useCallback((measure) => navigate('explore', { measure, provider: null, strat: null }), [navigate]);
  const goWorklist = useCallback((measure, provider, strat) => navigate('worklist', { measure, provider, strat }), [navigate]);
  const goProvider = useCallback((measure, provider) => navigate('provider', { measure, provider, strat: null }), [navigate]);

  // Back pops the stack and restores that snapshot — the last page, whatever it was.
  const goBack = useCallback(() => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setView(prev.view);
    setCtx(prev.ctx);
  }, [history]);
  const canBack = history.length > 0;

  // Switcher data for the breadcrumb. Both lists fall back to the sample profile
  // the rest of v2 uses, so the crumbs stay usable when the workflow is down.
  const measuresAsync = useAsync(async () => {
    try {
      const grid = await fetchAllMeasuresGrid(token);
      if (!grid || grid.length === 0) throw new Error('empty');
      return withCustomGoals(grid);
    } catch (e) { return withCustomGoals(SAMPLE_MEASURES); }
  }, [token, selectedMonth], { enabled: !!token });

  const measureOptions = useMemo(() => {
    const seen = new Set();
    return (measuresAsync.data || [])
      .filter((m) => m.measure_id && !seen.has(m.measure_id) && seen.add(m.measure_id))
      .map((m) => ({
        key: m.measure_id, value: m, label: m.display_name, tag: shortId(m.measure_id),
        rate: num(m.rate), current: m.measure_id === ctx.measure?.measure_id,
      }));
  }, [measuresAsync.data, ctx.measure]);

  const measureId = ctx.measure?.measure_id;
  const measureGoal = num(ctx.measure?.goal_50th);
  // Rows are stamped with the measure they describe. useAsync holds the previous
  // result while the next one is in flight, so without the stamp the reconcile
  // below would match a carried-over provider against the OLD measure's rows and
  // keep its old rate — the numbers would trail one switch behind.
  const providersAsync = useAsync(async () => {
    if (!measureId) return { measureId: null, rows: [] };
    try {
      const crsps = await fetchCRSPLevelData(measureId, token);
      if (!crsps || crsps.length === 0) throw new Error('empty');
      return { measureId, rows: crsps.map((p) => ({ ...p, goal: measureGoal })) };
    } catch (e) {
      return {
        measureId,
        rows: sampleProviders(measureId)
          .filter((p) => p.crsp !== 'Overall')
          .map((p) => ({ ...p, goal: measureGoal })),
      };
    }
  }, [measureId, token, selectedMonth], { enabled: !!measureId });

  // Only ever read provider rows that belong to the measure in context.
  const providerRows = useMemo(
    () => (measureId && providersAsync.data?.measureId === measureId ? providersAsync.data.rows : null),
    [providersAsync.data, measureId]
  );

  const providerOptions = useMemo(
    () => (providerRows || []).map((p, i) => ({
      key: `${p.crsp}-${i}`, value: p, label: p.crsp,
      rate: num(p.rate), current: p.crsp === ctx.provider?.crsp,
    })),
    [providerRows, ctx.provider]
  );

  // Switching from the trail keeps you on the page you're on, and the two crumbs
  // stay cross-connected: changing the measure holds onto the provider you were
  // reading and re-resolves it against the new measure. A provider's rate, goal
  // and open gaps are per-measure facts, so the row itself can't come along —
  // only its identity does, flagged `_stale` until the new measure's CRSP data
  // lands and the effect below swaps in the real numbers. The stratum is dropped
  // either way: equity bands are computed per measure.
  const switchMeasure = useCallback((m) => navigate(view, {
    measure: m,
    provider: ctx.provider ? { crsp: ctx.provider.crsp, _stale: true } : null,
    strat: null,
  }), [navigate, view, ctx.provider]);
  const switchProvider = useCallback((p) => navigate(view, { measure: ctx.measure, provider: p, strat: null }), [navigate, view, ctx.measure]);

  // Re-resolve a carried-over provider once the new measure's CRSP rows arrive.
  // This is a correction of the current context, not a move, so it writes ctx
  // directly rather than going through navigate() — pushing it would make Back
  // undo the reconcile instead of the measure switch.
  useEffect(() => {
    // providerRows is null until the rows for THIS measure have landed.
    if (!ctx.provider?._stale || !providerRows) return;
    const match = providerRows.find((p) => p.crsp === ctx.provider.crsp);
    if (match) {
      setCtx((c) => (c.provider?._stale ? { ...c, provider: match } : c));
    } else {
      // The provider doesn't report on this measure. Falling back to the whole
      // network silently would look like the switch dropped the provider by
      // accident, so say why.
      const name = ctx.provider.crsp;
      setCtx((c) => (c.provider?._stale ? { ...c, provider: null } : c));
      toast({ type: 'info', message: `${name} has no data on ${shortId(ctx.measure?.measure_id)} — showing all providers` });
    }
  }, [ctx.provider, ctx.measure, providerRows, toast]);

  // Breadcrumb trail — each crumb is clickable and rewinds the flow.
  // Provider Analysis is deliberately NOT filed under the measure crumb: the page
  // spans every measure the provider supports, so "Overview / AAP / Ashford" would
  // frame a whole-portfolio read as a slice of AAP. Back still returns to the
  // measure — that's the history stack's job, not the trail's.
  const crumbs = [{ label: 'Overview', onClick: goOverview }];
  if (ctx.measure && view !== 'overview' && view !== 'provider') {
    crumbs.push({
      label: shortId(ctx.measure.measure_id),
      onClick: () => goExplore(ctx.measure),
      // The measure crumb doubles as a measure switcher on the pages below the
      // Explorer — the trail is where the measure is named, so it's where it
      // should be changeable.
      options: view === 'worklist' ? measureOptions : null,
      onSelect: switchMeasure,
    });
  }
  if (view === 'provider' && ctx.provider) {
    crumbs.push({ label: ctx.provider.crsp });
  }
  if (view === 'worklist') {
    if (ctx.provider) {
      // The provider crumb rewinds to that provider's worklist (drop any stratum)
      // and switches provider without leaving the worklist.
      crumbs.push({
        label: ctx.provider.crsp,
        onClick: ctx.strat ? () => goWorklist(ctx.measure, ctx.provider, null) : undefined,
        options: providerOptions,
        onSelect: switchProvider,
      });
    }
    if (ctx.strat) crumbs.push({ label: ctx.strat.group });
  }

  // Breadcrumb element — rendered standalone on the worklist, but handed to the
  // Explorer so it can share a single row with the status pills.
  const crumbNav = (
    <nav className="sc2-crumbs" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <span key={i} className="sc2-crumb-wrap">
          {i > 0 && <span className="sc2-crumb-sep" aria-hidden="true">/</span>}
          {c.options ? (
            <CrumbMenu label={c.label} options={c.options} onSelect={c.onSelect} />
          ) : c.onClick ? (
            <button type="button" className="sc2-crumb" onClick={c.onClick}>{c.label}</button>
          ) : (
            <span className="sc2-crumb is-current" aria-current="page">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );

  // Back button + breadcrumb share one nav row. Back appears on every page that
  // has somewhere to return to; the crumb trail is dropped on the Overview root
  // (it would only read "Overview"). On the Explorer this whole row rides in the
  // toolbar next to the status pills.
  const backBtn = canBack ? (
    <button type="button" className="sc2-back" onClick={goBack}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
      </svg>
      Back
    </button>
  ) : null;
  const showCrumbs = view !== 'overview';
  // The month drives every fetch on these pages too, so it belongs on them —
  // previously it only existed on the Overview, and changing period meant walking
  // back to the root and drilling in again. Rides the right edge of the nav row,
  // matching where it sits in the Overview's header.
  const flowNav = (backBtn || showCrumbs) ? (
    <div className="sc2-topnav">
      {backBtn}
      {showCrumbs && crumbNav}
      {/* The Explorer's nav row is shared with its category tabs, so it renders
          its own month control at the far end of that row instead. */}
      {view !== 'explore' && (
        <div className="sc2-topnav-month">
          <MonthFilter selectedMonth={selectedMonth} onMonthChange={onMonthChange} availableMonths={availableMonths} />
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="sc2">
      {/* Explorer renders the nav inside its own toolbar; every other view shows
          it here at the top. */}
      {view !== 'explore' && flowNav}

      {view === 'overview' && (
        <OverviewExplore
          token={token}
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
          availableMonths={availableMonths}
          category={category}
          onCategory={setCategory}
          onInvestigate={goExplore}
        />
      )}
      {view === 'explore' && (
        <MeasureExplorer
          token={token}
          selectedMonth={selectedMonth}
          measure={ctx.measure}
          category={category}
          onCategory={setCategory}
          onOpenWorklist={goWorklist}
          breadcrumb={flowNav}
          onMonthChange={onMonthChange}
          availableMonths={availableMonths}
        />
      )}
      {view === 'worklist' && (
        <MemberWorklist
          token={token}
          selectedMonth={selectedMonth}
          measure={ctx.measure}
          provider={ctx.provider}
          strat={ctx.strat}
          onAnalyzeProvider={goProvider}
        />
      )}
      {view === 'provider' && (
        <ProviderAnalysis
          token={token}
          selectedMonth={selectedMonth}
          measure={ctx.measure}
          provider={ctx.provider}
          onOpenWorklist={goWorklist}
        />
      )}
    </div>
  );
};

export default ScorecardV2;
