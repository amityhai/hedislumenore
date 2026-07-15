import { useMemo, useState } from 'react';
import './ProviderAnalysis.css';
import { Skeleton, EmptyState, ErrorState } from '../ui/Feedback';
import useAsync from '../../hooks/useAsync';
import {
  fetchAllMeasuresGrid,
  fetchMeasureStratification,
  fetchMeasureStratificationRace,
  fetchMeasureStratificationEthnicity,
} from '../../services/workflowService';
import {
  num, shortId, statusFor, STATUS_TONE,
  SAMPLE_MEASURES, providerProfile, sampleEquity,
  portfolioRead, rankByPriority, priorityFactors, recommendAction,
} from './v2utils';
import { Stage, Signals } from './OverviewExplore';

const toneFor = (rate, goal) => STATUS_TONE[statusFor(rate, goal)] || 'below';
const byRateAsc = (a, b) => num(a.rate) - num(b.rate);

const EQUITY_DIMS = [
  { key: 'age', title: 'AGE' },
  { key: 'race', title: 'RACE' },
  { key: 'ethnicity', title: 'ETHNICITY' },
];

// How many worst-first measures to surface before the long tail folds away —
// the whole set at full detail is what made this page a wall to read.
const FOCUS_N = 8;

// A provider's full quality picture: every measure they support (rate vs goal,
// gap, trend), goal-standing distribution, an equity read for the entry measure,
// and a member roll-up. Provider-per-measure rates are profiled deterministically
// (no provider-→-all-measures endpoint), so the page announces itself as a
// profile the same way the rest of v2 announces its sample fallback.
const ProviderAnalysis = ({ token, selectedMonth, measure, provider, onOpenWorklist }) => {
  const providerName = provider?.overall ? 'All providers (Overall)' : (provider?.crsp || 'Provider');
  const [showAll, setShowAll] = useState(false); // fold the measure long-tail by default

  const gridAsync = useAsync(async () => {
    try {
      const grid = await fetchAllMeasuresGrid(token);
      if (!grid || grid.length === 0) throw new Error('empty');
      return { rows: grid, sample: false };
    } catch (e) { return { rows: SAMPLE_MEASURES, sample: true }; }
  }, [token, selectedMonth], { enabled: !!token });

  const grid = gridAsync.data?.rows || [];

  // The provider's rate on every measure, worst-first.
  const profile = useMemo(
    () => providerProfile(providerName, !!provider?.overall, grid).sort(byRateAsc),
    [providerName, provider, grid]
  );

  // Provider-level intelligence — the same read the Overview gives a measure, but
  // rolled up across everything this provider supports: where it stands, which
  // measure to work first, and the intervention with the biggest lever here.
  const providerIntel = useMemo(() => {
    if (!profile.length) return null;
    const below = profile.filter((m) => toneFor(m.rate, m.goal_50th) === 'below');
    const set = below.length ? below : profile;
    const read = portfolioRead(set, below.length ? 'Below Goal' : 'At Goal', profile.length);
    const ranked = rankByPriority(profile);
    const top = ranked[0];
    const rec = top ? recommendAction(top.measure, read) : null;
    return { read, top, rec };
  }, [profile]);

  const summary = useMemo(() => {
    const c = { below: 0, at: 0, above: 0 };
    let gapSum = 0;
    profile.forEach((m) => {
      c[toneFor(m.rate, m.goal_50th)] += 1;
      gapSum += num(m.rate) - num(m.goal_50th);
    });
    const members = profile.reduce((s, m) => s + num(m.denominator), 0);
    const open = profile.reduce((s, m) => s + Math.max(0, num(m.denominator) - num(m.numerator)), 0);
    return { ...c, total: profile.length, avgGap: profile.length ? Math.round((gapSum / profile.length) * 10) / 10 : 0, members, open };
  }, [profile]);

  // Equity read for the measure this analysis was opened from.
  const equityAsync = useAsync(async () => {
    const id = measure?.measure_id;
    if (!id) return null;
    try {
      const [a, r, e] = await Promise.all([
        fetchMeasureStratification(id, token),
        fetchMeasureStratificationRace(id, token),
        fetchMeasureStratificationEthnicity(id, token),
      ]);
      const age = a?.[id]?.age || [];
      const race = r?.[id]?.race || [];
      const ethnicity = e?.[id]?.ethnicity || [];
      if (age.length + race.length + ethnicity.length === 0) throw new Error('empty');
      return { age, race, ethnicity };
    } catch (err) { return sampleEquity(id); }
  }, [measure?.measure_id, selectedMonth], { enabled: !!token && !!measure?.measure_id });
  const equity = equityAsync.data || { age: [], race: [], ethnicity: [] };
  const entryGoal = num(measure?.goal_50th);

  if (gridAsync.error) {
    return <ErrorState message="Couldn't load the provider analysis." onRetry={gridAsync.refetch} />;
  }

  const distTotal = Math.max(1, summary.total);
  const pct = (n) => `${(n / distTotal) * 100}%`;

  return (
    <div className="pva">
      {/* Header */}
      <header className="pva-head">
        <div className="pva-head-left">
          <div className="eyebrow">PROVIDER ANALYSIS</div>
          <h1 className="pva-title">{providerName}</h1>
          {measure && (
            <p className="pva-sub">Opened from <strong>{shortId(measure.measure_id)}</strong> · profile spans all {summary.total} measures this provider supports</p>
          )}
        </div>
        <div className="pva-kpis">
          <div className="pva-kpi"><span className="pva-kpi-k">Measures</span><span className="pva-kpi-v num">{gridAsync.loading ? '—' : summary.total}</span></div>
          <div className="pva-kpi"><span className="pva-kpi-k">At / above goal</span><span className="pva-kpi-v num is-pos">{gridAsync.loading ? '—' : summary.at + summary.above}</span></div>
          <div className="pva-kpi"><span className="pva-kpi-k">Below goal</span><span className="pva-kpi-v num is-neg">{gridAsync.loading ? '—' : summary.below}</span></div>
          <div className="pva-kpi"><span className="pva-kpi-k">Avg gap</span><span className={`pva-kpi-v num ${summary.avgGap < 0 ? 'is-neg' : 'is-pos'}`}>{gridAsync.loading ? '—' : `${summary.avgGap >= 0 ? '+' : ''}${summary.avgGap} pts`}</span></div>
        </div>
      </header>

      {/* Provider insights — goal-standing distribution + the rolled-up read */}
      <section className="pva-card">
        <div className="pva-card-head">
          <h2 className="pva-card-title">Provider insights</h2>
          <span className="pva-card-sub">standing · where to focus · next move</span>
        </div>
        {gridAsync.loading ? (
          <Skeleton height={16} radius={9999} />
        ) : (
          <>
            <div className="pva-dist" role="img" aria-label={`${summary.below} below, ${summary.at} at, ${summary.above} above goal`}>
              {summary.below > 0 && <span className="pva-dist-seg pva-dist-below" style={{ width: pct(summary.below) }}>{summary.below}</span>}
              {summary.at > 0 && <span className="pva-dist-seg pva-dist-at" style={{ width: pct(summary.at) }}>{summary.at}</span>}
              {summary.above > 0 && <span className="pva-dist-seg pva-dist-above" style={{ width: pct(summary.above) }}>{summary.above}</span>}
            </div>
            <div className="pva-dist-legend">
              <span className="pva-dist-key"><span className="pva-dot pva-dot-below" />Below goal · {summary.below}</span>
              <span className="pva-dist-key"><span className="pva-dot pva-dot-at" />At goal · {summary.at}</span>
              <span className="pva-dist-key"><span className="pva-dot pva-dot-above" />Above goal · {summary.above}</span>
            </div>

            {providerIntel && providerIntel.read && (
              <div className="ov2-intel pva-intel">
                <Stage label="Standing" summary={providerIntel.read.synthesis}
                  tag={`Confidence · ${providerIntel.read.confidence.level}`} defaultOpen>
                  <Signals items={providerIntel.read.signals} />
                  <p className="ov2-read-why mono">{providerIntel.read.confidence.why}</p>
                </Stage>

                {providerIntel.top && (
                  <Stage label="Where to focus"
                    summary={`Work ${shortId(providerIntel.top.measure.measure_id)} first — ${providerIntel.top.open.toLocaleString()} members open · ${providerIntel.top.gap} pts under goal.`}
                    tag={`Score ${providerIntel.top.score}`}>
                    <div className="ov2-prio">
                      <span className="ov2-prio-bar"><span className="ov2-prio-fill" style={{ width: `${Math.max(4, providerIntel.top.score)}%` }} /></span>
                      <span className="ov2-prio-score mono num">{providerIntel.top.score}</span>
                    </div>
                    <Signals items={priorityFactors(providerIntel.top)} className="ov2-prio-factors" />
                  </Stage>
                )}

                {providerIntel.rec && providerIntel.top && (
                  <Stage label="Recommended action" summary={providerIntel.rec.action} tag="Suggested" tagKind="preview">
                    <p className="ov2-stage-lead">Biggest lever for this provider — on {shortId(providerIntel.top.measure.measure_id)}, run {providerIntel.rec.action.toLowerCase()}. Because {providerIntel.rec.rationale}.</p>
                    <div className="ov2-rec-chips">
                      {providerIntel.rec.chips.map((c, i) => <span key={i} className={`ov2-rec-chip mono ${c.strong ? 'is-strong' : ''}`}>{c.label}</span>)}
                    </div>
                    <p className="ov2-read-why mono">{providerIntel.rec.basis}</p>
                  </Stage>
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

      {/* Equity + member roll-up */}
      <div className="pva-split">
        <section className="pva-card">
          <div className="pva-card-head">
            <h2 className="pva-card-title">Equity</h2>
            {measure && <span className="pva-card-sub">{shortId(measure.measure_id)}</span>}
          </div>
          {equityAsync.loading ? (
            <div className="pva-eq">{[...Array(3)].map((_, i) => <Skeleton key={i} height={40} radius={10} />)}</div>
          ) : (equity.age.length + equity.race.length + equity.ethnicity.length) === 0 ? (
            <EmptyState icon="—" hint="No equity data for this measure." />
          ) : (
            <div className="pva-eq">
              {EQUITY_DIMS.map((d) => {
                const rows = (equity[d.key] || []).slice().sort(byRateAsc);
                if (rows.length === 0) return null;
                return (
                  <div key={d.key} className="pva-eq-dim">
                    <span className="pva-eq-label mono">{d.title}</span>
                    <div className="pva-eq-rows">
                      {rows.map((g, i) => {
                        const gGoal = num(g.goal ?? entryGoal);
                        const gRate = num(g.rate);
                        const tone = toneFor(gRate, gGoal);
                        return (
                          <div key={i} className={`pva-eq-row pva-eq-row-${tone}`}>
                            <span className="pva-eq-name"><span className={`pva-dot pva-dot-${tone}`} aria-hidden="true" />{g.group}</span>
                            <span className="pva-eq-track" title={`Rate ${gRate}% · goal ${gGoal}%`} aria-hidden="true">
                              <span className={`pva-eq-fill pva-bar-${tone}`} style={{ width: `${Math.min(100, Math.max(0, gRate))}%` }} />
                              {gGoal > 0 && <span className="pva-eq-marker" style={{ left: `${Math.min(100, gGoal)}%` }} />}
                            </span>
                            <span className={`pva-eq-rate pva-eq-rate-${tone} num`}>{gRate}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="pva-card pva-card-members">
          <div className="pva-card-head">
            <h2 className="pva-card-title">Members</h2>
            {measure && <span className="pva-card-sub">{shortId(measure.measure_id)}</span>}
          </div>
          <div className="pva-members">
            <div className="pva-member-stat"><span className="pva-member-k">Eligible</span><span className="pva-member-v num">{gridAsync.loading ? '—' : summary.members.toLocaleString()}</span></div>
            <div className="pva-member-stat"><span className="pva-member-k">Open gaps</span><span className="pva-member-v num is-neg">{gridAsync.loading ? '—' : summary.open.toLocaleString()}</span></div>
          </div>
          {!gridAsync.loading && summary.members > 0 && (() => {
            const share = Math.round((summary.open / summary.members) * 100);
            return (
              <div className="pva-member-viz">
                <div className="pva-member-track" role="img" aria-label={`${share}% of eligible members carry an open gap`}>
                  <span className="pva-member-fill" style={{ width: `${Math.min(100, share)}%` }} />
                </div>
                <p className="pva-member-note"><b className="num">{share}%</b> of eligible members carry an open gap</p>
              </div>
            );
          })()}
          {measure && (
            <button type="button" className="btn btn-primary pva-worklist"
              onClick={() => onOpenWorklist && onOpenWorklist(measure, provider, null)}>
              Open member worklist
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProviderAnalysis;
