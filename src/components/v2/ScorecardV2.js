import { useState, useCallback, useEffect } from 'react';
import './ScorecardV2.css';
import OverviewExplore from './OverviewExplore';
import MeasureExplorer from './MeasureExplorer';
import MemberWorklist from './MemberWorklist';
import ProviderAnalysis from './ProviderAnalysis';
import { shortId } from './v2utils';

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
  // Status filter drives the Overview bubble field only (bubbles need one lens).
  const [statusFilter, setStatusFilter] = useState('Below Goal');
  // Category ("sub-category") filter — chosen on the Overview, carried into the
  // Explorer. null = All categories, so nothing is hidden by default.
  const [category, setCategory] = useState(null);

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
    });
  }
  if (view === 'provider' && ctx.provider) {
    crumbs.push({ label: ctx.provider.crsp });
  }
  if (view === 'worklist') {
    if (ctx.provider) {
      // The provider crumb rewinds to that provider's worklist (drop any stratum).
      crumbs.push(ctx.strat
        ? { label: ctx.provider.crsp, onClick: () => goWorklist(ctx.measure, ctx.provider, null) }
        : { label: ctx.provider.crsp });
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
          {c.onClick ? (
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
  const flowNav = (backBtn || showCrumbs) ? (
    <div className="sc2-topnav">
      {backBtn}
      {showCrumbs && crumbNav}
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
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
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
