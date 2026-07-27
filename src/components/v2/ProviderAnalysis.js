import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './ProviderAnalysis.css';
import { Skeleton, EmptyState, ErrorState } from '../ui/Feedback';
import { useToast } from '../ui/Toast';
import useAsync from '../../hooks/useAsync';
import AssignPanel, { UNASSIGNED } from './AssignPanel';
import { fetchAllMeasuresGrid } from '../../services/workflowService';
import {
  num, shortId, statusFor, STATUS_TONE,
  SAMPLE_MEASURES, providerProfile,
  providerSummary, providerIntel, withCustomGoals,
} from './v2utils';
import { ProviderIntel } from './OverviewExplore';
import AssignmentStatus from './AssignmentStatus';

const toneFor = (rate, goal) => STATUS_TONE[statusFor(rate, goal)] || 'below';
const byRateAsc = (a, b) => num(a.rate) - num(b.rate);

// How many worst-first measures to surface before the long tail folds away —
// the whole set at full detail is what made this page a wall to read.
const FOCUS_N = 8;

// A provider's full quality picture: every measure they support (rate vs goal,
// gap, trend), goal-standing distribution, an equity read for the entry measure,
// and a member roll-up. Provider-per-measure rates are profiled deterministically
// (no provider-→-all-measures endpoint), so the page announces itself as a
// profile the same way the rest of v2 announces its sample fallback.
// `origin` says how the reader got here, because the subline is a different
// claim in each case. Drilling in from a measure, this page was *opened from*
// that measure. Opening a provider cold from the directory, no measure was
// chosen — the entry measure is the provider's widest gap, picked for them — and
// saying "opened from" there would invent a step the reader never took.
const ProviderAnalysis = ({ token, selectedMonth, measure, provider, onOpenWorklist, origin = 'measure' }) => {
  const providerName = provider?.overall ? 'All providers (Overall)' : (provider?.crsp || 'Provider');
  const [showAll, setShowAll] = useState(false); // fold the measure long-tail by default
  const [assign, setAssign] = useState(null); // { intervention, measure } — recommended-action assign
  const toast = useToast();

  const gridAsync = useAsync(async () => {
    try {
      const grid = await fetchAllMeasuresGrid(token);
      if (!grid || grid.length === 0) throw new Error('empty');
      return { rows: withCustomGoals(grid), sample: false };
    } catch (e) { return { rows: withCustomGoals(SAMPLE_MEASURES), sample: true }; }
  }, [token, selectedMonth], { enabled: !!token });

  const grid = gridAsync.data?.rows || [];

  // The provider's rate on every measure, worst-first.
  const profile = useMemo(
    () => providerProfile(providerName, !!provider?.overall, grid).sort(byRateAsc),
    [providerName, provider, grid]
  );

  // Provider-level intelligence + goal-standing roll-up — extracted so the
  // Explorer's active-provider card computes them identically (see v2utils).
  const intel = useMemo(() => providerIntel(profile), [profile]);
  const summary = useMemo(() => providerSummary(profile), [profile]);

  if (gridAsync.error) {
    return <ErrorState message="Couldn't load the provider analysis." onRetry={gridAsync.refetch} />;
  }

  return (
    <div className="pva">
      {/* Header */}
      <header className="pva-head">
        <div className="pva-head-left">
          <div className="eyebrow">PROVIDER ANALYSIS</div>
          <h1 className="pva-title">{providerName}</h1>
          {measure && (
            origin === 'directory' ? (
              <p className="pva-sub">Profile spans all {summary.total} measures this provider supports · entered on <strong>{shortId(measure.measure_id)}</strong>, its widest gap</p>
            ) : (
              <p className="pva-sub">Opened from <strong>{shortId(measure.measure_id)}</strong> · profile spans all {summary.total} measures this provider supports</p>
            )
          )}
        </div>
        <div className="pva-kpis">
          <div className="pva-kpi"><span className="pva-kpi-k">Measures</span><span className="pva-kpi-v num">{gridAsync.loading ? '—' : summary.total}</span></div>
          <div className="pva-kpi"><span className="pva-kpi-k">At / above goal</span><span className="pva-kpi-v num is-pos">{gridAsync.loading ? '—' : summary.at + summary.above}</span></div>
          <div className="pva-kpi"><span className="pva-kpi-k">Below goal</span><span className="pva-kpi-v num is-neg">{gridAsync.loading ? '—' : summary.below}</span></div>
          <div className="pva-kpi"><span className="pva-kpi-k">Avg gap</span><span className={`pva-kpi-v num ${summary.avgGap < 0 ? 'is-neg' : 'is-pos'}`}>{gridAsync.loading ? '—' : `${summary.avgGap >= 0 ? '+' : ''}${summary.avgGap} pts`}</span></div>
        </div>
      </header>

      {/* Narratives and the measure grid, side by side: the rolled-up read on the
          left, the per-measure standing it's reading on the right. */}
      <div className="pva-main">
      {/* Provider insights — the rolled-up read + the worklist entry point */}
      <section className="pva-card">
        <div className="pva-card-head">
          <h2 className="pva-card-title">Provider insights</h2>
          <span className="pva-card-sub">standing across this portfolio</span>
        </div>
        {gridAsync.loading ? (
          <Skeleton height={16} radius={9999} />
        ) : (
          <>
            <ProviderIntel intel={intel} hideAssign
              onAssign={(intervention, targetMeasure) => setAssign({ intervention, measure: targetMeasure || measure })} />

            {/* Assign the recommended play and open the worklist sit in one row,
                equal halves — the two next moves off this provider read. */}
            {(intel?.top || (measure && onOpenWorklist)) && (
              <div className="pva-actions">
                {intel?.top && (
                  <AssignmentStatus measureId={intel.top.measure.measure_id}
                    onAssign={() => setAssign({ measure: intel.top.measure })}
                    className="ov2-intel-assign pva-assign" />
                )}
                {measure && onOpenWorklist && (
                  <button type="button" className="btn btn-primary pva-worklist"
                    onClick={() => onOpenWorklist(measure, provider, null)}>
                    Open member worklist
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Measures — one calm, scannable row each (worst-first), instead of a wall
          of equal-weight sparkline cards. The long tail folds away so the eye
          lands on what's furthest from goal first. */}
      <section className="pva-card">
        <div className="pva-card-head">
          <h2 className="pva-card-title">Measures</h2>
          <span className="pva-card-sub">Worst-first · rate vs goal</span>
        </div>
        {gridAsync.loading ? (
          <div className="pva-mlist">{[...Array(6)].map((_, i) => <Skeleton key={i} height={46} radius={10} style={{ marginBottom: 8 }} />)}</div>
        ) : profile.length === 0 ? (
          <EmptyState icon="—" hint="No measures for this provider." />
        ) : (
          <>
            <div className="pva-mlist">
              {(showAll ? profile : profile.slice(0, FOCUS_N)).map((m) => {
                const rate = num(m.rate);
                const goal = num(m.goal_50th);
                const gap = Math.round((rate - goal) * 10) / 10;
                const tone = toneFor(rate, goal);
                const open = Math.max(0, num(m.denominator) - num(m.numerator));
                return (
                  <div key={m.measure_id} className={`pva-mrow pva-mrow-${tone}`}>
                    <span className="pva-mrow-left">
                      <span className={`pva-dot pva-dot-${tone}`} aria-hidden="true" />
                      <span className="pva-mrow-id mono">{shortId(m.measure_id)}</span>
                      <span className="pva-mrow-name">{m.display_name}</span>
                    </span>
                    <span className="pva-mrow-right">
                      <span className="pva-mrow-bar" title={`Rate ${rate}% · goal ${goal}%`}>
                        <span className={`pva-mrow-fill pva-bar-${tone}`} style={{ width: `${Math.min(100, Math.max(0, rate))}%` }} />
                        {goal > 0 && <span className="pva-mrow-marker" style={{ left: `${Math.min(100, goal)}%` }} />}
                      </span>
                      <span className={`pva-mrow-rate pva-mrow-rate-${tone} num`}>{rate}%</span>
                      <span className={`pva-mrow-gap num ${gap < 0 ? 'is-neg' : gap > 0 ? 'is-pos' : ''}`}>
                        {gap === 0 ? 'at goal' : `${gap > 0 ? '↗' : '↘'} ${Math.abs(gap)}`}
                      </span>
                      <span className="pva-mrow-open num">{open.toLocaleString()} open</span>
                    </span>
                  </div>
                );
              })}
            </div>
            {profile.length > FOCUS_N && (
              <button type="button" className="pva-showall" aria-expanded={showAll} onClick={() => setShowAll((s) => !s)}>
                {showAll
                  ? 'Show fewer'
                  : `Show all ${profile.length} measures`}
                <span className={`pva-showall-chev ${showAll ? 'is-open' : ''}`} aria-hidden="true">⌄</span>
              </button>
            )}
          </>
        )}
        {gridAsync.data?.sample && !gridAsync.loading && (
          <p className="pva-note mono">Provider-per-measure rates are a deterministic profile — no live provider-by-measure feed available.</p>
        )}
      </section>
      </div>

      {/* Assign — seeded with the provider's biggest-lever play
          and scoped to the measure that lever targets. Provider-scoped counts come
          from that measure's profile row; equity narrowing lives in the Explorer. */}
      {assign && createPortal(
        (() => {
          const m = assign.measure;
          const row = {
            crsp: providerName, rate: num(m?.rate), goal: num(m?.goal_50th),
            numerator: num(m?.numerator), denominator: num(m?.denominator),
          };
          const isOverall = !!provider?.overall;
          return (
            <AssignPanel measure={m}
              providers={isOverall ? [] : [row]}
              equity={{ age: [], race: [], ethnicity: [] }}
              scope={isOverall
                ? { level: 'measure', intervention: assign.intervention }
                : { level: 'provider', provider: row, intervention: assign.intervention }}
              onClose={() => setAssign(null)}
              onAssign={(payload) => {
                setAssign(null);
                const where = isOverall ? 'all providers' : providerName;
                toast({ type: 'success', message: `${payload.preview.created.toLocaleString()} tasks queued for ${where} · ${payload.assignedTo === UNASSIGNED ? 'unassigned pool' : payload.assignedTo}` });
              }} />
          );
        })(),
        document.body
      )}
    </div>
  );
};

export default ProviderAnalysis;
