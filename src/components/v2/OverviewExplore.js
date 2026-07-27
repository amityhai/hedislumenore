import { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import './OverviewExplore.css';
import MonthFilter from '../MonthFilter';
import { Skeleton, SkeletonText, EmptyState, ErrorState } from '../ui/Feedback';
import { useToast } from '../ui/Toast';
import useAsync from '../../hooks/useAsync';
import AssignPanel, { UNASSIGNED } from './AssignPanel';
import AssignmentStatus from './AssignmentStatus';
import {
  fetchAllMeasuresGrid,
  fetchDashboardKPI,
  fetchLowestPerformingMeasures,
  fetchCRSPsNeedingAttention,
  fetchEquityAlerts,
  fetchMiniChartData,
  fetchCRSPLevelData,
  fetchMeasureStratification,
  fetchMeasureStratificationRace,
  fetchMeasureStratificationEthnicity,
} from '../../services/workflowService';
import {
  STATUS_TONE, num, shortId, acronym, behaviorRead, portfolioRead,
  withCustomGoals,
  categoryOf, categoriesOf,
  SAMPLE_MEASURES, sampleKpis, sampleLowest, sampleCrsps, sampleEquityAlerts, sampleTrend,
  sampleProviders, sampleEquity,
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
// Saturation anchor: a rate 30% away from its goal (in relative terms) paints
// the deepest shade — still drives `--i` on the goal-less Providers/Equity
// bubbles. Absolute, not per-tab, so a deep bubble means the same thing
// everywhere.
const SEVERITY_SPAN = 0.3;
const severityFor = (rate, goal) => (goal > 0 ? Math.min(1, Math.abs(rate / goal - 1) / SEVERITY_SPAN) : 0.5);

const fmtCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(n)));

// The field's key. Swatches are drawn from the same tone tokens as the bubbles,
// so the legend and the chart are visibly the same scale rather than a caption
// that asserts a relationship the reader has to take on faith.
const FieldLegend = ({ shown, total, sizeBy, tone, min, max, lens }) => {
  const range = Number.isFinite(min) && Number.isFinite(max) && min !== max
    ? (sizeBy === 'gap' ? `${fmtCount(min)}–${fmtCount(max)} members` : `${Math.round(min)}–${Math.round(max)} pts`)
    : null;
  const dots = <span className={`ov2-legend-dots ov2-legend-dots-${tone}`} aria-hidden="true"><i /><i /><i /></span>;
  const ramp = <span className={`ov2-legend-ramp ov2-legend-ramp-${tone}`} aria-hidden="true" />;
  // Ring swatch — a ~68%-filled arc, mirroring a below-goal bubble. Encodes the
  // same thing the bubbles now do: the arc fills toward goal, the empty span is
  // the gap left to close.
  const RC = 2 * Math.PI * 6.5;
  const ringSwatch = (
    <svg className={`ov2-legend-ring ov2-legend-ring-${tone}`} width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle className="ov2-legend-ring-track" cx="9" cy="9" r="6.5" fill="none" strokeWidth="2.6" />
      <circle className="ov2-legend-ring-arc" cx="9" cy="9" r="6.5" fill="none" strokeWidth="2.6" strokeLinecap="round"
        strokeDasharray={`${0.68 * RC} ${RC}`} transform="rotate(-90 9 9)" />
    </svg>
  );

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
        {ringSwatch}
        <span>
          ring = progress to goal
          <em className="ov2-legend-range"> · full ring → at goal</em>
        </span>
      </span>
    </div>
  );
};

const MAX_BUBBLES = 20;
const PACK_DENSITY = 0.42; // total bubble area as a fraction of the field area

