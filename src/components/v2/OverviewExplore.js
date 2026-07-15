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
  fetchEquityAlerts,
  fetchMiniChartData,
} from '../../services/workflowService';
import {
  STATUS_TONE, num, shortId, behaviorRead, portfolioRead,
  rankByPriority, priorityFactors, recommendAction, learningState, recordApplied,
  categoryOf, categoriesOf,
  SAMPLE_MEASURES, sampleKpis, sampleLowest, sampleCrsps, sampleEquityAlerts, sampleTrend,
} from './v2utils';
import CategoryTabs from './CategoryTabs';

// The bubble field encodes two independent variables, so a measure's urgency and
// its workload can be read at once:
//   • SIZE (area)  = members with an open gap — "how much work sits here".
//     Always positive, so it means the same thing in all three status tabs, and
//     it is normalized against every measure (not just the filtered ones) so
//     switching tabs never rescales the field.
//   • SHADE        = how far the rate sits from THAT measure's own goal. Goals
//     differ per measure (a 52% target and a 70% target are not comparable), so
//     a raw rate can't carry severity — attainment (rate ÷ goal) can.
// Size alone can't do both jobs: sizing by distance-from-goal would collapse the
// "At Goal" tab, whose members are all within ~2 points of target by definition.
const FILTERS = [
  { status: 'Below Goal', tone: 'below', label: 'Below Goal' },
  { status: 'At Goal', tone: 'at', label: 'At Goal' },
  { status: 'Above Goal', tone: 'above', label: 'Above Goal' },
];
// 'Providers' and 'Equity' are hidden for now; their lens logic below is intact,
// so re-adding them here is all that's needed to bring the tabs back.
const LENSES = ['Measures'];

// The summary panel adapts to the active status filter — heading, pill tone and
// the ranked measure list all follow whichever group is selected.
const STATUS_PANELS = {
  'Below Goal': { eyebrow: 'BELOW BENCHMARK', tag: 'Need attention', tone: 'below', listLabel: 'LOWEST PERFORMING MEASURES', dir: 'asc' },
  'At Goal':    { eyebrow: 'AT BENCHMARK',    tag: 'On track',        tone: 'at',    listLabel: 'MEASURES AT GOAL',          dir: 'asc' },
  'Above Goal': { eyebrow: 'ABOVE BENCHMARK', tag: 'Exceeding goal',  tone: 'above', listLabel: 'TOP PERFORMING MEASURES',   dir: 'desc' },
};

// Providers & Equity lenses reuse the same panel chrome but with their own
// "where to focus" list (CRSPs needing attention / equity disparities).
const LENS_PANELS = {
  Providers: { eyebrow: 'CRSPS FLAGGED',      tag: 'Needs attention',    tone: 'below', listLabel: 'CRSPS NEEDING ATTENTION' },
  Equity:    { eyebrow: 'EQUITY DISPARITIES', tag: 'Review disparities', tone: 'below', listLabel: 'EQUITY ALERTS' },
};

// `dist` is the degraded mode: without denominators there are no member counts
// to size by, so the caption says so rather than silently changing meaning.
const SIZE_BY_TEXT = {
  gap: 'members with an open gap',
  dist: 'points from goal (member counts unavailable)',
  lag: 'how far below target',
};
// On Measures the two channels are independent (volume vs severity). CRSP/equity
// rows carry neither goals nor denominators, so both channels ride the same
// variable — say so once rather than printing it twice.
// Deliberately says "relative to". Two measures can both be 14 points short and
// carry different shades — 14 off a 52% target is a bigger miss than 14 off a
// 55% one — and the legend has to make that legible rather than look like a bug.
const SHADE_BY_TEXT = { measures: 'gap relative to each goal' };

// Saturation anchor: a rate 30% away from its goal (in relative terms) paints
// the deepest shade. Absolute, not per-tab — so a deep bubble means the same
// thing on every tab and in every month.
const SEVERITY_SPAN = 0.3;
const severityFor = (rate, goal) => (goal > 0 ? Math.min(1, Math.abs(rate / goal - 1) / SEVERITY_SPAN) : 0.5);

// Ends of the shade ramp, per status. "At Goal" is a ±2pt band by definition, so
// its ramp is flat — say that rather than implying a gradient that isn't there.
const SHADE_ENDS = {
  below: ['at goal', 'furthest below'],
  above: ['at goal', 'furthest above'],
  at: null,
};

// Compact badge for a long CRSP name, e.g. "Riverside Behavioral Health" → "RBH".
const acronym = (name) => ((name || '').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase() || '—');

const fmtCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(n)));

