import { useMemo, useState } from 'react';
import './OutcomeAnalysis.css';
import { Skeleton } from '../ui/Feedback';
import useAsync from '../../hooks/useAsync';
import {
  OUTCOME_QUARTERS, outcomeKpis, MISSED_KPIS,
  MISSED_BY_INTERVENTION, MISSED_BY_STAKEHOLDER,
} from './recidivismData';

const fmtM = (n) => `$${n.toFixed(2)}M`;
const fmtPct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

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

const OutcomeAnalysis = () => {
  const [flash, setFlash] = useState(0); // bump to re-run the fetch simulation

  // Mirrors the v2 fetch convention: attempt live, fall back to sample.
  // No live recidivism feed exists, so this always resolves to sample —
  // the page says so, the same way the rest of v2 announces its fallback.
  const { data, loading, refetch } = useAsync(async () => {
    return {
      quarters: OUTCOME_QUARTERS,
      kpis: outcomeKpis(),
      missed: MISSED_KPIS,
      byIntervention: MISSED_BY_INTERVENTION,
      byStakeholder: MISSED_BY_STAKEHOLDER,
      sample: true,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash]);

  const k = data?.kpis;
  const missedTrend = useMemo(
    () => (data?.quarters || []).map((q) => ({ q: q.q, recidivists: q.recidivists })),
    [data]
  );

  return (
    <div className="oa">
      {/* Header */}
      <header className="oa-head">
        <div>
          <div className="eyebrow">OUTCOME ANALYSIS</div>
          <h1 className="oa-title">Recidivism Prevention Outcomes</h1>
          <p className="oa-sub">
            Impact of interventions on members prevented from recidivism and dollars saved.
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
          <span>Demo data — no live recidivism feed connected.</span>
        </div>
      )}

      {/* Hero KPI band */}
      <section className="oa-kpis">
        <KpiTile loading={loading} k="Members prevented" sub="FY to date" v={k && k.preventedFytd.toLocaleString()} tone="pos" />
        <KpiTile loading={loading} k="Prevented this quarter" sub={k && `vs ${k.preventedPrev} last quarter`} v={k && k.preventedCur}
          delta={k && fmtPct(k.preventedQoQ)} deltaTone={k && k.preventedQoQ >= 0 ? 'pos' : 'neg'} />
        <KpiTile loading={loading} k="Total savings" sub="FY to date" v={k && fmtM(k.savingsFytd)} tone="brand" big />
        <KpiTile loading={loading} k="Savings this quarter" sub={k && `vs ${fmtM(k.savingsPrev)} last quarter`} v={k && fmtM(k.savingsCur)}
          delta={k && fmtPct(k.savingsQoQ)} deltaTone={k && k.savingsQoQ >= 0 ? 'pos' : 'neg'} />
      </section>

      {/* Impact of interventions — the two series that matter, side by side.
          (The source repeated this block twice; consolidated to one.) */}
      <section className="oa-card">
        <div className="oa-card-head">
          <h2 className="oa-card-title">Impact of interventions</h2>
          <span className="oa-card-sub">by quarter · FY 2026</span>
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

      {/* Missed opportunities — the flip side */}
      <section className="oa-card oa-missed">
        <div className="oa-card-head">
          <h2 className="oa-card-title">Missed opportunities</h2>
          <span className="oa-card-sub">interventions that should have fired but didn’t</span>
        </div>
        <div className="oa-missed-body">
          <div className="oa-missed-kpis">
            <KpiTile loading={loading} k="Missed opportunities" v={data?.missed.count} tone="warn" />
            <KpiTile loading={loading} k="Recidivists from misses" v={data?.missed.recidivistMembers} tone={data?.missed.recidivistMembers > 0 ? 'neg' : 'pos'} />
            <KpiTile loading={loading} k="Cost of misses" v={data && fmtM(data.missed.cost)} tone="neg" />
          </div>
          <div className="oa-missed-trend">
            <h4 className="oa-chart-title">Recidivist members by quarter</h4>
            {loading ? <Skeleton height={160} radius={12} />
              : <VBars data={missedTrend} valueKey="recidivists" format={(v) => v} tone="neg" axisLabel="Recidivist members" />}
          </div>
        </div>
      </section>

      {/* Where the misses concentrate */}
      {!loading && data && (
        <div className="oa-tables">
          <MissedTable title="Missed opportunities by intervention" rowLabel="Intervention not completed" rows={data.byIntervention} />
          <MissedTable title="Missed opportunities by stakeholder" rowLabel="Provider" rows={data.byStakeholder} />
        </div>
      )}
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