// ── Bubble size bounds ───────────────────────────────────────
// The MINIMUM is a legibility floor, not an aesthetic one: a bubble that can't
// carry its own id and rate is a dot the reader has to hover to identify, which
// defeats the point of drawing it. D_LABEL is the diameter at which the id and
// the "44% / 55%" line both fit, so the smallest bubble on the board is still
// self-describing. The MAXIMUM stops the largest measure from swallowing the
// field and starving the packer.
//
// These two also fix what the size channel can encode: an area range of
// (R_MAX/R_MIN)² ≈ 6.7x against roughly 12x in the data, so the extremes
// compress toward the bounds rather than the middle stretching. That trade is
// deliberate — an honest-but-illegible 8px dot reads as noise, and the exact
// counts are printed on the bubble and in the table view anyway.
const D_LABEL = 68;          // smallest diameter that fits id + rate/goal
const R_MIN = D_LABEL / 2;   // 34
const R_MAX = 88;

// Radii are derived from the field as well as the bounds: an 88px radius that
// reads well on a 1200px desktop field swallows a 320px phone field whole, so
// the shorter edge scales both bounds down together and the floor gives way
// when the field genuinely can't host it.
function radiusScale(W, H) {
  const edge = Math.min(W, H);
  const rMax = Math.max(30, Math.min(R_MAX, edge * 0.2));
  const rMin = Math.max(15, Math.min(R_MIN, rMax * 0.42));
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

const OverviewExplore = ({ onInvestigate, token, selectedMonth, onMonthChange, availableMonths, category = null, onCategory }) => {
  const [lens, setLens] = useState('Measures');
  // The status tab drives the bubble field (a field needs one band at a time).
  // Held here rather than in ScorecardV2: it only means anything to this board.
  const [statusFilter, setStatusFilter] = useState('Below Goal');
  // The board renders the same set two ways. The bubble field is the comparison
  // view (relative size and progress at a glance); the table is the reading view
  // (exact numbers, every measure in one scroll). An explicit pick is persisted;
  // null means "no preference", and the default then follows the viewport.
  const [boardView, setBoardView] = useState(() => localStorage.getItem('qp_v2_board') || null);
  const pickBoardView = (v) => { setBoardView(v); localStorage.setItem('qp_v2_board', v); };

  // Below this width the field's bubble budget drops to 8 and the legibility
  // floor collides with the fitted maximum, so every disc comes out the same
  // size and the size channel encodes nothing. The table says more in that
  // space, so it becomes the default — an explicit pick still wins.
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const onChange = (e) => setIsNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const effectiveView = boardView || (isNarrow ? 'table' : 'bubbles');
  const setCategory = onCategory || (() => {});
  const [selectedId, setSelectedId] = useState(null);
  const [assignScope, setAssignScope] = useState(null); // {measure, level, intervention}
  const toast = useToast();

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
      return { grid: withCustomGoals(grid), kpis, lowest, crsps, equity, sample: false };
    } catch (e) {
      return { grid: withCustomGoals(SAMPLE_MEASURES), kpis: sampleKpis(), lowest: sampleLowest(), crsps: sampleCrsps(), equity: sampleEquityAlerts(), sample: true };
    }
  }, [token, selectedMonth], { enabled: !!token });

  const grid = data?.grid || [];
  const usingSample = data?.sample;
  const crspList = data?.crsps || [];
  const equityList = data?.equity || [];

  // Category ("sub-category") tabs come from whatever domains the data carries.
  const categories = useMemo(() => categoriesOf(grid), [grid]);
  const categoryCounts = useMemo(() => {
    const c = {};
    grid.forEach((m) => { const k = categoryOf(m); if (k) c[k] = (c[k] || 0) + 1; });
    return c;
  }, [grid]);
  // There is no "All" tab, so a category is always in force once the data names
  // one — seed the first the moment it's known.
  useEffect(() => {
    if (!category && categories.length) setCategory(categories[0]);
    // setCategory is a prop-or-noop; re-running on its identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, categories]);
  // The active category scopes every measure derivation below. Bubble sizing
  // (maxV) is normalized within the category so switching status tabs inside a
  // category never rescales the field.
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
  // A measure is ranked against its OWN band, not whichever tab happens to be
  // active. A focus card can select a measure from another band, and MeasureIntel
  // falls back to ranked[0] when it can't find the measure among its peers — so
  // handing it the wrong band would quietly print another measure's rank as this
  // one's.
  const selectedPeers = useMemo(
    () => (selected ? catGrid.filter((m) => m.kpi_status === selected.kpi_status) : []),
    [catGrid, selected]
  );
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

  // The focus cards live inside the panel now, so picking one selects the measure
  // right where the reader already is — no scroll back up to a board a viewport away.
  const pickFromFocus = (id) => { if (id) setSelectedId(id); };

  // Stepping through measures with the panel's arrows follows the SAME ranked
  // order the panel's own list uses (worst-first below goal, best-first above),
  // not the bubble field's packing order — the field is a spatial layout with no
  // meaningful "next". Arrows are the keyboard-free way to walk the ranking.
  const panelIds = useMemo(() => panelList.map((m) => m.measure_id), [panelList]);
  const selIdx = selectedId ? panelIds.indexOf(selectedId) : -1;
  const stepMeasure = (dir) => {
    if (selIdx < 0 || !panelIds.length) return;
    const next = (selIdx + dir + panelIds.length) % panelIds.length;
    setSelectedId(panelIds[next]);
  };

  // The three "where to focus" lists, one card at a time in the panel. They read
  // the worst performers, the flagged CRSPs and the equity gaps regardless of the
  // board's active pill — so they stay the highest-signal lists on the page while
  // costing the panel's width instead of a whole band along the bottom.
  const lowestList = data?.lowest || [];
  const focusCards = useMemo(() => [
    {
      key: 'measures', title: 'Lowest Performing Measures',
      rows: lowestList.slice(0, 5).map((m) => ({
        key: m.measure_id, label: m.display_name, rate: Math.round(num(m.rate)), measureId: m.measure_id,
      })),
    },
    {
      key: 'crsps', title: 'CRSPs Needing Attention',
      rows: crspList.slice(0, 5).map((c, i) => ({
        key: `focus-crsp-${i}`, label: c.crsp_name, meta: shortId(c.measure_id),
        rate: Math.round(num(c.rate)), measureId: c.measure_id,
      })),
    },
    {
      key: 'equity', title: 'Equity Alerts',
      badge: equityList.length ? `${equityList.length} active` : null,
      rows: equityList.slice(0, 5).map((a, i) => ({
        key: `focus-eq-${i}`, label: a.race_strat, meta: shortId(a.measure_id),
        rate: Math.round(num(a.rate)), measureId: a.measure_id,
      })),
    },
  ], [lowestList, crspList, equityList]);

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
              <CategoryTabs categories={categories} value={category} onChange={setCategory} counts={categoryCounts} />
            )}
          </div>
          {lens === 'Measures' && (
            <div className="ov2-viewtoggle" role="group" aria-label="Board view">
              <button type="button" aria-pressed={effectiveView === 'bubbles'}
                className={`ov2-viewbtn ${effectiveView === 'bubbles' ? 'is-active' : ''}`}
                onClick={() => pickBoardView('bubbles')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="8" cy="9" r="4.5" /><circle cx="17" cy="15" r="3" />
                </svg>
                Bubbles
              </button>
              <button type="button" aria-pressed={effectiveView === 'table'}
                className={`ov2-viewbtn ${effectiveView === 'table' ? 'is-active' : ''}`}
                onClick={() => pickBoardView('table')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
                </svg>
                Table
              </button>
            </div>
          )}
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
          {effectiveView === 'table' ? (
            <MeasureTable rows={panelList} loading={loading} error={error} onRetry={refetch}
              selectedId={selectedId} onPick={setSelectedId} statusFilter={statusFilter} />
          ) : (
          <div className="ov2-field-wrap" onClick={() => selectedId && setSelectedId(null)}>
            {/* Clear rides the field, not the panel header: the selection was made
                here, so the way out of it belongs here too — and the panel's top
                row is then free for the measure's own identity and stepper. */}
            {selectedId && !loading && !error && (
              <button type="button" className="ov2-clear ov2-clear-field"
                onClick={(e) => { e.stopPropagation(); setSelectedId(null); }} title="Clear selection">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Clear
              </button>
            )}
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
                      // Light fill + progress-arc ring. The arc fills from the top
                      // to (rate / goal); the empty span is the gap left to close.
                      // att is that fraction, capped 0..1. Bubbles without a goal
                      // (Providers/Equity lens) keep the flat tone.
                      const proto = b.goal > 0;
                      const sw = Math.max(3, d * 0.055);          // ring thickness (constant)
                      const rr = b.radius - sw / 2 - 1;           // inset so the stroke sits inside the disc
                      const circ = 2 * Math.PI * rr;
                      const frac = Math.max(0, Math.min(1, b.att != null ? b.att : b.rate / b.goal));
                      // Legibility tiers: the id always fits, the rate needs a
                      // second line, the goal a third, the gap a fourth.
                      // Tiers are pinned to D_LABEL, the size floor: at the
                      // smallest bubble the board draws, the id and the
                      // "44% / 55%" line both fit, so nothing is ever an
                      // unidentifiable dot. `compact` only fires below the floor,
                      // i.e. when the field itself is too small to honour it.
                      const compact = d < D_LABEL;
                      const small = d < 88; // long ids ("AMM Cont") overrun 13px type here
                      // The size anchor: bubbles are sized by open-gap members, so
                      // print that count. Without it the eye reads size off the
                      // goal-distance lines and thinks size = "furthest below".
                      const showOpen = d >= 88 && b.sizeBy === 'gap' && b.value > 0;
                      // The goal rides the rate line as "58% / 66%" rather than
                      // taking a line of its own — same information, one less row
                      // of type inside the disc, so it fits at the floor.
                      const showGoal = d >= D_LABEL && b.goal > 0;
                      return (
                        <button key={b.key}
                          className={`ov2-bubble ov2-bubble-${b.tone} ${proto ? 'is-proto' : ''} ${compact ? 'is-compact' : ''} ${small ? 'is-sm' : ''} ${isSel ? 'is-selected' : ''} ${selectedId && !isSel ? 'is-dim' : ''} ${b.measureId ? '' : 'is-static'}`}
                          style={{ left: b.x - b.radius, top: b.y - b.radius, width: d, height: d, '--i': b.intensity, animationDelay: `${Math.min(i * 35, 600)}ms` }}
                          onClick={(e) => { e.stopPropagation(); if (b.measureId) setSelectedId(b.measureId); }}
                          title={b.goal > 0
                            ? `${b.title} · ${b.rate}% vs ${b.goal}% goal · ${Math.round(b.att * 100)}% of target · ${fmtCount(b.value)} members with an open gap`
                            : `${b.title} · ${b.rate}%`}>
                          {proto && (
                            <svg className="ov2-bubble-ring" width={d} height={d} viewBox={`0 0 ${d} ${d}`} aria-hidden="true">
                              <circle className="ov2-ring-track" cx={b.radius} cy={b.radius} r={rr} fill="none" strokeWidth={sw} />
                              <circle className="ov2-ring-arc" cx={b.radius} cy={b.radius} r={rr} fill="none" strokeWidth={sw}
                                strokeLinecap="round" strokeDasharray={`${frac * circ} ${circ}`}
                                transform={`rotate(-90 ${b.radius} ${b.radius})`} />
                            </svg>
                          )}
                          <span className="ov2-bubble-id">{b.label}</span>
                          {!compact && (
                            <span className="ov2-bubble-rate num">
                              {b.rate}%
                              {showGoal && <span className="ov2-bubble-goal"> / {b.goal}%</span>}
                            </span>
                          )}
                          {showOpen && (
                            <span className="ov2-bubble-open num">
                              {fmtCount(b.value)}<span className="ov2-bubble-open-tag"> open</span>
                            </span>
                          )}
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
          )}

          <div className="ov2-resizer" role="separator" aria-orientation="vertical"
            aria-label="Resize panel — drag, arrow keys, or double-click to reset" tabIndex={0}
            onPointerDown={startResize} onKeyDown={nudgeResize} onDoubleClick={resetResize}>
            <span className="ov2-resizer-grip" aria-hidden="true" />
          </div>

          <aside className="ov2-panel">
            <div className="ov2-panel-anim" key={selected ? selected.measure_id : `default-${lens}`}>
              {selected ? (
                <SelectedPanel measure={selected} crsps={data?.crsps || []} token={token}
                  peers={selectedPeers} selectedMonth={selectedMonth}
                  pos={selIdx >= 0 ? selIdx + 1 : null} total={panelIds.length}
                  onStep={stepMeasure}
                  onInvestigate={() => onInvestigate && onInvestigate(selected)}
                  onAssign={(intervention) => setAssignScope({ measure: selected, level: 'measure', intervention })} />
              ) : (
                <DefaultPanel loading={loading} panel={activePanel} cards={focusCards} onPick={pickFromFocus} />
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Assign flow, portaled so its fixed scrim escapes the board's stacking
          context — same panel the Explorer uses, seeded with the recommended play. */}
      {assignScope && createPortal(
        <OverviewAssign scope={assignScope} token={token} selectedMonth={selectedMonth}
          onClose={() => setAssignScope(null)}
          onAssign={(payload) => {
            setAssignScope(null);
            const { preview, assignedTo } = payload;
            toast({ type: 'success', message: `${preview.created.toLocaleString()} tasks queued · ${assignedTo === UNASSIGNED ? 'unassigned pool' : assignedTo}` });
          }} />,
        document.body
      )}
    </div>
  );
};

// Assign flow for the Overview's selected measure. The Overview's board data is
// cross-measure, so providers and equity for THIS measure are fetched on demand
// (mirroring the Explorer), letting the panel narrow by provider/stratum the same
// way. Falls back to the deterministic sample profile when the workflow is down.
const OverviewAssign = ({ scope, token, selectedMonth, onClose, onAssign }) => {
  const measure = scope.measure;
  const goal = num(measure?.goal_50th);

  const provAsync = useAsync(async () => {
    try {
      const crsps = await fetchCRSPLevelData(measure.measure_id, token);
      const rows = crsps.map((c) => ({ ...c, goal, overall: false }));
      if (!rows.length) throw new Error('empty');
      return rows;
    } catch (e) {
      return sampleProviders(measure.measure_id).map((p) => ({ ...p, goal, overall: p.crsp === 'Overall' }));
    }
  }, [measure.measure_id, token, selectedMonth], { enabled: !!measure });

  const eqAsync = useAsync(async () => {
    try {
      const [a, r, e] = await Promise.all([
        fetchMeasureStratification(measure.measure_id, token),
        fetchMeasureStratificationRace(measure.measure_id, token),
        fetchMeasureStratificationEthnicity(measure.measure_id, token),
      ]);
      const age = a?.[measure.measure_id]?.age || [];
      const race = r?.[measure.measure_id]?.race || [];
      const ethnicity = e?.[measure.measure_id]?.ethnicity || [];
      if (age.length + race.length + ethnicity.length === 0) throw new Error('empty');
      return { age, race, ethnicity };
    } catch (e) { return sampleEquity(measure.measure_id); }
  }, [measure.measure_id, token, selectedMonth], { enabled: !!measure });

  return (
    <AssignPanel measure={measure} providers={provAsync.data || []}
      equity={eqAsync.data || { age: [], race: [], ethnicity: [] }}
      scope={scope} token={token} selectedMonth={selectedMonth} onClose={onClose} onAssign={onAssign} />
  );
};

// The board's reading view. Same measures, same ranking and same selection as the
// bubble field — but the numbers the field can only encode (goal, gap, eligible,
// open gaps) are printed, and every measure is in one scroll rather than capped
// at what the field can legibly pack.
const MeasureTable = ({ rows, loading, error, onRetry, selectedId, onPick, statusFilter }) => {
  if (error) return <div className="ov2-tablewrap"><ErrorState message="Couldn't load measures." onRetry={onRetry} /></div>;
  if (loading) {
    return (
      <div className="ov2-tablewrap">
        <div className="ov2-table-loading">
          {[...Array(8)].map((_, i) => <Skeleton key={i} height={38} radius={8} style={{ marginBottom: 8 }} />)}
        </div>
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="ov2-tablewrap">
        <EmptyState icon={statusFilter === 'Below Goal' ? '✅' : '🔍'}
          title={`No measures ${statusFilter.toLowerCase()}`}
          hint={statusFilter === 'Below Goal' ? 'Nothing needs attention this month.' : 'Try another status.'} />
      </div>
    );
  }
  return (
    <div className="ov2-tablewrap">
      <table className="ov2-table">
        <thead>
          <tr>
            <th>Measure</th>
            <th className="ta-r">Rate</th><th className="ta-r">Goal</th><th className="ta-r">Gap</th>
            <th className="ta-r">Eligible</th><th className="ta-r">Open gaps</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const rate = num(m.rate), goal = num(m.goal_50th);
            const gap = Math.round((rate - goal) * 10) / 10;
            const denom = num(m.denominator);
            const open = Math.max(0, denom - num(m.numerator));
            const tone = STATUS_TONE[m.kpi_status] || 'below';
            const sel = m.measure_id === selectedId;
            return (
              <tr key={m.measure_id} className={sel ? 'is-selected' : ''}
                onClick={() => onPick(m.measure_id)} tabIndex={0} role="button"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(m.measure_id); } }}>
                <td>
                  <span className="ov2-table-measure">
                    <span className={`ov2-table-dot ov2-table-dot-${tone}`} aria-hidden="true" />
                    <span className="ov2-table-id mono">{shortId(m.measure_id)}</span>
                    <span className="ov2-table-name">{m.display_name}</span>
                  </span>
                </td>
                <td className="ta-r"><span className={`ov2-table-rate ov2-table-rate-${tone} num`}>{rate}%</span></td>
                <td className="ta-r num ov2-table-dim">{goal}%</td>
                <td className={`ta-r num ${gap < 0 ? 'is-neg' : 'is-pos'}`}>{gap >= 0 ? '+' : ''}{gap} pts</td>
                <td className="ta-r num ov2-table-dim">{denom ? denom.toLocaleString() : '—'}</td>
                <td className="ta-r num">{open ? open.toLocaleString() : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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

// One intelligence row: a labelled summary line with its supporting detail
// beneath. The accordion is gone — it existed to keep a four-stage read to four
// scannable lines, and there is only one stage left, so collapsing it just hid
// the content behind a click for no gain.
export const Stage = ({ label, summary, tag, tagKind, children }) => {
  const hasBody = Boolean(children);
  return (
    <section className="ov2-st is-open is-static">
      <div className="ov2-st-head">
        <span className="ov2-st-top">
          <span className="eyebrow ov2-st-label">{label}</span>
          {tag && <span className={`ov2-st-tag mono ${tagKind === 'preview' ? 'is-preview' : ''}`}>{tag}</span>}
        </span>
        <span className="ov2-st-summary">{summary}</span>
      </div>
      {hasBody && <div className="ov2-st-body">{children}</div>}
    </section>
  );
};

// The four-stage read, compact: one line each, math on expand. Shared by the
// Overview's selected panel and the Explorer's active-measure card, so a measure
// reads the same way wherever it is opened. `peers` are the measures it is ranked
// against (same status group); `crsps` are the CRSP rows behind its driver line.
export const MeasureIntel = ({ measure, crsps = [], token, peers, selectedMonth, onAssign }) => {
  const rate = num(measure.rate);
  const numerator = num(measure.numerator);
  const denominator = num(measure.denominator);
  const nonCompliant = Math.max(0, denominator - numerator);

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

  return (
    <div className="ov2-intel">
      <Stage label="Where to focus" summary={read.synthesis}>
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

      {/* The "Priority · where to focus" stage is retired: the read above now
          carries that name, and a second ranked card said the same thing twice.
          Restore by re-adding rankByPriority/priorityFactors here if the score
          breakdown is wanted back.
      <Stage label="Priority · where to focus" summary={prioSummary} tag={`Score ${mine.score}`}>
        <div className="ov2-prio">
          <span className="ov2-prio-bar"><span className="ov2-prio-fill" style={{ width: `${Math.max(4, mine.score)}%` }} /></span>
          <span className="ov2-prio-score mono num">{mine.score}</span>
        </div>
        <Signals items={priorityFactors(mine)} className="ov2-prio-factors" />
      </Stage>
      */}

      {onAssign && <AssignmentStatus measureId={measure.measure_id} onAssign={onAssign} className="ov2-intel-assign" />}
    </div>
  );
};

// The provider counterpart to MeasureIntel: the same three-stage read, but rolled
// up across everything a provider supports (Standing / Where to focus / Next move).
// Takes a pre-computed `intel` object (see providerIntel in v2utils) so both the
// Provider Analysis page and the Explorer's active-provider card render it the same.
// `compact` (the Explorer's inline provider card) keeps this to the provider's
// own standing — where it sits across its portfolio — and drops the measure-
// specific "work X first" / recommended-action drill, which belongs to the
// measure, not the provider. It also leaves Standing collapsed so the card stays
// short and the rest of the provider list below it stays visible. The full
// Provider Analysis page (non-compact) still shows the complete read.
export const ProviderIntel = ({ intel, compact = false, onAssign, hideAssign = false }) => {
  if (!intel || !intel.read) return null;
  const { read, top } = intel;
  return (
    <div className="ov2-intel pva-intel">
      <Stage label="Standing" summary={read.synthesis}>
        <Signals items={read.signals} />
        <p className="ov2-read-why mono">{read.confidence.why}</p>
      </Stage>

      {/* Retired alongside the measure-level priority card — see MeasureIntel.
      {!compact && top && (
        <Stage label="Where to focus"
          summary={`Work ${shortId(top.measure.measure_id)} first — ${top.open.toLocaleString()} members open · ${top.gap} pts under goal.`}
          tag={`Score ${top.score}`}>
          <div className="ov2-prio">
            <span className="ov2-prio-bar"><span className="ov2-prio-fill" style={{ width: `${Math.max(4, top.score)}%` }} /></span>
            <span className="ov2-prio-score mono num">{top.score}</span>
          </div>
          <Signals items={priorityFactors(top)} className="ov2-prio-factors" />
        </Stage>
      )}
      */}

      {!compact && top && onAssign && !hideAssign && (
        <AssignmentStatus measureId={top.measure.measure_id}
          onAssign={() => onAssign(undefined, top.measure)} className="ov2-intel-assign" />
      )}
    </div>
  );
};

// One "Where to focus" list: lag rows with a red rate pill. Rows carrying a
// measureId select that measure in the board beside it.
const FocusCard = ({ loading, rows, onPick }) => (
  <div className="ov2-list">
    {loading ? <SkeletonText lines={5} /> : rows.length === 0 ? (
      <EmptyState icon="—" hint="Nothing to focus on here." />
    ) : rows.map((r, i) => (
      <button key={r.key} className={`ov2-list-row ${r.measureId ? '' : 'ov2-list-static'}`}
        style={{ animationDelay: `${i * 45}ms` }}
        onClick={() => onPick(r.measureId)}>
        <span className="ov2-list-label">
          {r.meta && <span className="ov2-list-meta mono">{r.meta}</span>}
          {r.label}
        </span>
        <span className="ov2-list-rates">
          <span className="ov2-list-rate num">{r.rate}%</span>
        </span>
      </button>
    ))}
  </div>
);

// The three focus lists, one at a time. They used to run as a three-up band
// along the page bottom, a full scroll away from the board they act on; in the
// panel they sit beside it, and picking a row selects the measure in place.
// Paging is explicit — arrows plus dots, nothing auto-advances — because these
// are worklists to read, not a slideshow.
const FocusCarousel = ({ cards, loading, onPick }) => {
  const [i, setI] = useState(0);
  const n = cards.length;
  if (!n) return null;
  const card = cards[Math.min(i, n - 1)];
  const step = (d) => setI((c) => (c + d + n) % n);
  return (
    <section className="ov2-focus" aria-label="Where to focus" aria-live="polite">
      {/* Pager rides the header, not the card's foot: it names which of the three
          lists you're on, so it belongs with the title that names it — and the
          list below can then run to the bottom edge without a control under it. */}
      <div className="ov2-focus-head">
        <div className="ov2-focus-heading">
          {/* Badge rides the eyebrow, not the right edge — the pager needs that
              corner, and "4 active" describes the list, so it belongs with the
              label rather than with the control that switches lists. */}
          <div className="ov2-focus-eyebrowrow">
            <div className="eyebrow">Where to focus</div>
            {card.badge && <span className="ov2-focus-badge">{card.badge}</span>}
          </div>
          <h3 className="ov2-focus-title">{card.title}</h3>
        </div>
        {n > 1 && (
          <div className="ov2-focus-nav">
            <button type="button" className="btn btn-secondary btn-icon btn-sm"
              aria-label="Previous list" onClick={() => step(-1)}>‹</button>
            <div className="ov2-focus-dots" role="tablist" aria-label="Focus list">
              {cards.map((c, k) => (
                <button key={c.key} role="tab" aria-selected={k === i} aria-label={c.title}
                  className={`ov2-focus-dot ${k === i ? 'is-active' : ''}`} onClick={() => setI(k)} />
              ))}
            </div>
            <button type="button" className="btn btn-secondary btn-icon btn-sm"
              aria-label="Next list" onClick={() => step(1)}>›</button>
          </div>
        )}
      </div>

      <FocusCard loading={loading} rows={card.rows} onPick={onPick} />
    </section>
  );
};

const DefaultPanel = ({ loading, panel, cards, onPick }) => (
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
        <Stage label="Board read" summary={panel.read.synthesis}>
          <Signals items={panel.read.signals} />
          <p className="ov2-read-why mono">{panel.read.confidence.why}</p>
        </Stage>
      </div>
    )}

    <FocusCarousel cards={cards} loading={loading} onPick={onPick} />
  </div>
);

const SelectedPanel = ({ measure, crsps, token, peers, selectedMonth, pos, total, onStep, onInvestigate, onAssign }) => {
  const rate = num(measure.rate), goal = num(measure.goal_50th);
  const gap = Math.round((rate - goal) * 10) / 10;
  const tone = STATUS_TONE[measure.kpi_status] || 'below';
  // Arrows walk the panel's ranked order, so the position has to be stated —
  // "3 / 15" is what makes ‹ › mean "one place along the ranking" instead of
  // "some other measure". Wraps at both ends, so neither arrow is ever dead.
  const canStep = onStep && total > 1 && pos != null;

  return (
    <div className="ov2-panel-inner ov2-panel-inner-cta">
      <div className="ov2-panel-top">
        <span className={`ov2-chip ov2-chip-${tone} mono`}>{shortId(measure.measure_id)}</span>
        {canStep && (
          <div className="ov2-step">
            <button type="button" className="btn btn-secondary btn-icon btn-sm"
              aria-label="Previous measure" title="Previous measure" onClick={() => onStep(-1)}>‹</button>
            <span className="ov2-step-pos num">{pos} / {total}</span>
            <button type="button" className="btn btn-secondary btn-icon btn-sm"
              aria-label="Next measure" title="Next measure" onClick={() => onStep(1)}>›</button>
          </div>
        )}
        {/* Clear lives on the bubble field now (top-right), beside the selection
            it undoes — see .ov2-clear-field. */}
      </div>
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

      {/* Pinned to the panel's bottom edge: the panel scrolls, the actions don't.
          Assign (the play) and Investigate (the drill) share one row, half each. */}
      <div className="ov2-panel-cta ov2-panel-cta-split">
        <AssignmentStatus measureId={measure.measure_id} onAssign={onAssign} className="ov2-intel-assign ov2-cta-assign" />
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
