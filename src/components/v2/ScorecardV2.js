import { useState, useCallback, useEffect } from 'react';
import './ScorecardV2.css';
import OverviewExplore from './OverviewExplore';
import MeasureExplorer from './MeasureExplorer';
import MemberWorklist from './MemberWorklist';
import { shortId } from './v2utils';

// Self-contained v2 flow. Keeps the full drill context (measure → provider →
// stratum → members) in local state so we get rich breadcrumbs without bolting
// multi-param routing onto the app's hash router. The flow lives under #/v2.
const ScorecardV2 = ({ token, selectedMonth, onMonthChange, availableMonths, onSidebar }) => {
  const [view, setView] = useState('overview'); // overview | explore | worklist
  const [ctx, setCtx] = useState({ measure: null, provider: null, strat: null });
  // Shared status filter — chosen on the Overview, carried into the Explorer.
  const [statusFilter, setStatusFilter] = useState('Below Goal');

  // Give the data-dense explorer/worklist more room by collapsing the sidebar;
  // restore it on the overview.
  useEffect(() => {
    if (onSidebar) onSidebar(view === 'overview');
  }, [view, onSidebar]);

  const goOverview = useCallback(() => {
    setCtx({ measure: null, provider: null, strat: null });
    setView('overview');
  }, []);

  const goExplore = useCallback((measure) => {
    setCtx({ measure, provider: null, strat: null });
    setView('explore');
  }, []);

  const goWorklist = useCallback((measure, provider, strat) => {
    setCtx({ measure, provider, strat });
    setView('worklist');
  }, []);

  // Breadcrumb trail — each crumb is clickable and rewinds the flow.
  const crumbs = [{ label: 'Overview', onClick: goOverview }];
  if (ctx.measure && view !== 'overview') {
    crumbs.push({
      label: shortId(ctx.measure.measure_id),
      onClick: () => goExplore(ctx.measure),
    });
  }
  if (view === 'worklist') {
    if (ctx.provider) crumbs.push({ label: ctx.provider.crsp });
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

  return (
    <div className="sc2">
      {view === 'worklist' && crumbNav}

      {view === 'overview' && (
        <OverviewExplore
          token={token}
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
          availableMonths={availableMonths}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          onInvestigate={goExplore}
        />
      )}
      {view === 'explore' && (
        <MeasureExplorer
          token={token}
          selectedMonth={selectedMonth}
          measure={ctx.measure}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          onOpenWorklist={goWorklist}
          breadcrumb={crumbNav}
        />
      )}
      {view === 'worklist' && (
        <MemberWorklist
          token={token}
          selectedMonth={selectedMonth}
          measure={ctx.measure}
          provider={ctx.provider}
          strat={ctx.strat}
        />
      )}
    </div>
  );
};

export default ScorecardV2;
