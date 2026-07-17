import { useMemo, useState } from 'react';
import './OutcomeAnalysis.css';
import { Skeleton } from '../ui/Feedback';
import useAsync from '../../hooks/useAsync';
import { shortId } from './v2utils';
import {
  OUTCOME_QUARTERS, outcomeKpis,
  MEASURE_OUTCOMES, outcomeMeasureKpis,
  MISSED_BY_INTERVENTION, MISSED_BY_STAKEHOLDER,
} from './recidivismData';

const fmtM = (n) => `$${n.toFixed(2)}M`;
const fmtPct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
// A gain carries its sign — "+7.0 pts" is the movement. A shortfall doesn't:
// points left on the table are a quantity missing, not a positive delta, and
// "+93.4 pts" next to "Left on the table" reads as an achievement.
const fmtPts = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(1)} pts`;
const fmtPtsBare = (n) => `${Math.abs(n).toFixed(1)} pts`;

// ── Vertical bar chart ───────────────────────────────────────────────
// One calm chart primitive reused for both the prevention and savings
// series. `format` renders the value label; `tone` picks the fill.
const VBars = ({ data, valueKey, format, tone = 'brand', axisLabel }) => {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <div className="oa-chart">
      <div className={`oa-bars oa-bars-${tone}`}>
        {data.map((d) => {
          const h = (d[valueKey] / max) * 100;
          return (
            <div key={d.q} className="oa-bar-col">
              <span className="oa-bar-val num">{format(d[valueKey])}</span>
              <div className="oa-bar-track">
                <span className="oa-bar-fill" style={{ height: `${h}%` }} />
              </div>
              <span className="oa-bar-x">{d.q}</span>
            </div>
          );
        })}
      </div>
      {axisLabel && <div className="oa-chart-axis">{axisLabel}</div>}
    </div>
  );
};

// ── Progress track ───────────────────────────────────────────────────
// The page's core mark. One bar carries the whole story of a measure: the rate
// it started at, the ground the intervention gained, the goal it's measured
// against, and — greyed beyond the tip — the ground that was there to take but
// wasn't. Three encodings on one axis, so the comparison needs no eye travel.
const ProgressTrack = ({ row }) => {
  const { baseline, current, goal, potential } = row;
  const w = (v) => `${Math.min(100, Math.max(0, v))}%`;
  return (
    <span className="oa-track" title={`${baseline}% → ${current}% · goal ${goal}%`}>
      <span className="oa-track-base" style={{ width: w(baseline) }} />
      <span className={`oa-track-gain ${row.reachedGoal ? 'is-met' : ''}`}
        style={{ left: w(baseline), width: w(current - baseline) }} />
      {potential > current && (
        <span className="oa-track-miss" style={{ left: w(current), width: w(potential - current) }} />
      )}
      {goal > 0 && <span className="oa-track-goal" style={{ left: w(goal) }} />}
    </span>
  );
};

// ── Measure progress row ─────────────────────────────────────────────
const MeasureRow = ({ row, index }) => (
  <div className={`oa-mrow ${row.reachedGoal ? 'is-met' : ''}`} style={{ animationDelay: `${index * 25}ms` }}>
    <span className="oa-mrow-id mono">{shortId(row.measureId)}</span>
    <span className="oa-mrow-name" title={row.name}>{row.name}</span>
    <span className="oa-mrow-play" title={row.intervention}>{row.intervention}</span>
    <span className="oa-mrow-rates num">
      <b className="oa-mrow-from">{row.baseline}%</b>
      <span className="oa-mrow-arrow" aria-hidden="true">→</span>
      <b className="oa-mrow-to">{row.current}%</b>
    </span>
    <span className="oa-mrow-track"><ProgressTrack row={row} /></span>
    <span className="oa-mrow-lift num">{fmtPts(row.lift)}</span>
    <span className="oa-mrow-done num">{row.completionPct}%</span>
    <span className="oa-mrow-status">
      {row.reachedGoal
        ? <span className="oa-tag oa-tag-met">At goal</span>
        : <span className="oa-tag oa-tag-short num">{Math.round((row.goal - row.current) * 10) / 10} pts to goal</span>}
    </span>
  </div>
);

// ── Missed-opportunity table ─────────────────────────────────────────
const MissedTable = ({ title, rowLabel, rows }) => {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <section className="oa-card oa-table-card">
      <div className="oa-card-head">
        <h3 className="oa-card-title">{title}</h3>
        <span className="oa-card-sub">{rows.length} · by volume</span>
      </div>
      <div className="oa-table">
        <div className="oa-tr oa-th">
          <span className="oa-td-name">{rowLabel}</span>
          <span className="oa-td-bar">Interventions not completed</span>
          <span className="oa-td-num">Recidivists</span>
        </div>
        {rows.map((r) => (
          <div key={r.name} className={`oa-tr ${r.recidivists > 0 ? 'is-flag' : ''}`}>
            <span className="oa-td-name" title={r.name}>{r.name}</span>
            <span className="oa-td-bar">
              <span className="oa-td-track">
                <span className="oa-td-fill" style={{ width: `${(r.total / max) * 100}%` }} />
              </span>
              <b className="num">{r.total.toLocaleString()}</b>
            </span>
            <span className={`oa-td-num num ${r.recidivists > 0 ? 'is-neg' : 'is-muted'}`}>
              {r.recidivists}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

const SORTS = [
  { key: 'lift', label: 'Biggest lift', cmp: (a, b) => b.lift - a.lift },
  { key: 'missed', label: 'Most left on the table', cmp: (a, b) => b.ptsMissed - a.ptsMissed },
  { key: 'gap', label: 'Furthest from goal', cmp: (a, b) => (a.current - a.goal) - (b.current - b.goal) },
];

const OutcomeAnalysis = () => {
  const [flash, setFlash] = useState(0); // bump to re-run the fetch simulation
  const [sort, setSort] = useState('lift');
  const [showAll, setShowAll] = useState(false);

  // Mirrors the v2 fetch convention: attempt live, fall back to sample.
  // No live outcome feed exists, so this always resolves to sample —
  // the page says so, the same way the rest of v2 announces its fallback.
  const { data, loading, refetch } = useAsync(async () => {
    return {
      quarters: OUTCOME_QUARTERS,
      kpis: outcomeKpis(),
      measures: MEASURE_OUTCOMES,
      mk: outcomeMeasureKpis(),
      byIntervention: MISSED_BY_INTERVENTION,
      byStakeholder: MISSED_BY_STAKEHOLDER,
      sample: true,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash]);

  const k = data?.kpis;
  const mk = data?.mk;

  const ranked = useMemo(() => {
    const cmp = (SORTS.find((s) => s.key === sort) || SORTS[0]).cmp;
    return [...(data?.measures || [])].sort(cmp);
  }, [data, sort]);
  const shown = showAll ? ranked : ranked.slice(0, 8);

  // The opportunity list is its own ranking — only measures that actually left
  // something behind, worst first. A measure with nothing missed has no row here.
  const opportunities = useMemo(
    () => (data?.measures || [])
      .filter((m) => m.ptsMissed > 0)
      .sort((a, b) => (b.wouldHaveReached - a.wouldHaveReached) || (b.ptsMissed - a.ptsMissed))
      .slice(0, 8),
    [data]
  );

  return (
    <div className="oa">
      {/* Header */}
      <header className="oa-head">
        <div>
          <div className="eyebrow">OUTCOME ANALYSIS</div>
          <h1 className="oa-title">Intervention Outcomes</h1>
          <p className="oa-sub">
            What the interventions we ran did to each measure — the ground gained toward goal,
            and the ground left behind.
            {k && <> · Data as of FY <strong>{k.currentQuarter}</strong></>}
          </p>
        </div>
        <button type="button" className="oa-refresh" onClick={() => { setFlash((f) => f + 1); refetch(); }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh data
        </button>
      </header>

      {data?.sample && !loading && (
        <div className="oa-notice" role="status">
          <span>Demo data — no live outcome feed connected. Measure rates and goals mirror the Overview; lift and completion are modelled.</span>
        </div>
      )}

      {/* Hero KPI band — the measure story, not the program's */}
      <section className="oa-kpis">
        <KpiTile loading={loading} k="Measures improved" sub={mk && `of ${mk.total} measured`} v={mk && mk.improved} tone="pos" />
        <KpiTile loading={loading} k="Average lift" sub="since the intervention" v={mk && fmtPts(mk.avgLift)} tone="brand" big />
        <KpiTile loading={loading} k="Reached goal" sub={mk && `${mk.membersClosed.toLocaleString()} gaps closed`} v={mk && mk.reachedGoal} tone="pos" />
        <KpiTile loading={loading} k="Left on the table" sub={mk && `${mk.missedMembers.toLocaleString()} members not reached`} v={mk && fmtPtsBare(mk.ptsMissed)} tone="warn" />
      </section>

      {/* ── The lead: what each intervention moved ── */}
      <section className="oa-card">
        <div className="oa-card-head">
          <div className="oa-card-heading">
            <h2 className="oa-card-title">Measure progress against interventions</h2>
            <span className="oa-card-sub">Baseline → current, against each measure's own goal</span>
          </div>
          <div className="oa-seg" role="tablist" aria-label="Sort measures">
            {SORTS.map((s) => (
              <button key={s.key} role="tab" aria-selected={sort === s.key}
                className={`oa-seg-btn ${sort === s.key ? 'is-active' : ''}`}
                onClick={() => setSort(s.key)}>{s.label}</button>
            ))}
          </div>
        </div>

        <div className="oa-legend">
          <span className="oa-legend-item"><i className="oa-key oa-key-base" />rate before</span>
          <span className="oa-legend-item"><i className="oa-key oa-key-gain" />gained by the intervention</span>
          <span className="oa-legend-item"><i className="oa-key oa-key-miss" />left on the table</span>
          <span className="oa-legend-item"><i className="oa-key oa-key-goal" />goal</span>
        </div>

        {loading ? (
          <div className="oa-mlist">{[...Array(6)].map((_, i) => <Skeleton key={i} height={44} radius={8} style={{ marginBottom: 8 }} />)}</div>
        ) : (
          <>
            <div className="oa-mrow oa-mrow-head">
              <span>Measure</span><span /><span>Intervention run</span>
              <span className="ta-c">Movement</span><span>Progress to goal</span>
              <span className="ta-r">Lift</span><span className="ta-r">Done</span><span className="ta-r">Status</span>
            </div>
            <div className="oa-mlist">
              {shown.map((row, i) => <MeasureRow key={row.measureId} row={row} index={i} />)}
            </div>
            {ranked.length > 8 && (
              <button type="button" className="oa-showall" aria-expanded={showAll} onClick={() => setShowAll((s) => !s)}>
                {showAll ? 'Show fewer' : `Show all ${ranked.length} measures`}
                <span className={`oa-showall-chev ${showAll ? 'is-open' : ''}`} aria-hidden="true">⌄</span>
              </button>
            )}
          </>
        )}
      </section>

      {/* ── Scope of opportunity: the measure points we didn't take ── */}
      <section className="oa-card oa-scope">
        <div className="oa-card-head">
          <div className="oa-card-heading">
            <h2 className="oa-card-title">Scope of opportunity</h2>
            <span className="oa-card-sub">
              Measure points that were reachable and weren't taken — interventions that
              landed after the measure's closing window, or never completed at all
            </span>
          </div>
        </div>

        <div className="oa-scope-kpis">
          <KpiTile loading={loading} k="Points left on the table" sub="across all measures" v={mk && fmtPtsBare(mk.ptsMissed)} tone="warn" />
          <KpiTile loading={loading} k="Never completed" sub="interventions assigned, not worked" v={mk && mk.neverCompleted.toLocaleString()} tone="neg" />
          <KpiTile loading={loading} k="Completed late" sub="worked, but outside the window" v={mk && mk.late.toLocaleString()} tone="warn" />
          <KpiTile loading={loading} k="Would have reached goal" sub="measures, had these landed" v={mk && mk.wouldHaveReached}
            tone={mk && mk.wouldHaveReached > 0 ? 'neg' : 'pos'} />
        </div>

        {loading ? (
          <div className="oa-mlist">{[...Array(4)].map((_, i) => <Skeleton key={i} height={40} radius={8} style={{ marginBottom: 8 }} />)}</div>
        ) : opportunities.length === 0 ? (
          <p className="oa-scope-empty">Every assigned intervention landed inside its window. Nothing was left on the table.</p>
        ) : (
          <>
            <div className="oa-orow oa-orow-head">
              <span>Measure</span><span>Why it was missed</span>
              <span className="ta-r">Members</span><span className="ta-r">Points missed</span><span>Reachable</span>
            </div>
            <div className="oa-mlist">
              {opportunities.map((m, i) => (
                <div key={m.measureId} className={`oa-orow oa-orow-data ${m.wouldHaveReached ? 'is-flag' : ''}`}
                  style={{ animationDelay: `${i * 25}ms` }}>
                  <span className="oa-orow-m">
                    <span className="oa-mrow-id mono">{shortId(m.measureId)}</span>
                    <span className="oa-orow-name" title={m.name}>{m.name}</span>
                  </span>
                  {/* Split, not summed: "not completed" is a staffing problem and
                      "landed late" is a timing one. They need different fixes, so
                      the row never merges them into one number. */}
                  <span className="oa-why">
                    {m.neverCompleted > 0 && (
                      <span className="oa-why-part">
                        <i className="oa-why-dot oa-why-never" />
                        <b className="num">{m.neverCompleted.toLocaleString()}</b> never completed
                      </span>
                    )}
                    {m.late > 0 && (
                      <span className="oa-why-part">
                        <i className="oa-why-dot oa-why-late" />
                        <b className="num">{m.late.toLocaleString()}</b> completed late
                      </span>
                    )}
                  </span>
                  <span className="ta-r num oa-orow-members">{m.missedMembers.toLocaleString()}</span>
                  <span className="ta-r num oa-orow-pts">−{m.ptsMissed.toFixed(1)} pts</span>
                  <span>
                    {m.wouldHaveReached ? (
                      <span className="oa-tag oa-tag-would num" title={`${m.current}% → ${m.potential}% vs a ${m.goal}% goal`}>
                        Would have hit {m.goal}%
                      </span>
                    ) : (
                      <span className="oa-tag oa-tag-quiet num">{m.current}% → {m.potential}%</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Where the misses concentrate */}
      {!loading && data && (
        <div className="oa-tables">
          <MissedTable title="Missed opportunities by intervention" rowLabel="Intervention not completed" rows={data.byIntervention} />
          <MissedTable title="Missed opportunities by stakeholder" rowLabel="Provider" rows={data.byStakeholder} />
        </div>
      )}

      {/* ── Program impact — the downstream effect, kept as supporting context ── */}
      <section className="oa-card">
        <div className="oa-card-head">
          <div className="oa-card-heading">
            <h2 className="oa-card-title">Program impact</h2>
            <span className="oa-card-sub">what closing those gaps prevented downstream · by quarter · FY 2026</span>
          </div>
        </div>
        <div className="oa-prog-kpis">
          <KpiTile loading={loading} k="Members prevented" sub="FY to date" v={k && k.preventedFytd.toLocaleString()} tone="pos" />
          <KpiTile loading={loading} k="Prevented this quarter" sub={k && `vs ${k.preventedPrev} last quarter`} v={k && k.preventedCur}
            delta={k && fmtPct(k.preventedQoQ)} deltaTone={k && k.preventedQoQ >= 0 ? 'pos' : 'neg'} />
          <KpiTile loading={loading} k="Total savings" sub="FY to date" v={k && fmtM(k.savingsFytd)} tone="brand" />
          <KpiTile loading={loading} k="Savings this quarter" sub={k && `vs ${fmtM(k.savingsPrev)} last quarter`} v={k && fmtM(k.savingsCur)}
            delta={k && fmtPct(k.savingsQoQ)} deltaTone={k && k.savingsQoQ >= 0 ? 'pos' : 'neg'} />
        </div>
        <div className="oa-charts">
          {loading ? (
            <><Skeleton height={220} radius={12} /><Skeleton height={220} radius={12} /></>
          ) : (
            <>
              <div className="oa-chart-wrap">
                <h4 className="oa-chart-title">Members prevented from recidivism</h4>
                <VBars data={data.quarters} valueKey="prevented" format={(v) => v} tone="brand" axisLabel="Members" />
              </div>
              <div className="oa-chart-wrap">
                <h4 className="oa-chart-title">Savings from recidivism prevention</h4>
                <VBars data={data.quarters} valueKey="savings" format={fmtM} tone="pos" axisLabel="USD (millions)" />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

// ── KPI tile ─────────────────────────────────────────────────────────
const KpiTile = ({ k, sub, v, delta, deltaTone, tone, big, loading }) => (
  <div className={`oa-kpi ${big ? 'is-big' : ''}`}>
    <span className="oa-kpi-k">{k}</span>
    {loading ? (
      <Skeleton height={big ? 34 : 28} width="60%" style={{ margin: '4px 0' }} />
    ) : (
      <span className={`oa-kpi-v num tone-${tone || 'default'}`}>{v}</span>
    )}
    <span className="oa-kpi-foot">
      {sub && <span className="oa-kpi-sub">{sub}</span>}
      {delta && !loading && <span className={`oa-kpi-delta tone-${deltaTone}`}>{delta}</span>}
    </span>
  </div>
);

export default OutcomeAnalysis;