// The field's key. Swatches are drawn from the same tone tokens as the bubbles,
// so the legend and the chart are visibly the same scale rather than a caption
// that asserts a relationship the reader has to take on faith.
const FieldLegend = ({ shown, total, sizeBy, tone, min, max, lens }) => {
  const range = Number.isFinite(min) && Number.isFinite(max) && min !== max
    ? (sizeBy === 'gap' ? `${fmtCount(min)}–${fmtCount(max)} members` : `${Math.round(min)}–${Math.round(max)} pts`)
    : null;
  const ends = SHADE_ENDS[tone];
  const dots = <span className={`ov2-legend-dots ov2-legend-dots-${tone}`} aria-hidden="true"><i /><i /><i /></span>;
  const ramp = <span className={`ov2-legend-ramp ov2-legend-ramp-${tone}`} aria-hidden="true" />;

  if (lens !== 'Measures') {
    return (
      <div className="ov2-legend">
        <span className="ov2-legend-count">Showing {shown} of {total}</span>
        <span className="ov2-legend-item">{dots}{ramp}<span>size &amp; shade = {SIZE_BY_TEXT.lag}</span></span>
      </div>
    );
  }
  return (
    <div className="ov2-legend">
      <span className="ov2-legend-count">Showing {shown} of {total}</span>
      <span className="ov2-legend-item">
        {dots}
        <span>size = {SIZE_BY_TEXT[sizeBy] || 'urgency'}{range && <em className="ov2-legend-range num"> · {range}</em>}</span>
      </span>
      <span className="ov2-legend-item">
        {ramp}
        <span>
          shade = {SHADE_BY_TEXT.measures}
          {ends
            ? <em className="ov2-legend-range"> · {ends[0]} → {ends[1]}</em>
            : <em className="ov2-legend-range"> · all within 2 pts of goal</em>}
        </span>
      </span>
    </div>
  );
};

const MAX_BUBBLES = 20;
const PACK_DENSITY = 0.46; // total bubble area as a fraction of the field area

// Bubble radii are derived from the field, not fixed: a 92px radius that reads
// well on a 1200px desktop field swallows a 320px phone field whole. The
// shorter edge drives the scale so a wide, short field stays legible too.
function radiusScale(W, H) {
  const edge = Math.min(W, H);
  const rMax = Math.max(30, Math.min(92, edge * 0.2));
  const rMin = Math.max(15, Math.min(30, rMax * 0.36));
  return { rMin, rMax };
}

// Value maps to AREA, not radius — the eye compares discs by area. Interpolating
// the radius directly would render a value at 10% of max as ~29% of max area.
const radiusFor = (weight, rMin, rMax) => Math.sqrt(rMin * rMin + weight * (rMax * rMax - rMin * rMin));

// Fewer, larger bubbles on a small field beats many unreadable ones. Thresholds
// are the field area at which a full set stops being legible, measured against
// the packer's density — not round numbers.
function bubbleBudget(W, H) {
  const area = W * H;
  if (area < 110000) return 8;   // phone (~330×330)
  if (area < 210000) return 12;  // narrow stacked field
  return MAX_BUBBLES;
}

// Shrink-to-fit factor for a set of natural radii. Computed from the DENSEST
// group and then shared by all of them: if each status tab fitted itself to the
// field, a sparse tab would inflate its bubbles and the same member count would
// render at a different size on every tab.
function fitScale(groups, W, H, rMin, rMax) {
  const area = W * H;
  let worst = 0;
  for (const weights of groups) {
    const sum = weights.reduce((s, wt) => { const r = radiusFor(wt, rMin, rMax); return s + Math.PI * r * r; }, 0);
    if (sum > worst) worst = sum;
  }
  return worst > PACK_DENSITY * area ? Math.sqrt((PACK_DENSITY * area) / worst) : 1;
}

// ── Deterministic circle packing (no deps) ───────────────────
// Place largest-first via a grid scan, choosing the free cell closest to
// centre — and never piling at the centre when crowded. Radii arrive already
// scaled (see `fitScale`) so that sizes stay comparable across tabs.
function packCircles(items, W, H, rMin = 22, scale = 1) {
  if (!items.length || W <= 0 || H <= 0) return [];
  const gap = 6;
  // A bubble wider than the field would make the placement scan below skip every
  // cell (`y = r; y <= H - r` never runs), stranding it at the centre where it
  // spills out of the field. Cap the radius so a slot always exists.
  const rFit = Math.max(8, Math.min(W, H) / 2 - gap);
  const scaled = items
    .map((it) => ({ ...it, radius: Math.min(rFit, Math.max(Math.min(rMin, rFit), it.radius * scale)) }))
    .sort((a, b) => b.radius - a.radius);

  const placed = [];
  const cx = W / 2, cy = H / 2;
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

// Rank CRSP / equity items into bubbles. Lower rate ⇒ bigger, more urgent bubble
// (these are all "needs attention", so they share the below-goal tone).
// `weight` is 0..1; the radius is resolved later, once the field is measured.
function lagBubbles(items, keyFn, labelFn, titleFn) {
  const scored = items
    .map((it, i) => ({ it, i, rate: num(it.rate), size: Math.max(1, 85 - num(it.rate)) }))
    .sort((a, b) => b.size - a.size)
    .slice(0, MAX_BUBBLES);
  const maxV = Math.max(1, ...scored.map((s) => s.size));
  return scored.map(({ it, i, rate, size }) => ({
    key: keyFn(it, i),
    label: labelFn(it),
    title: titleFn(it),
    rate,
    goal: null, // CRSP/equity rows carry no per-row goal
    tone: 'below',
    sizeBy: 'lag',
    value: null, // a derived urgency score, not a countable quantity to label
    weight: size / maxV, // area fraction
    intensity: size / maxV,
  }));
}

// ── Mini trend line (selected measure) ───────────────────────
// Mirrors the classic Measure Detail chart: a line with month ticks, muted
// mid-points, and the current rate called out at the end.
export const MiniTrend = ({ data }) => {
  if (!data || data.length < 2) return <div className="ov2-trend-empty">No trend data</div>;
  const W = 260, H = 96, padL = 10, padR = 46, padT = 14, padB = 22;
  const innerW = W - padL - padR;
  const pts = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * innerW,
    y: padT + (1 - num(d.rate) / 100) * (H - padT - padB),
    rate: num(d.rate),
    month: (d.month || '').split('-')[0],
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg className="ov2-trend2" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }} aria-hidden="true">
      <path d={line} className="ov2-trend2-line" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={`d${i}`} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 5 : 2.5}
          className={i === pts.length - 1 ? 'ov2-trend2-dot-end' : 'ov2-trend2-dot'} />
      ))}
      <text x={last.x + 10} y={last.y + 4} className="ov2-trend2-val">{last.rate}%</text>
      {pts.map((p, i) => (
        <text key={`m${i}`} x={p.x} y={H - 5} className="ov2-trend2-month" textAnchor="middle">{p.month}</text>
      ))}
    </svg>
  );
};

