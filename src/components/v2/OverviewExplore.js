import { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import './OverviewExplore.css';
import MonthFilter from '../MonthFilter';
import { Skeleton, SkeletonText, EmptyState, ErrorState } from '../ui/Feedback';
import useAsync from '../../hooks/useAsync';
import {
  fetchAllMeasuresGrid,
  fetchDashboardKPI,
  fetchLowestPerformingMeasures,
  fetchCRSPsNeedingAttention,
  fetchMiniChartData,
} from '../../services/workflowService';
import {
  STATUS_TONE, num, shortId,
  SAMPLE_MEASURES, sampleKpis, sampleLowest, sampleCrsps,
} from './v2utils';

// Bubble size encodes DISTANCE FROM GOAL — the further a measure sits from its
// target, the bigger (and more urgent) the bubble.
const FILTERS = [
  { status: 'Below Goal', tone: 'below', label: 'Below Goal' },
  { status: 'At Goal', tone: 'at', label: 'At Goal' },
  { status: 'Above Goal', tone: 'above', label: 'Above Goal' },
];
const LENSES = ['Measures', 'Providers', 'Equity'];

const MAX_BUBBLES = 20;
const R_MIN = 30;
const R_MAX = 92;
const PACK_DENSITY = 0.46; // total bubble area as a fraction of the field area

// ── Deterministic circle packing (no deps) ───────────────────
// 1) Scale all radii so the combined area fits the field (prevents overlap).
// 2) Place largest-first via a grid scan, choosing the free cell closest to
//    centre — and never piling at the centre when crowded.
function packCircles(items, W, H) {
  if (!items.length || W <= 0 || H <= 0) return [];
  const area = W * H;
  const sumArea = items.reduce((s, it) => s + Math.PI * it.radius * it.radius, 0);
  const scale = sumArea > PACK_DENSITY * area ? Math.sqrt((PACK_DENSITY * area) / sumArea) : 1;
  const scaled = items
    .map((it) => ({ ...it, radius: Math.max(22, it.radius * scale) }))
    .sort((a, b) => b.radius - a.radius);

  const placed = [];
  const cx = W / 2, cy = H / 2;
  const gap = 6;
  const step = Math.max(6, Math.min(W, H) / 96);

  for (const it of scaled) {
    const r = it.radius;
    let bestValid = null, bestValidDist = Infinity;
    let bestFallback = { x: cx, y: cy }, bestFallbackGap = -Infinity;
    for (let y = r; y <= H - r; y += step) {
      for (let x = r; x <= W - r; x += step) {
        let minGap = Infinity;
        for (const p of placed) {
          const d = Math.hypot(p.x - x, p.y - y) - (p.radius + r);
          if (d < minGap) minGap = d;
        }
        if (minGap >= gap) {
          const dC = Math.hypot(x - cx, y - cy);
          if (dC < bestValidDist) { bestValidDist = dC; bestValid = { x, y }; }
        } else if (minGap > bestFallbackGap) {
          bestFallbackGap = minGap; bestFallback = { x, y };
        }
      }
    }
    const slot = bestValid || bestFallback;
    placed.push({ ...it, x: slot.x, y: slot.y });
  }
  return placed;
}

// ── Mini trend line (selected measure) ───────────────────────
const MiniTrend = ({ data }) => {
  if (!data || data.length < 2) return <div className="ov2-trend-empty">No trend data</div>;
  const W = 300, H = 70;
  const rates = data.map((d) => num(d.rate));
  const min = Math.min(...rates), max = Math.max(...rates);
  const span = max - min || 1;
  const pts = rates.map((r, i) => {
    const x = (i / (rates.length - 1)) * W;
    const y = H - ((r - min) / span) * (H - 12) - 6;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const area = `0,${H} ${pts.join(' ')} ${W},${H}`;
  return (
    <svg className="ov2-trend" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon points={area} className="ov2-trend-area" />
      <polyline points={pts.join(' ')} className="ov2-trend-line" />
    </svg>
  );
};

const OverviewExplore = ({ onInvestigate, token, selectedMonth, onMonthChange, availableMonths, statusFilter = 'Below Goal', onStatusFilter }) => {
  const [lens, setLens] = useState('Measures');
  const setStatusFilter = onStatusFilter || (() => {});
  const [selectedId, setSelectedId] = useState(null);

  const { data, loading, error, refetch } = useAsync(async () => {
    try {
      const [grid, kpis, lowest, crsps] = await Promise.all([
        fetchAllMeasuresGrid(token),
        fetchDashboardKPI(token),
        fetchLowestPerformingMeasures(token),
        fetchCRSPsNeedingAttention(token),
      ]);
      if (!grid || grid.length === 0) throw new Error('empty');
      return { grid, kpis, lowest, crsps, sample: false };
    } catch (e) {
      return { grid: SAMPLE_MEASURES, kpis: sampleKpis(), lowest: sampleLowest(), crsps: sampleCrsps(), sample: true };
    }
  }, [token, selectedMonth], { enabled: !!token });

  const grid = data?.grid || [];
  const kpis = data?.kpis || [];
  const usingSample = data?.sample;

  // Bubble SIZE encodes the volume of the care gap — how many members have an
  // open gap (denominator − numerator). Bigger bubble = more patients to reach,
  // i.e. the biggest opportunity. Falls back to distance-from-goal if the grid
  // doesn't carry numerator/denominator. Area ∝ value (sqrt of value → radius).
  const bubbleData = useMemo(() => {
    const matching = grid.filter((m) => m.kpi_status === statusFilter);
    const scored = matching.map((m) => {
      const rate = num(m.rate), goal = num(m.goal_50th);
      const nonComp = Math.max(0, num(m.denominator) - num(m.numerator));
      return { ...m, _rate: rate, _goal: goal, _dist: Math.abs(rate - goal), _nonComp: nonComp };
    });
    const totalNC = scored.reduce((s, m) => s + m._nonComp, 0);
    const sizeKey = totalNC > 0 ? '_nonComp' : '_dist';
    scored.sort((a, b) => b[sizeKey] - a[sizeKey]);
    const top = scored.slice(0, MAX_BUBBLES);
    const maxV = Math.max(1, ...top.map((m) => m[sizeKey]));
    return top.map((m) => ({
      ...m,
      radius: R_MIN + Math.sqrt(m[sizeKey] / maxV) * (R_MAX - R_MIN),
      _sizeBy: sizeKey === '_nonComp' ? 'gap' : 'dist',
    }));
  }, [grid, statusFilter]);

  const fieldRef = useRef(null);
  const [fieldSize, setFieldSize] = useState({ w: 720, h: 520 });
  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return undefined;
    const measure = () => setFieldSize({ w: el.clientWidth || 720, h: el.clientHeight || 520 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [lens, loading, error]);

  const packed = useMemo(() => packCircles(bubbleData, fieldSize.w, fieldSize.h), [bubbleData, fieldSize]);

  useEffect(() => { setSelectedId(null); }, [statusFilter, lens]);

  const selected = useMemo(() => grid.find((m) => m.measure_id === selectedId) || null, [grid, selectedId]);
  const belowKpi = kpis.find((k) => /below/i.test(k.label)) || {};
  const matchCount = grid.filter((m) => m.kpi_status === statusFilter).length;

  // Real counts (replaces the stale hardcoded "7 critical, 39 below" string).
  const belowMeasures = useMemo(() => grid.filter((m) => m.kpi_status === 'Below Goal'), [grid]);
  const criticalCount = belowMeasures.filter((m) => num(m.goal_50th) - num(m.rate) >= 20).length;
  const lowestDedup = useMemo(() => {
    const seen = new Set();
    return (data?.lowest || []).filter((m) => {
      if (!m.measure_id || seen.has(m.measure_id)) return false;
      seen.add(m.measure_id);
      return true;
    });
  }, [data]);

  return (
    <div className="ov2">
      <header className="ov2-head">
        <div>
          <div className="eyebrow">OVERVIEW</div>
          <h1 className="ov2-title">Quality Scorecard</h1>
        </div>
        <MonthFilter selectedMonth={selectedMonth} onMonthChange={onMonthChange} availableMonths={availableMonths} />
      </header>

      {usingSample && !loading && (
        <div className="ov2-notice" role="status">
          <span>Live data unavailable — showing sample data.</span>
          <button type="button" className="ov2-notice-retry" onClick={refetch}>↻ Retry</button>
        </div>
      )}

      <div className="ov2-card">
        <div className="ov2-toolbar">
          <div className="ov2-lenses" role="tablist" aria-label="Lens">
            {LENSES.map((l) => (
              <button key={l} role="tab" aria-selected={lens === l}
                className={`ov2-lens ${lens === l ? 'is-active' : ''}`} onClick={() => setLens(l)}>{l}</button>
            ))}
          </div>
          <div className="ov2-pills" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button key={f.status}
                className={`ov2-pill ov2-pill-${f.tone} ${statusFilter === f.status ? 'is-active' : ''}`}
                aria-pressed={statusFilter === f.status} onClick={() => setStatusFilter(f.status)}>{f.label}</button>
            ))}
          </div>
        </div>

        <div className="ov2-body">
          <div className="ov2-field-wrap" onClick={() => selectedId && setSelectedId(null)}>
            {error ? (
              <ErrorState message="Couldn't load measures." onRetry={refetch} />
            ) : lens !== 'Measures' ? (
              <EmptyState icon="🧭" title={`${lens} lens`} hint="Explore providers and equity in the connected drill-down — open it from any measure's Investigate." />
            ) : (
              <div className="ov2-field" ref={fieldRef}>
                {loading ? (
                  <div className="ov2-field-loading">
                    {[104, 78, 60, 46].map((s, i) => <Skeleton key={i} width={s} height={s} radius={9999} />)}
                  </div>
                ) : packed.length === 0 ? (
                  <EmptyState icon={statusFilter === 'Below Goal' ? '✅' : '🔍'}
                    title={`No measures ${statusFilter.toLowerCase()}`}
                    hint={statusFilter === 'Below Goal' ? 'Nothing needs attention this month.' : 'Try another status.'} />
                ) : (
                  <div className="ov2-bubbles" key={statusFilter}>
                    {packed.map((b, i) => {
                      const tone = STATUS_TONE[b.kpi_status] || 'below';
                      const isSel = b.measure_id === selectedId;
                      const d = 2 * b.radius;
                      return (
                        <button key={b.measure_id}
                          className={`ov2-bubble ov2-bubble-${tone} ${isSel ? 'is-selected' : ''} ${selectedId && !isSel ? 'is-dim' : ''}`}
                          style={{ left: b.x - b.radius, top: b.y - b.radius, width: d, height: d, animationDelay: `${Math.min(i * 35, 600)}ms` }}
                          onClick={(e) => { e.stopPropagation(); setSelectedId(b.measure_id); }} title={b.display_name}>
                          <span className="ov2-bubble-id">{shortId(b.measure_id)}</span>
                          <span className="ov2-bubble-rate num">{b._rate}%</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {!loading && packed.length > 0 && (
                  <div className="ov2-field-caption">
                    Showing {packed.length} of {matchCount} · bubble size = {packed[0]?._sizeBy === 'gap' ? 'members with an open gap' : 'distance from goal'}
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="ov2-panel">
            <div className="ov2-panel-anim" key={selected ? selected.measure_id : 'default'}>
              {selected ? (
                <SelectedPanel measure={selected} crsps={data?.crsps || []} token={token}
                  selectedMonth={selectedMonth} onInvestigate={() => onInvestigate && onInvestigate(selected)} />
              ) : (
                <DefaultPanel loading={loading} belowKpi={belowKpi} belowCount={belowMeasures.length}
                  criticalCount={criticalCount} lowest={lowestDedup} onPick={setSelectedId} />
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

const DefaultPanel = ({ loading, belowKpi, belowCount, criticalCount, lowest, onPick }) => (
  <div className="ov2-panel-inner">
    <div className="eyebrow">BELOW BENCHMARK</div>
    {loading ? <Skeleton width={140} height={40} radius={8} style={{ marginTop: 8 }} /> : (
      <div className="ov2-bench">
        <span className="ov2-bench-num num">{belowKpi.value ?? belowCount ?? '—'}</span>
        <span className="ov2-bench-total num">/{belowKpi.total ?? '—'}</span>
        <span className="ov2-bench-tag">Need attention</span>
      </div>
    )}
    {!loading && (criticalCount > 0 || belowCount > 0) && (
      <div className="ov2-bench-sub">↘ {criticalCount} critical · {belowCount} below target</div>
    )}

    <div className="eyebrow ov2-panel-sub">LOWEST PERFORMING MEASURES</div>
    <div className="ov2-list">
      {loading ? <SkeletonText lines={5} /> : lowest.length === 0 ? (
        <EmptyState icon="—" hint="No underperforming measures." />
      ) : lowest.slice(0, 6).map((m, i) => (
        <button key={i} className="ov2-list-row" style={{ animationDelay: `${i * 45}ms` }} onClick={() => onPick(m.measure_id)}>
          <span className="ov2-list-label">{m.display_name}</span>
          <span className="ov2-list-rate num">{m.rate}%</span>
        </button>
      ))}
    </div>
  </div>
);

const SelectedPanel = ({ measure, crsps, token, selectedMonth, onInvestigate }) => {
  const rate = num(measure.rate), goal = num(measure.goal_50th);
  const gap = Math.round((rate - goal) * 10) / 10;
  const tone = STATUS_TONE[measure.kpi_status] || 'below';
  const numerator = num(measure.numerator);
  const denominator = num(measure.denominator);
  const nonCompliant = Math.max(0, denominator - numerator);

  const { data: trend, loading: trendLoading } = useAsync(
    () => fetchMiniChartData(measure.measure_id, token).catch(() => []),
    [measure.measure_id, selectedMonth], { enabled: !!token }
  );

  const measureCrsps = (crsps || []).filter((c) => c.measure_id === measure.measure_id);

  return (
    <div className="ov2-panel-inner">
      <span className={`ov2-chip ov2-chip-${tone} mono`}>{shortId(measure.measure_id)}</span>
      <h2 className="ov2-measure-name">{measure.display_name}</h2>
      {measure.measure_definition && <p className="ov2-measure-def">{measure.measure_definition}</p>}

      <div className="ov2-measure-rate">
        <span className="num">{rate}%</span>
        <span className={`ov2-gap ov2-gap-${gap >= 0 ? 'pos' : 'neg'} num`}>{gap >= 0 ? '↗ +' : '↘ '}{gap} pts vs goal</span>
      </div>

      {trendLoading ? <Skeleton height={70} radius={8} style={{ marginTop: 12 }} /> : <MiniTrend data={trend} />}

      {/* Rate-vs-goal bar with goal marker (mirrors the performance header) */}
      <div className="ov2-goalbar" title={`Goal ${goal}%`}>
        <span className={`ov2-goalbar-fill ov2-goalbar-${tone}`} style={{ width: `${Math.min(100, Math.max(0, rate))}%` }} />
        {goal > 0 && <span className="ov2-goalbar-marker" style={{ left: `${Math.min(100, goal)}%` }} />}
      </div>

      {denominator > 0 && (
        <div className="ov2-stats ov2-stats-3">
          <div><span className="ov2-stat-k">Numerator</span><span className="ov2-stat-v num">{numerator.toLocaleString()}</span></div>
          <div><span className="ov2-stat-k">Denominator</span><span className="ov2-stat-v num">{denominator.toLocaleString()}</span></div>
          <div><span className="ov2-stat-k">Non-compliant</span><span className="ov2-stat-v num is-neg">{nonCompliant.toLocaleString()}</span></div>
        </div>
      )}

      <div className="ov2-stats">
        <div><span className="ov2-stat-k">Rate</span><span className="ov2-stat-v num">{rate}%</span></div>
        <div><span className="ov2-stat-k">Goal</span><span className="ov2-stat-v num">{goal}%</span></div>
        <div><span className="ov2-stat-k">Gap</span><span className={`ov2-stat-v num ${gap < 0 ? 'is-neg' : 'is-pos'}`}>{gap >= 0 ? '+' : ''}{gap}</span></div>
      </div>

      <button type="button" className="btn btn-primary ov2-investigate" onClick={onInvestigate}>🔍 Investigate</button>

      {measureCrsps.length > 0 && (
        <>
          <div className="eyebrow ov2-panel-sub">LOWEST PERFORMING CRSP</div>
          <div className="ov2-list">
            {measureCrsps.slice(0, 4).map((c, i) => (
              <div key={i} className="ov2-list-row ov2-list-static">
                <span className="ov2-list-label">{c.crsp_name}</span>
                <span className="ov2-list-rate num">{c.rate}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default OverviewExplore;