const OverviewExplore = ({ onInvestigate, token, selectedMonth, onMonthChange, availableMonths, statusFilter = 'Below Goal', onStatusFilter, category = null, onCategory }) => {
  const [lens, setLens] = useState('Measures');
  const setStatusFilter = onStatusFilter || (() => {});
  const setCategory = onCategory || (() => {});
  const [selectedId, setSelectedId] = useState(null);

  const { data, loading, error, refetch } = useAsync(async () => {
    try {
      const [grid, kpis, lowest, crsps, equity] = await Promise.all([
        fetchAllMeasuresGrid(token),
        fetchDashboardKPI(token),
        fetchLowestPerformingMeasures(token),
        fetchCRSPsNeedingAttention(token),
        fetchEquityAlerts(token),
      ]);
      if (!grid || grid.length === 0) throw new Error('empty');
      return { grid, kpis, lowest, crsps, equity, sample: false };
    } catch (e) {
      return { grid: SAMPLE_MEASURES, kpis: sampleKpis(), lowest: sampleLowest(), crsps: sampleCrsps(), equity: sampleEquityAlerts(), sample: true };
    }
  }, [token, selectedMonth], { enabled: !!token });

  const grid = data?.grid || [];
  const usingSample = data?.sample;
  const crspList = data?.crsps || [];
  const equityList = data?.equity || [];

  // Category ("sub-category") tabs come from whatever domains the data carries.
  const categories = useMemo(() => categoriesOf(grid), [grid]);
  // The active category scopes every measure derivation below; null = All. Bubble
  // sizing (maxV) is normalized within the category so switching status tabs
  // inside a category never rescales the field.
  const catGrid = useMemo(
    () => (category ? grid.filter((m) => categoryOf(m) === category) : grid),
    [grid, category]
  );

  // Derive every size/shade input once, over the WHOLE measure set. `maxV` is
  // global on purpose: normalizing inside the active status filter would make a
  // "big" Above Goal bubble and a "big" Below Goal bubble encode different
  // absolute values, so nothing could be compared across tabs.
  const measureStats = useMemo(() => {
    const rows = catGrid.map((m) => {
      const rate = num(m.rate);
      const goal = num(m.goal_50th);
      return {
        ...m,
        _rate: rate,
        _goal: goal,
        _nonComp: Math.max(0, num(m.denominator) - num(m.numerator)),
        _dist: Math.abs(rate - goal),
        _att: goal > 0 ? rate / goal : 1, // attainment against its own goal
      };
    });
    // Without denominators there are no member counts to size by; fall back to
    // points-from-goal and say so in the caption.
    const sizeKey = rows.some((m) => m._nonComp > 0) ? '_nonComp' : '_dist';
    return { rows, sizeKey, maxV: Math.max(1, ...rows.map((m) => m[sizeKey])) };
  }, [catGrid]);

  // Bubbles are normalized to { key, label, title, rate, tone, sizeBy, radius,
  // measureId? } so the field renders the same way for every lens. Only the
  // Measures lens carries a measureId (its bubbles open the detail panel).
  //   • Measures  — SIZE = members with an open gap (falls back to distance
  //     from goal); filtered by the active status pill.
  //   • Providers — CRSPs needing attention; SIZE = how far below target.
  //   • Equity    — equity disparities; SIZE = how far below target.
  const bubbleData = useMemo(() => {
    if (lens === 'Providers') {
      return lagBubbles(crspList,
        (c, i) => `crsp-${i}`, (c) => acronym(c.crsp_name),
        (c) => `${c.crsp_name} · ${shortId(c.measure_id)}`);
    }
    if (lens === 'Equity') {
      return lagBubbles(equityList,
        (a, i) => `eq-${i}`, (a) => shortId(a.measure_id),
        (a) => `${a.display_name || shortId(a.measure_id)} · ${a.race_strat}`);
    }
    const { rows, sizeKey, maxV } = measureStats;
    return rows
      .filter((m) => m.kpi_status === statusFilter)
      .sort((a, b) => b[sizeKey] - a[sizeKey])
      .slice(0, MAX_BUBBLES)
      .map((m) => ({
        key: m.measure_id,
        label: shortId(m.measure_id),
        title: m.display_name,
        rate: m._rate,
        goal: m._goal,
        tone: STATUS_TONE[m.kpi_status] || 'below',
        sizeBy: sizeKey === '_nonComp' ? 'gap' : 'dist',
        measureId: m.measure_id,
        att: m._att, // what the shade encodes; surfaced in the tooltip
        value: m[sizeKey], // raw metric, so the legend can label its own scale
        weight: m[sizeKey] / maxV, // area fraction, against the global max
        intensity: severityFor(m._rate, m._goal),
      }));
  }, [lens, measureStats, statusFilter, crspList, equityList]);

  const fieldRef = useRef(null);
  const [fieldSize, setFieldSize] = useState({ w: 720, h: 520 });

  // Draggable split between the bubble field and the detail panel, so the panel
  // can be widened for its content. Width is a px value driven into a CSS var on
  // .ov2-body; the field re-packs itself via its ResizeObserver. Persisted, and
  // reset on double-click of the handle.
  const bodyRef = useRef(null);
  const pendingW = useRef(null);
  const [panelW, setPanelW] = useState(() => {
    const v = Number(localStorage.getItem('qp_v2_panelw'));
    return v > 0 ? v : null;
  });
  const clampW = (w, rect) => {
    const min = 300;
    const max = Math.max(min, rect.width - 420); // always leave the field room
    return Math.min(max, Math.max(min, w));
  };
  const startResize = (e) => {
    const body = bodyRef.current;
    if (!body) return;
    e.preventDefault();
    const rect = body.getBoundingClientRect();
    const onMove = (ev) => {
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const w = clampW(rect.right - x, rect);
      pendingW.current = w;
      setPanelW(w);
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
      if (pendingW.current) localStorage.setItem('qp_v2_panelw', String(Math.round(pendingW.current)));
    };
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };
  const nudgeResize = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const body = bodyRef.current;
    if (!body) return;
    e.preventDefault();
    const rect = body.getBoundingClientRect();
    const base = panelW || Math.min(380, Math.max(300, rect.width * 0.25));
    const w = clampW(base + (e.key === 'ArrowLeft' ? 24 : -24), rect);
    setPanelW(w);
    localStorage.setItem('qp_v2_panelw', String(Math.round(w)));
  };
  const resetResize = () => { setPanelW(null); localStorage.removeItem('qp_v2_panelw'); };
  useLayoutEffect(() => {
    const el = fieldRef.current;
    if (!el) return undefined;
    let t = null;
    const apply = () => {
      const w = el.clientWidth || 720, h = el.clientHeight || 520;
      // Skip no-op writes: ResizeObserver fires on sub-pixel reflow and each
      // setState here re-packs every bubble.
      setFieldSize((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    apply(); // first pack is immediate
    // Debounce reflow: dragging the panel resizer changes the field width every
    // frame, and re-packing on each one makes the bubbles teleport. Let them
    // hold position while the size is changing (the wrap clips), then re-pack
    // once it settles.
    const ro = new ResizeObserver(() => { if (t) clearTimeout(t); t = setTimeout(apply, 110); });
    ro.observe(el);
    return () => { if (t) clearTimeout(t); ro.disconnect(); };
  }, [lens, loading, error]);

  // Every status group's weights, so the fit-to-field scale can be derived from
  // the densest one and shared. Providers/Equity are their own universe (a
  // different size metric), so they just fit themselves.
  const scaleGroups = useMemo(() => {
    if (lens !== 'Measures') return null;
    const { rows, sizeKey, maxV } = measureStats;
    return Object.keys(STATUS_PANELS).map((status) =>
      rows.filter((m) => m.kpi_status === status)
        .map((m) => m[sizeKey] / maxV)
        .sort((a, b) => b - a));
  }, [lens, measureStats]);

  // Radii resolve against the measured field, so the same data packs sensibly
  // into a 1200px desktop field and a 320px phone one.
  const packed = useMemo(() => {
    const { w, h } = fieldSize;
    const { rMin, rMax } = radiusScale(w, h);
    const budget = bubbleBudget(w, h);
    const groups = (scaleGroups || [bubbleData.map((b) => b.weight).sort((a, b) => b - a)])
      .map((g) => g.slice(0, budget));
    const scale = fitScale(groups, w, h, rMin, rMax);
    const items = bubbleData
      .slice(0, budget)
      .map((b) => ({ ...b, radius: radiusFor(b.weight, rMin, rMax) }));
    return packCircles(items, w, h, rMin, scale);
  }, [bubbleData, fieldSize, scaleGroups]);

  useEffect(() => { setSelectedId(null); }, [statusFilter, lens, category]);

  // The legend labels the scale of what is actually drawn, not of the whole set.
  const legend = useMemo(() => {
    if (!packed.length) return null;
    const vals = packed.map((b) => b.value).filter((v) => Number.isFinite(v));
    return {
      sizeBy: packed[0].sizeBy,
      tone: lens === 'Measures' ? (STATUS_TONE[statusFilter] || 'below') : 'below',
      min: vals.length ? Math.min(...vals) : NaN,
      max: vals.length ? Math.max(...vals) : NaN,
    };
  }, [packed, lens, statusFilter]);

  const selected = useMemo(() => grid.find((m) => m.measure_id === selectedId) || null, [grid, selectedId]);
  // The summary panel mirrors the active status filter (below / at / above goal),
  // scoped to the active category.
  const statusMeasures = useMemo(() => catGrid.filter((m) => m.kpi_status === statusFilter), [catGrid, statusFilter]);
  const matchCount = statusMeasures.length;
  const panelCfg = STATUS_PANELS[statusFilter] || STATUS_PANELS['Below Goal'];

  // "Critical" only applies to below-goal measures (≥20 pts under target).
  const criticalCount = useMemo(
    () => (statusFilter === 'Below Goal'
      ? statusMeasures.filter((m) => num(m.goal_50th) - num(m.rate) >= 20).length
      : 0),
    [statusMeasures, statusFilter]
  );

  // Ranked, de-duplicated list for the panel — worst-first below goal,
  // best-first above goal. Ranked by attainment (rate ÷ its own goal), not raw
  // rate: 38% against a 52% target is a worse miss than 53% against a 64% one,
  // and sorting by rate alone would put them the other way round.
  const panelList = useMemo(() => {
    const seen = new Set();
    const att = (m) => (num(m.goal_50th) > 0 ? num(m.rate) / num(m.goal_50th) : num(m.rate) / 100);
    return [...statusMeasures]
      .sort((a, b) => (panelCfg.dir === 'desc' ? att(b) - att(a) : att(a) - att(b)))
      .filter((m) => {
        if (!m.measure_id || seen.has(m.measure_id)) return false;
        seen.add(m.measure_id);
        return true;
      });
  }, [statusMeasures, panelCfg.dir]);

  // The right-hand summary panel adapts to the active lens. On Measures it
  // mirrors the status filter; on Providers/Equity it becomes the matching
  // "where to focus" card (rows carry no total, so the big number stands alone).
  const activePanel = useMemo(() => {
    if (lens === 'Providers') {
      return {
        ...LENS_PANELS.Providers, count: crspList.length, total: null, sub: null,
        rows: crspList.slice(0, 6).map((c, i) => ({
          key: `crsp-${i}`, label: c.crsp_name, meta: shortId(c.measure_id), rate: c.rate, measureId: c.measure_id,
        })),
      };
    }
    if (lens === 'Equity') {
      return {
        ...LENS_PANELS.Equity, count: equityList.length, total: null, sub: null,
        rows: equityList.slice(0, 6).map((a, i) => ({
          key: `eq-${i}`, label: a.race_strat, meta: shortId(a.measure_id), rate: a.rate, measureId: a.measure_id,
        })),
      };
    }
    return {
      ...panelCfg, count: matchCount, total: catGrid.length,
      sub: panelCfg.tone === 'below' && matchCount > 0 ? `↘ ${criticalCount} critical · ${matchCount} below target` : null,
      read: portfolioRead(statusMeasures, statusFilter, catGrid.length),
      rows: panelList.slice(0, 6).map((m) => ({
        key: m.measure_id, label: m.display_name, meta: null, rate: num(m.rate),
        goal: num(m.goal_50th), measureId: m.measure_id, pick: true,
      })),
    };
  }, [lens, crspList, equityList, panelCfg, matchCount, catGrid.length, criticalCount, panelList, statusMeasures, statusFilter]);

  const fieldTotal = lens === 'Providers' ? crspList.length : lens === 'Equity' ? equityList.length : matchCount;

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
          <div className="ov2-toolbar-left">
            {/* A single lens is a heading, not a control — a lone segmented pill
                reads as a button you can press for no effect. The tablist returns
                automatically the moment a second lens is re-enabled. */}
            {LENSES.length > 1 ? (
              <div className="ov2-lenses" role="tablist" aria-label="Lens">
                {LENSES.map((l) => (
                  <button key={l} role="tab" aria-selected={lens === l}
                    className={`ov2-lens ${lens === l ? 'is-active' : ''}`} onClick={() => setLens(l)}>{l}</button>
                ))}
              </div>
            ) : (
              <h2 className="ov2-section-title">{LENSES[0]}</h2>
            )}
            {lens === 'Measures' && categories.length > 1 && (
              <CategoryTabs categories={categories} value={category} onChange={setCategory} count={grid.length} />
            )}
          </div>
          {lens === 'Measures' && (
            <div className="ov2-pills" role="group" aria-label="Filter by status">
              {FILTERS.map((f) => (
                <button key={f.status}
                  className={`ov2-pill ov2-pill-${f.tone} ${statusFilter === f.status ? 'is-active' : ''}`}
                  aria-pressed={statusFilter === f.status} onClick={() => setStatusFilter(f.status)}>{f.label}</button>
              ))}
            </div>
          )}
        </div>

        <div className="ov2-body" ref={bodyRef}
          style={panelW ? { '--ov2-panel-w': `${panelW}px` } : undefined}>
          <div className="ov2-field-wrap" onClick={() => selectedId && setSelectedId(null)}>
            {error ? (
              <ErrorState message="Couldn't load measures." onRetry={refetch} />
            ) : (
              <div className="ov2-field" ref={fieldRef}>
                {loading ? (
                  <div className="ov2-field-loading">
                    {[104, 78, 60, 46].map((s, i) => <Skeleton key={i} width={s} height={s} radius={9999} />)}
                  </div>
                ) : packed.length === 0 ? (
                  lens === 'Providers' ? (
                    <EmptyState icon="✅" title="No CRSPs flagged" hint="No providers need attention this month." />
                  ) : lens === 'Equity' ? (
                    <EmptyState icon="✅" title="No equity alerts" hint="No equity disparities detected this month." />
                  ) : (
                    <EmptyState icon={statusFilter === 'Below Goal' ? '✅' : '🔍'}
                      title={`No measures ${statusFilter.toLowerCase()}`}
                      hint={statusFilter === 'Below Goal' ? 'Nothing needs attention this month.' : 'Try another status.'} />
                  )
                ) : (
                  <div className="ov2-bubbles" key={`${lens}-${statusFilter}`}>
                    {packed.map((b, i) => {
                      const isSel = b.measureId && b.measureId === selectedId;
                      const d = 2 * b.radius;
                      // Legibility tiers: the id always fits, the rate needs a
                      // second line, the goal a third, the gap a fourth.
                      const compact = d < 64;
                      const small = d < 88; // long ids ("AMM Cont") overrun 13px type here
                      // The size anchor: bubbles are sized by open-gap members, so
                      // print that count. Without it the eye reads size off the
                      // goal-distance lines and thinks size = "furthest below".
                      const showOpen = d >= 88 && b.sizeBy === 'gap' && b.value > 0;
                      const showGoal = d >= 104 && b.goal > 0;
                      return (
                        <button key={b.key}
                          className={`ov2-bubble ov2-bubble-${b.tone} ${compact ? 'is-compact' : ''} ${small ? 'is-sm' : ''} ${isSel ? 'is-selected' : ''} ${selectedId && !isSel ? 'is-dim' : ''} ${b.measureId ? '' : 'is-static'}`}
                          style={{ left: b.x - b.radius, top: b.y - b.radius, width: d, height: d, '--i': b.intensity, animationDelay: `${Math.min(i * 35, 600)}ms` }}
                          onClick={(e) => { e.stopPropagation(); if (b.measureId) setSelectedId(b.measureId); }}
                          title={b.goal > 0
                            ? `${b.title} · ${b.rate}% vs ${b.goal}% goal · ${Math.round(b.att * 100)}% of target · ${fmtCount(b.value)} members with an open gap`
                            : `${b.title} · ${b.rate}%`}>
                          <span className="ov2-bubble-id">{b.label}</span>
                          {!compact && <span className="ov2-bubble-rate num">{b.rate}%</span>}
                          {showOpen && (
                            <span className="ov2-bubble-open num">
                              {fmtCount(b.value)}<span className="ov2-bubble-open-tag"> open</span>
                            </span>
                          )}
                          {showGoal && <span className="ov2-bubble-goal num">goal {b.goal}%</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {/* Sibling of the field, not an overlay: the field's measured height
                then excludes the caption, so bubbles can never sit on it however
                many lines the legend wraps to. */}
            {!error && !loading && legend && (
              <FieldLegend shown={packed.length} total={fieldTotal} lens={lens} {...legend} />
            )}
          </div>

          <div className="ov2-resizer" role="separator" aria-orientation="vertical"
            aria-label="Resize panel — drag, arrow keys, or double-click to reset" tabIndex={0}
            onPointerDown={startResize} onKeyDown={nudgeResize} onDoubleClick={resetResize}>
            <span className="ov2-resizer-grip" aria-hidden="true" />
          </div>

          <aside className="ov2-panel">
            <div className="ov2-panel-anim" key={selected ? selected.measure_id : `default-${lens}`}>
              {selected ? (
                <SelectedPanel measure={selected} crsps={data?.crsps || []} token={token}
                  peers={statusMeasures} selectedMonth={selectedMonth}
                  onInvestigate={() => onInvestigate && onInvestigate(selected)} />
              ) : (
                <DefaultPanel loading={loading} panel={activePanel} onPick={setSelectedId} />
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

// Shared signal list used by every read.
export const Signals = ({ items, className = '' }) => (
  <ul className={`ov2-read-signals ${className}`}>
    {items.map((s, i) => (
      <li key={i}><span className="ov2-read-k mono">{s.k}</span><span className="ov2-read-v">{s.v}</span></li>
    ))}
  </ul>
);

// One collapsible intelligence row. The one-line summary is always visible; the
// math/detail expands on click. This is what keeps the four-stage read to four
// scannable lines instead of four screens of scroll.
export const Stage = ({ label, summary, tag, tagKind, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const hasBody = Boolean(children);
  return (
    <section className={`ov2-st ${open ? 'is-open' : ''}`}>
      <button type="button" className="ov2-st-head" aria-expanded={hasBody ? open : undefined}
        disabled={!hasBody} onClick={() => hasBody && setOpen((o) => !o)}>
        <span className="ov2-st-top">
          <span className="eyebrow ov2-st-label">{label}</span>
          {tag && <span className={`ov2-st-tag mono ${tagKind === 'preview' ? 'is-preview' : ''}`}>{tag}</span>}
          {hasBody && (
            <span className="ov2-st-chev" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
          )}
        </span>
        <span className="ov2-st-summary">{summary}</span>
      </button>
      {open && hasBody && <div className="ov2-st-body">{children}</div>}
    </section>
  );
};

// Stage 4 · Learning — folded into the recommendation row (recommend → apply →
// learn is one thought). Applying logs locally; the loop then shows how the
// outcome would sharpen the next recommendation.
const LearningInline = ({ measure, rec }) => {
  const [state, setState] = useState(() => learningState(measure.measure_id));
  useEffect(() => setState(learningState(measure.measure_id)), [measure.measure_id]);
  if (state.count === 0) {
    return (
      <button type="button" className="btn btn-secondary btn-sm ov2-learn-btn"
        onClick={() => setState(recordApplied(measure.measure_id, rec.action))}>
        Mark action applied
      </button>
    );
  }
  return (
    <div className="ov2-learn">
      <div className="ov2-learn-loop">
        <div className="ov2-learn-step"><span className="ov2-read-k mono">Applied</span><span>{state.last.action}</span></div>
        <div className="ov2-learn-arrow" aria-hidden="true">↓</div>
        <div className="ov2-learn-step"><span className="ov2-read-k mono">Next cycle</span><span>outcome feeds back to the recommendation</span></div>
        <div className="ov2-learn-arrow" aria-hidden="true">↓</div>
        <div className="ov2-learn-step is-round"><span className="ov2-read-k mono">Learned</span><span>weights this action higher for measures like {shortId(measure.measure_id)}</span></div>
      </div>
      <p className="ov2-read-why mono">Logged locally · a real deployment ties this to the next measurement cycle</p>
    </div>
  );
};

// The four-stage read, compact: one line each, math on expand. Shared by the
// Overview's selected panel and the Explorer's active-measure card, so a measure
// reads the same way wherever it is opened. `peers` are the measures it is ranked
// against (same status group); `crsps` are the CRSP rows behind its driver line.
export const MeasureIntel = ({ measure, crsps = [], token, peers, selectedMonth }) => {
  const rate = num(measure.rate);
  const numerator = num(measure.numerator);
  const denominator = num(measure.denominator);
  const nonCompliant = Math.max(0, denominator - numerator);

  // Stage 2 · Decision Intelligence — where this measure sits in the priority
  // order for the current status group, and the math behind that rank.
  const ranked = useMemo(() => rankByPriority(peers && peers.length ? peers : [measure]), [peers, measure]);
  const mine = ranked.find((s) => s.measure.measure_id === measure.measure_id) || ranked[0];
  const leader = ranked[0];

  const { data: trend, loading: trendLoading } = useAsync(
    () => fetchMiniChartData(measure.measure_id, token).catch(() => []),
    [measure.measure_id, selectedMonth], { enabled: !!token }
  );

  // Always show a trend: live mini-chart data when available, otherwise a
  // sample series ending at the measure's current rate (matches the rest of v2).
  const trendData = trend && trend.length >= 2 ? trend : sampleTrend(measure.measure_id, rate);
  // Stage 1 — Behavior Intelligence: a plain-language read of what's happening,
  // generated from the same numbers shown in the header and expandable detail.
  const read = behaviorRead(measure, trendData, crsps);
  const rec = recommendAction(measure, read);
  const isLeader = leader && leader.measure.measure_id === measure.measure_id;
  const prioSummary = isLeader
    ? `#1 of ${ranked.length} — the top recoverable opportunity here.`
    : `#${mine.rank} of ${ranked.length} — work ${shortId(leader.measure.measure_id)} first.`;

  return (
    <div className="ov2-intel">
      <Stage label="Behavior" summary={read.synthesis} tag={`Confidence · ${read.confidence.level}`}>
        <Signals items={read.signals} />
        {trendLoading ? <Skeleton height={64} radius={8} style={{ marginTop: 12 }} /> : <MiniTrend data={trendData} />}
        {denominator > 0 && (
          <div className="ov2-stats ov2-stats-3 ov2-intel-stats">
            <div><span className="ov2-stat-k">Numerator</span><span className="ov2-stat-v num">{numerator.toLocaleString()}</span></div>
            <div><span className="ov2-stat-k">Denominator</span><span className="ov2-stat-v num">{denominator.toLocaleString()}</span></div>
            <div><span className="ov2-stat-k">Non-compliant</span><span className="ov2-stat-v num is-neg">{nonCompliant.toLocaleString()}</span></div>
          </div>
        )}
        <p className="ov2-read-why mono">{read.confidence.why}</p>
      </Stage>

      <Stage label="Priority · where to focus" summary={prioSummary} tag={`Score ${mine.score}`}>
        <div className="ov2-prio">
          <span className="ov2-prio-bar"><span className="ov2-prio-fill" style={{ width: `${Math.max(4, mine.score)}%` }} /></span>
          <span className="ov2-prio-score mono num">{mine.score}</span>
        </div>
        <Signals items={priorityFactors(mine)} className="ov2-prio-factors" />
      </Stage>

      <Stage label="Recommended action" summary={rec.action} tag="Suggested" tagKind="preview">
        <p className="ov2-stage-lead">The intervention most likely to close this gap. Because {rec.rationale}.</p>
        <div className="ov2-rec-chips">
          {rec.chips.map((c, i) => <span key={i} className={`ov2-rec-chip mono ${c.strong ? 'is-strong' : ''}`}>{c.label}</span>)}
        </div>
        <p className="ov2-read-why mono">{rec.basis}</p>
        <p className="ov2-rec-applynote">Ran this play? Mark it applied — we log the action and weight it higher for measures like this next cycle.</p>
        <LearningInline measure={measure} rec={rec} />
      </Stage>
    </div>
  );
};

const DefaultPanel = ({ loading, panel, onPick }) => (
  <div className="ov2-panel-inner">
    <div className="eyebrow">{panel.eyebrow}</div>
    {loading ? <Skeleton width={140} height={40} radius={8} style={{ marginTop: 8 }} /> : (
      <div className="ov2-bench">
        <span className="ov2-bench-num num">{panel.count}</span>
        {panel.total != null && <span className="ov2-bench-total num">/{panel.total || '—'}</span>}
        <span className={`ov2-bench-tag ov2-bench-tag-${panel.tone}`}>{panel.tag}</span>
      </div>
    )}
    {!loading && panel.sub && <div className="ov2-bench-sub">{panel.sub}</div>}

    {!loading && panel.read && (
      <div className="ov2-intel">
        <Stage label="Board read" summary={panel.read.synthesis}
          tag={`Confidence · ${panel.read.confidence.level}`} defaultOpen>
          <Signals items={panel.read.signals} />
          <p className="ov2-read-why mono">{panel.read.confidence.why}</p>
        </Stage>
      </div>
    )}

    <div className="eyebrow ov2-panel-sub">{panel.listLabel}</div>
    <div className="ov2-list">
      {loading ? <SkeletonText lines={5} /> : panel.rows.length === 0 ? (
        <EmptyState icon="—" hint="Nothing to focus on here." />
      ) : panel.rows.map((r, i) => (
        <button key={r.key || i} className={`ov2-list-row ${r.pick ? '' : 'ov2-list-static'}`} style={{ animationDelay: `${i * 45}ms` }}
          onClick={() => (r.pick ? onPick(r.measureId) : null)}
          title={r.goal > 0 ? `${r.rate}% vs ${r.goal}% goal` : undefined}>
          <span className="ov2-list-label">
            {r.meta && <span className="ov2-list-meta mono">{r.meta}</span>}
            {r.label}
          </span>
          <span className="ov2-list-rates">
            {r.goal > 0 && <span className="ov2-list-goal num">goal {r.goal}%</span>}
            <span className={`ov2-list-rate ov2-list-rate-${panel.tone} num`}>{r.rate}%</span>
          </span>
        </button>
      ))}
    </div>
  </div>
);

const SelectedPanel = ({ measure, crsps, token, peers, selectedMonth, onInvestigate }) => {
  const rate = num(measure.rate), goal = num(measure.goal_50th);
  const gap = Math.round((rate - goal) * 10) / 10;
  const tone = STATUS_TONE[measure.kpi_status] || 'below';

  return (
    <div className="ov2-panel-inner ov2-panel-inner-cta">
      <span className={`ov2-chip ov2-chip-${tone} mono`}>{shortId(measure.measure_id)}</span>
      <h2 className="ov2-measure-name">{measure.display_name}</h2>
      {measure.measure_definition && <p className="ov2-measure-def">{measure.measure_definition}</p>}

      <div className="ov2-measure-rate">
        <span className="num">{rate}%</span>
        <span className={`ov2-gap ov2-gap-${gap >= 0 ? 'pos' : 'neg'} num`}>
          {gap === 0 ? 'at goal' : `${gap > 0 ? '↗' : '↘'} ${Math.abs(gap)} pts ${gap > 0 ? 'above' : 'below'} goal`}
        </span>
      </div>

      <div className="ov2-goalbar" title={`Goal ${goal}%`}>
        <span className={`ov2-goalbar-fill ov2-goalbar-${tone}`} style={{ width: `${Math.min(100, Math.max(0, rate))}%` }} />
        {goal > 0 && <span className="ov2-goalbar-marker" style={{ left: `${Math.min(100, goal)}%` }} />}
      </div>

      <MeasureIntel measure={measure} crsps={crsps} token={token} peers={peers} selectedMonth={selectedMonth} />

      {/* Pinned to the panel's bottom edge: the panel scrolls, the action doesn't. */}
      <div className="ov2-panel-cta">
        <button type="button" className="btn btn-primary btn-lg ov2-investigate" onClick={onInvestigate}>
          Investigate measure
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default OverviewExplore;
