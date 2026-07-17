import { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import './OverviewExplore.css';
import MonthFilter from '../MonthFilter';
import { Skeleton, SkeletonText, EmptyState, ErrorState } from '../ui/Feedback';
import { useToast } from '../ui/Toast';
import useAsync from '../../hooks/useAsync';
import AssignPanel, { UNASSIGNED } from './AssignPanel';
import {
  fetchAllMeasuresGrid,
  fetchDashboardKPI,
  fetchCRSPsNeedingAttention,
  fetchEquityAlerts,
  fetchMiniChartData,
  fetchCRSPLevelData,
  fetchMeasureStratification,
  fetchMeasureStratificationRace,
  fetchMeasureStratificationEthnicity,
} from '../../services/workflowService';
import {
  STATUS_TONE, num, pts, shortId, acronym, behaviorRead, portfolioRead,
  neededToGoal, openGaps,
  rankByPriority, priorityFactors, recommendAction, learningState, recordApplied,
  categoryOf, categoriesOf,
  SAMPLE_MEASURES, sampleKpis, sampleCrsps, sampleEquityAlerts, sampleTrend,
  sampleProviders, sampleEquity,
} from './v2utils';
import CategoryTabs from './CategoryTabs';

// The bubble field encodes two independent variables, so a measure's urgency and
// its workload can be read at once:
//   • SIZE (area)  = members with an open gap — "how much work sits here".
//     Always positive, and normalized against every measure (not just the
//     filtered ones) so switching tabs never rescales the field.
//   • SHADE        = how far the rate sits from THAT measure's own goal. Goals
//     differ per measure (a 52% target and a 70% target are not comparable), so
//     a raw rate can't carry severity — attainment (rate ÷ goal) can.
// There are no status tabs. The board shows every measure at once.
//
// It had three (below / at / above) and they were a mistake twice over. The two
// non-below bands couldn't fill a bubble field — At Goal spans three points, so
// shade had no range, and past the target open-gap volume stops tracking urgency
// and just tracks population, so the tab drew four identical circles. And any
// band you aren't looking at is a band you can't see: the tabs made 11 of 26
// measures reachable only by remembering to click.
//
// The matrix dissolves the problem rather than solving it. `statusFor` isn't
// sorting measures into three kinds of thing — it is two thresholds on one
// number (rate − goal): under −1 is Below, −1 to +2 is At, over +2 is Above.
// Three regions of an axis. So the axis shows them, the goal is the origin, and
// the bands are where a dot sits rather than which page you're on.
//
// The band a measure is in still colours its dot (STATUS_TONE), and the panel
// still reads the below-goal set, because that's where the work is.
const BOARD_BAND = 'Below Goal';

// 'Providers' and 'Equity' are hidden for now; their lens logic below is intact,
// so re-adding them here is all that's needed to bring the tabs back.
const LENSES = ['Measures'];

// The summary panel's chrome. Only the field statuses need an entry — the table
// carries its own heading, and the panel doesn't render beside it.
const STATUS_PANELS = {
  'Below Goal': { eyebrow: 'BELOW BENCHMARK', tag: 'Need attention', tone: 'below', listLabel: 'LOWEST PERFORMING MEASURES', dir: 'asc' },
};

// The table's framing. The board's read supplies the heading sentence, so this
// only has to say what the sort is FOR — a ranked list that doesn't explain its
// rank is just an order you have to take on faith.
const TABLE_COPY = {
  eyebrow: 'ALL MEASURES',
  hint: 'Sorted worst-first by distance from each measure’s own goal. Every measure, every band — the same set the board plots.',
};
const TABLE_SORT = { key: 'margin', dir: 'asc' };

// Table columns. `num` right-aligns and uses tabular figures so a column can be
// run down with the eye. Progress carries no sort of its own — it's a picture of
// rate against goal, and both already have their own column.
const TABLE_COLS = [
  { key: 'name', label: 'Measure' },
  { key: 'progress', label: 'Progress', sortable: false },
  { key: 'rate', label: 'Rate', num: true },
  { key: 'goal', label: 'Goal', num: true },
  { key: 'margin', label: 'Margin', num: true },
  { key: 'open', label: 'Open gaps', num: true },
];

const TABLE_CMP = {
  name: (a, b) => a.name.localeCompare(b.name),
  rate: (a, b) => a.rate - b.rate,
  goal: (a, b) => a.goal - b.goal,
  margin: (a, b) => a.margin - b.margin,
  open: (a, b) => a.open - b.open,
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

// Ends of the shade ramp. `below` is the board; `above` is kept for the
// Providers/Equity lenses, which reuse the legend. No `at` entry — that band is
// too narrow to drive a ramp, which is most of why it isn't drawn as a field.
const SHADE_ENDS = {
  below: ['at goal', 'furthest below'],
  above: ['at goal', 'furthest above'],
};

const fmtCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(n)));

// Attainment — a rate against its OWN goal, which is the only comparable form of
// severity here. 38% against a 52% target is a worse miss than 53% against a
// 64% one; ranking on raw rate puts them the other way round. Every ranked list
// on this board sorts by it, ascending = worst first.
const attainment = (m) => (num(m.goal_50th) > 0 ? num(m.rate) / num(m.goal_50th) : num(m.rate) / 100);
const byAttainment = (a, b) => attainment(a) - attainment(b);

// Rank a band worst-first and return its measure ids, de-duplicated.
const rankedIds = (measures) => {
  const seen = new Set();
  return [...measures].sort(byAttainment)
    .filter((m) => m.measure_id && !seen.has(m.measure_id) && seen.add(m.measure_id))
    .map((m) => m.measure_id);
};

// The field's key. Swatches are drawn from the same tone tokens as the bubbles,
// so the legend and the chart are visibly the same scale rather than a caption
// that asserts a relationship the reader has to take on faith.
// The field can only draw so many bubbles before the smallest stops being
// readable (see bubbleBudget). When it drops any, the caption has to say so —
// and say WHAT it kept, since "20 of 52" alone reads as arbitrary when the rule
// is actually "the 20 carrying the most open work". `onShowAll` is the way out
// to the table, which has no such limit; without it the dropped measures would
// simply be unreachable.
const FieldCount = ({ shown, total, onShowAll }) => {
  if (shown >= total) return <span className="ov2-legend-count">Showing all {shown}</span>;
  return (
    <span className="ov2-legend-count">
      Showing the {shown} largest of {total}
      {onShowAll && (
        <button type="button" className="ov2-legend-all" onClick={onShowAll}>
          See all {total} as a table →
        </button>
      )}
    </span>
  );
};

const FieldLegend = ({ shown, total, sizeBy, tone, min, max, lens, onShowAll }) => {
  const range = Number.isFinite(min) && Number.isFinite(max) && min !== max
    ? (sizeBy === 'gap' ? `${fmtCount(min)}–${fmtCount(max)} members` : `${Math.round(min)}–${Math.round(max)} pts`)
    : null;
  const ends = SHADE_ENDS[tone];
  const dots = <span className={`ov2-legend-dots ov2-legend-dots-${tone}`} aria-hidden="true"><i /><i /><i /></span>;
  const ramp = <span className={`ov2-legend-ramp ov2-legend-ramp-${tone}`} aria-hidden="true" />;

  if (lens !== 'Measures') {
    return (
      <div className="ov2-legend">
        <FieldCount shown={shown} total={total} />
        <span className="ov2-legend-item">{dots}{ramp}<span>size &amp; shade = {SIZE_BY_TEXT.lag}</span></span>
      </div>
    );
  }
  return (
    <div className="ov2-legend">
      <FieldCount shown={shown} total={total} onShowAll={onShowAll} />
      <span className="ov2-legend-item">
        {dots}
        <span>size = {SIZE_BY_TEXT[sizeBy] || 'urgency'}{range && <em className="ov2-legend-range num"> · {range}</em>}</span>
      </span>
      <span className="ov2-legend-item">
        {ramp}
        <span>
          shade = {SHADE_BY_TEXT.measures}
          {ends && <em className="ov2-legend-range"> · {ends[0]} → {ends[1]}</em>}
        </span>
      </span>
    </div>
  );
};

// The browse surface for the bands that don't get a field. It spans the whole
// card — the panel doesn't render beside it — because a table is a document, and
// a document reads as finished at four rows where a chart of four identical
// circles never does.
//
// Every row opens the measure in the Explorer directly. There's no inspector
// column to select into here, and the Explorer shows the same intelligence read
// the panel would have.
const MeasureTable = ({ rows, total, copy, read, sort, onSort, onOpen }) => (
  <div className="ov2-table-wrap">
    <div className="ov2-table-head">
      <div className="ov2-table-eyebrowrow">
        <span className="eyebrow">{copy.eyebrow}</span>
        {read && <span className="ov2-table-conf mono">Confidence · {read.confidence.level}</span>}
      </div>
      {/* The band's read IS the heading. A title saying "on the edge of goal"
          above a sentence saying "4 of 26 sit on the edge of goal" is the same
          line twice, and the sentence is the one carrying the number. */}
      <h3 className="ov2-table-title">{read ? read.synthesis : copy.eyebrow}</h3>
      {read && (
        <dl className="ov2-table-signals">
          {read.signals.map((s) => (
            <div key={s.k} className="ov2-table-signal">
              <dt>{s.k}</dt>
              <dd>{s.v}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="ov2-table-hint">
        {copy.hint}
        <span className="ov2-table-count mono">
          {rows.length} of {total} measures{read ? ` · ${read.confidence.why}` : ''}
        </span>
      </p>
    </div>
    <table className="ov2-table">
      <thead>
        <tr>
          {TABLE_COLS.map((c) => {
            const active = sort.key === c.key;
            if (c.sortable === false) {
              return <th key={c.key} className="ov2-table-th-plain">{c.label}</th>;
            }
            return (
              <th key={c.key} className={c.num ? 'is-num' : ''}
                aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" className={`ov2-table-sort ${active ? 'is-active' : ''}`}
                  onClick={() => onSort(c.key)}>
                  {c.label}
                  <span className="ov2-table-caret" aria-hidden="true">
                    {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.key} className="ov2-table-row" style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}
            tabIndex={0} role="button"
            onClick={() => onOpen(r.measure)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(r.measure); } }}>
            <td>
              <span className="ov2-table-id mono">{r.id}</span>
              <span className="ov2-table-name">{r.name}</span>
            </td>
            {/* Fill = the rate, tick = THIS measure's goal. The same picture in
                every band: below goal the tick sits right of the fill, on the
                edge they're on top of each other, above goal the fill overshoots.
                One encoding, no re-teaching per tab. */}
            <td>
              <span className="ov2-goalbar is-inline" title={`${r.rate}% against a ${r.goal}% goal`}>
                <span className={`ov2-goalbar-fill ov2-goalbar-${r.tone}`}
                  style={{ width: `${Math.min(100, Math.max(0, r.rate))}%` }} />
                {r.goal > 0 && <span className="ov2-goalbar-marker" style={{ left: `${Math.min(100, r.goal)}%` }} />}
              </span>
            </td>
            <td className="is-num"><span className={`ov2-list-rate ov2-list-rate-${r.tone} num`}>{r.rate}%</span></td>
            <td className="is-num num ov2-table-muted">{r.goal}%</td>
            {/* Deliberately not green for a positive margin: on the edge a +1 is
                the same coin-flip as a −1, and painting it as a win argues
                against the band. Only a measure already under its goal is red. */}
            <td className={`is-num num ov2-table-margin ${r.margin < 0 ? 'is-under' : ''}`}>{r.marginLabel}</td>
            <td className="is-num num ov2-table-muted">{fmtCount(r.open)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Opportunity matrix ───────────────────────────────────────
// The board's field. One dot per measure, plotted on two axes it can actually
// be read from, rather than encoded as the area and hue of a disc.
//
//   X — GAP TO GOAL, near on the left. Not the rate: rates aren't comparable
//       across measures whose goals differ, and "how far from MY line" is.
//   Y — MEMBERS WITH AN OPEN GAP, most at the top. The size of the prize —
//       the pool you have to work with.
//
// The quadrant the whole thing exists for is top-left: a big pool sitting a
// short distance from its line, where converting a few hundred members flips
// the measure. The bubble field could not say that — it drew volume as area and
// distance as hue, so "big and close" and "small and far" were two shades of the
// same-ish circle, and the eye compares neither well.
//
// Note it disagrees with priorityScore, which multiplies gap by volume and so
// ranks the top-RIGHT highest. Both are defensible; they optimise different
// things. See the caption.
// Quadrants only exist to the RIGHT of the goal line — they're a way of sorting
// work, and there is no work to the left. A measure already past its target
// isn't "near goal", it's done; putting it in a quadrant called "push now"
// because it sits far left would be the axis lying about its own origin.
const QUADRANTS = [
  { key: 'push', label: 'Push now', hint: 'Big population, just short of goal — a few conversions flip the measure.' },
  { key: 'long', label: 'Long haul', hint: 'Big population, far behind — needs a sustained programme.' },
  { key: 'cheap', label: 'Cheap but small', hint: 'Close to goal, small population — quick, moves little.' },
  { key: 'low', label: 'Low return', hint: 'Far behind, small population — least return on the effort.' },
];
const quadOf = (r, xMid, yMid) => {
  if (r.gap <= 0) return 'clear'; // at or above its goal — no quadrant, no work
  return r.pop >= yMid ? (r.gap < xMid ? 'push' : 'long') : (r.gap < xMid ? 'cheap' : 'low');
};

// The at-goal band, in gap terms. statusFor works on margin (rate − goal) and
// calls −1..+2 "At Goal"; gap is the negation, so the band is −2 < gap ≤ 1.
// Drawn as the strip of axis it is, rather than asserted in a legend.
const EDGE_LO = -2, EDGE_HI = 1;

const DOT_R = 7;      // dot radius
const LBL_H = 13;     // label line box, for collision
const LBL_GAP = 9;    // dot → label

const OpportunityMatrix = ({ rows, size, xMin, xMax, yMin, yMax, xMid, yMid, selectedId, onSelect }) => {
  const padL = 54, padR = 22, padT = 26, padB = 34;
  const W = Math.max(size.w, 320), H = Math.max(size.h, 260);
  const iw = Math.max(40, W - padL - padR), ih = Math.max(40, H - padT - padB);
  const px = (gap) => padL + (xMax > xMin ? (gap - xMin) / (xMax - xMin) : 0.5) * iw;
  const py = (v) => padT + (1 - (yMax > yMin ? (v - yMin) / (yMax - yMin) : 0.5)) * ih;

  // Label placement. Every dot is drawn; labels are greedy — highest-opportunity
  // first (top-left is the read this chart exists for), and any label that would
  // collide with one already placed is dropped rather than allowed to overlap.
  // The dot stays either way, and hover/click still names it.
  const labelled = useMemo(() => {
    const boxes = [];
    const order = [...rows].sort((a, b) => (b.pop - a.pop) || (a.gap - b.gap));
    const keep = new Set();
    for (const r of order) {
      const x = px(r.gap) + DOT_R + LBL_GAP, y = py(r.pop);
      const w = r.id.length * 6.2 + 4;
      const box = { x1: x, y1: y - LBL_H / 2, x2: x + w, y2: y + LBL_H / 2 };
      if (box.x2 > W - 4) continue;
      const hit = boxes.some((b) => !(box.x2 < b.x1 || box.x1 > b.x2 || box.y2 < b.y1 || box.y1 > b.y2));
      if (hit) continue;
      boxes.push(box); keep.add(r.key);
    }
    return keep;
  }, [rows, W, H, xMax, yMin, yMax]);

  const x0 = px(0), xm = px(xMid), ym = py(yMid);
  const eL = px(EDGE_LO), eR = px(EDGE_HI);
  return (
    <div className="ov2-mx">
      {/* The at-goal band, as the strip of axis it actually is. This is the whole
          argument against it having been a tab: it's three points wide. */}
      <div className="ov2-mx-edge" style={{ left: eL, top: padT, width: Math.max(2, eR - eL), height: ih }} />
      {/* Push-now is the only tinted quadrant — it's the one the chart argues
          for. It starts at the goal line, not at the left edge: everything left
          of zero is already past its target. */}
      <div className="ov2-mx-quad is-push" style={{ left: x0, top: padT, width: Math.max(0, xm - x0), height: ym - padT }} />
      {/* The goal line. Heavier than the median splits — it's the only line here
          that means something outside this particular board. */}
      <div className="ov2-mx-goal" style={{ left: x0, top: padT, height: ih }} />
      <div className="ov2-mx-split is-v" style={{ left: xm, top: padT, height: ih }} />
      <div className="ov2-mx-split is-h" style={{ left: x0, top: ym, width: Math.max(0, padL + iw - x0) }} />
      <span className="ov2-mx-goal-lbl" style={{ left: x0, top: padT - 14 }}>goal</span>

      {QUADRANTS.map((q) => {
        // Anchored to the goal line, not the plot edge, so a label never floats
        // over a region it doesn't describe.
        const pos = {
          push: { left: x0 + 8, top: padT + 6 },
          long: { right: padR + 8, top: padT + 6 },
          cheap: { left: x0 + 8, bottom: padB + 6 },
          low: { right: padR + 8, bottom: padB + 6 },
        }[q.key];
        return (
          <div key={q.key} className={`ov2-mx-qlbl is-${q.key}`} style={pos} title={q.hint}>
            {q.label}
          </div>
        );
      })}
      {x0 - padL > 60 && (
        <div className="ov2-mx-qlbl is-clear" style={{ left: padL + 6, top: padT + 6 }}
          title="At or above goal — nothing to work against the 50th-percentile target.">
          At or above goal
        </div>
      )}

      {rows.map((r) => {
        const x = px(r.gap), y = py(r.pop);
        const isSel = r.key === selectedId;
        return (
          <button key={r.key} type="button"
            className={`ov2-mx-dot ov2-mx-${r.tone} ${isSel ? 'is-sel' : ''} ${selectedId && !isSel ? 'is-dim' : ''}`}
            style={{ left: x, top: y, '--i': r.intensity }}
            onClick={(e) => { e.stopPropagation(); onSelect(r.key); }}
            title={`${r.name} — ${r.rate}% vs ${r.goal}% goal · ${r.standing} · ${fmtCount(r.pop)} eligible${r.need > 0 ? ` · ~${fmtCount(r.need)} must convert to reach goal` : ''}`}
            aria-label={`${r.name}, ${r.standing}, ${fmtCount(r.pop)} eligible members`}>
            <span className="ov2-mx-hit" aria-hidden="true" />
          </button>
        );
      })}
      {rows.map((r) => (
        (labelled.has(r.key) || r.key === selectedId) && (
          <span key={`l-${r.key}`} aria-hidden="true"
            className={`ov2-mx-lbl mono ${r.key === selectedId ? 'is-sel' : ''} ${selectedId && r.key !== selectedId ? 'is-dim' : ''}`}
            style={{ left: px(r.gap) + DOT_R + LBL_GAP, top: py(r.pop) }}>{r.id}</span>
        )
      ))}

      <span className="ov2-mx-ax is-y" style={{ top: padT, height: ih }}>Eligible members</span>
      {/* Both ends labelled — the axis is clipped to the data, and a clipped
          axis that hides its floor is the oldest chart lie there is. */}
      <span className="ov2-mx-tick is-y is-hi" style={{ top: padT }}>{fmtCount(yMax)}</span>
      <span className="ov2-mx-tick is-y is-lo" style={{ top: padT + ih }}>{fmtCount(yMin)}</span>
      <span className="ov2-mx-ax is-x" style={{ left: padL, width: iw, top: padT + ih + 16 }}>
        <em>{xMin < -1 ? `${pts(Math.round(-xMin))} ahead` : 'Ahead'}</em>
        <i>Distance from goal</i>
        <em>{pts(Math.round(xMax))} behind</em>
      </span>
    </div>
  );
};

// The matrix's caption. Says what a dot is, what the split is, and — the part
// that matters — names the count in the quadrant the chart exists to surface,
// so the reader gets the headline without having to interpret the picture first.
const MatrixLegend = ({ n, push, xMid, yMid }) => (
  <div className="ov2-legend ov2-mx-legend">
    <span className="ov2-legend-count">
      {n} measures · <b className="ov2-mx-push-n">{push}</b> in <b>push now</b>
    </span>
    <span className="ov2-legend-item">
      <span className="ov2-mx-key" aria-hidden="true" />
      <span>
        each dot is a measure
        <em className="ov2-legend-range"> · deeper = further from its own goal</em>
      </span>
    </span>
    {/* Say the split out loud. A quadrant chart whose lines are medians is making
        a relative claim, and the caption is the only place that can admit it. */}
    <span className="ov2-legend-item">
      <span>
        quadrants split at this board’s medians
        <em className="ov2-legend-range num"> · {pts(Math.round(xMid * 10) / 10)} · {fmtCount(yMid)} eligible</em>
      </span>
    </span>
  </div>
);

// Absolute ceiling, and a perf backstop rather than a design choice: packCircles
// scans a grid per bubble against every bubble already placed, so it grows ~n²·
// cells. The derived budget below lands well under this on any real field; this
// only stops a pathological set from freezing the board.
const MAX_BUBBLES = 48;
const MIN_BUBBLES = 4;
const PACK_DENSITY = 0.46; // total bubble area as a fraction of the field area

// The smallest bubble the field may draw. Under ~48px the id stops fitting and
// a measure becomes an unlabelled dot — present, but not readable and not
// confidently clickable. Measured, not guessed: with the cap lifted and 96
// measures loaded, an uncapped field put 40 of 52 below this line on a 1280px
// laptop (24px at the low end). The field can hold them; you can't read them.
const MIN_BUBBLE_D = 48;

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

// How many bubbles the field can draw with the smallest of them still legible.
//
// Derived from the actual weights, not a round number, because a count can't see
// what fills the field: fitScale shrinks the whole set to PACK_DENSITY, so a few
// large bubbles eat the area budget and drag every small one under the legible
// floor with them. Twenty measures of similar size fit where twenty lopsided
// ones don't.
//
// Weights arrive sorted descending, so each step adds the next-smallest bubble
// and asks whether it — the smallest so far — still clears MIN_BUBBLE_D once the
// set is scaled to fit. The first one that doesn't ends the budget.
function bubbleBudget(W, H, weights) {
  if (!weights || !weights.length || W <= 0 || H <= 0) return 0;
  const { rMin, rMax } = radiusScale(W, H);
  const floorR = MIN_BUBBLE_D / 2;
  const cap = PACK_DENSITY * W * H;
  let sum = 0, n = 0;
  for (const w of weights) {
    if (n >= MAX_BUBBLES) break;
    const r = radiusFor(w, rMin, rMax);
    const next = sum + Math.PI * r * r;
    const scale = next > cap ? Math.sqrt(cap / next) : 1;
    if (r * scale < floorR && n >= MIN_BUBBLES) break;
    sum = next; n++;
  }
  return n;
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
  const setCategory = onCategory || (() => {});
  const [selectedId, setSelectedId] = useState(null);
  const [assignScope, setAssignScope] = useState(null); // {measure, level, intervention}
  const toast = useToast();

  // Providers/Equity keep the field — they carry their own size metric and every
  // row is lagging, so both channels stay live. On Measures only Below Goal
  // earns it; the other two bands render a table instead.
  //
  // `view` only means anything on a field band — it's how Below Goal reaches the
  // table. The field can't draw more than ~20 measures legibly (bubbleBudget),
  // and at 96 measures that leaves ~30 below-goal measures with open work that
  // the board simply cannot show. The table has no such limit, so it's the way
  // to them. Resets to the board when the band changes: the table is where you
  // go when the field runs out, not a preference to carry around.
  const [view, setView] = useState('board');
  useEffect(() => { setView('board'); }, [lens]);
  const statusFilter = BOARD_BAND; // what the PANEL reads — the board shows all bands
  const showsField = lens !== 'Measures' || view === 'board';
  const canToggleView = lens === 'Measures';

  // Table sort. Null = the band's default (TABLE_SORT); clicking a header takes
  // over. Reset when the band changes, since the default is per-band.
  const [sort, setSort] = useState(null);
  const tableSort = sort || TABLE_SORT;
  const onSort = (key) => setSort((s) => {
    const cur = s || TABLE_SORT;
    // Re-clicking the active column flips it; a new column starts ascending,
    // except the text one, where A→Z is the ascending everyone means.
    return cur.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' };
  });

  const { data, loading, error, refetch } = useAsync(async () => {
    try {
      const [grid, kpis, crsps, equity] = await Promise.all([
        fetchAllMeasuresGrid(token),
        fetchDashboardKPI(token),
        fetchCRSPsNeedingAttention(token),
        fetchEquityAlerts(token),
      ]);
      if (!grid || grid.length === 0) throw new Error('empty');
      return { grid, kpis, crsps, equity, sample: false };
    } catch (e) {
      return { grid: SAMPLE_MEASURES, kpis: sampleKpis(), crsps: sampleCrsps(), equity: sampleEquityAlerts(), sample: true };
    }
  }, [token, selectedMonth], { enabled: !!token });

  const grid = data?.grid || [];

  // Category ("sub-category") tabs come from whatever domains the data carries.
  const categories = useMemo(() => categoriesOf(grid), [grid]);
  // The active category scopes every measure derivation below; null = All.
  const catGrid = useMemo(
    () => (category ? grid.filter((m) => categoryOf(m) === category) : grid),
    [grid, category]
  );

  // Category is a board-wide filter, so it has to reach the panel's lists too —
  // a board narrowed to EOC beside a "lowest performing" card still listing ECDS
  // measures is the panel contradicting the chart it sits next to.
  //
  // The lists arrive from their own endpoints carrying only a measure_id, so the
  // grid is the lookup: it has the API's own category. Deriving it from
  // CATEGORY_MAP instead would file anything unmapped under EOC and quietly show
  // it beneath the wrong tab.
  const catOf = useMemo(() => {
    const m = new Map();
    grid.forEach((r) => { if (r.measure_id) m.set(r.measure_id, categoryOf(r)); });
    return m;
  }, [grid]);
  const scopeToCategory = useMemo(() => {
    if (!category) return (rows) => rows;
    return (rows) => rows.filter((r) => catOf.get(r.measure_id) === category);
  }, [category, catOf]);

  const crspList = useMemo(() => scopeToCategory(data?.crsps || []), [data, scopeToCategory]);
  const equityList = useMemo(() => scopeToCategory(data?.equity || []), [data, scopeToCategory]);


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
    return []; // Measures draws the opportunity matrix, not bubbles
  }, [lens, crspList, equityList]);

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
  }, [lens, loading, error, showsField]);


  // Radii resolve against the measured field, so the same data packs sensibly
  // into a 1200px desktop field and a 320px phone one.
  const packed = useMemo(() => {
    if (!showsField) return []; // table bands never pack
    const { w, h } = fieldSize;
    const { rMin, rMax } = radiusScale(w, h);
    const budget = bubbleBudget(w, h, bubbleData.map((b) => b.weight));
    const groups = [bubbleData.map((b) => b.weight).sort((a, b) => b - a).slice(0, budget)];
    const scale = fitScale(groups, w, h, rMin, rMax);
    const items = bubbleData
      .slice(0, budget)
      .map((b) => ({ ...b, radius: radiusFor(b.weight, rMin, rMax) }));
    return packCircles(items, w, h, rMin, scale);
  }, [bubbleData, fieldSize, showsField]);

  useEffect(() => { setSelectedId(null); }, [lens, category]);

  // The legend labels the scale of what is actually drawn, not of the whole set.
  const legend = useMemo(() => {
    if (!packed.length) return null;
    const vals = packed.map((b) => b.value).filter((v) => Number.isFinite(v));
    return {
      sizeBy: packed[0].sizeBy,
      tone: 'below', // Providers/Equity rows are all lagging by construction
      min: vals.length ? Math.min(...vals) : NaN,
      max: vals.length ? Math.max(...vals) : NaN,
    };
  }, [packed]);

  const selected = useMemo(() => grid.find((m) => m.measure_id === selectedId) || null, [grid, selectedId]);

  // A measure is ranked against its OWN band. MeasureIntel falls back to
  // `ranked[0]` when it can't find the measure among its peers, so handing it a
  // set the measure isn't in would quietly print another measure's rank and
  // priority score as this one's — reachable whenever a focus card selects a
  // measure from outside the active band.
  const selectedPeers = useMemo(
    () => (selected ? catGrid.filter((m) => m.kpi_status === selected.kpi_status) : []),
    [catGrid, selected]
  );

  // The board's own set, scoped to the active category.
  const statusMeasures = useMemo(() => catGrid.filter((m) => m.kpi_status === statusFilter), [catGrid, statusFilter]);
  const matchCount = statusMeasures.length;

  // The matrix's points.
  //
  //   X — gap to that measure's OWN goal. Rates aren't comparable across
  //       measures with different targets; distance from your own line is.
  //   Y — eligible members. The size of the prize: fix this measure and this
  //       many people are covered by it.
  //
  // Y is the population, not the open-gap pool, and that's a deliberate call.
  // A quadrant chart needs its two axes independent or every dot lands on a
  // diagonal and the quadrants are theatre. Open gaps are `denominator × (1 −
  // rate/100)` — baked out of the rate, which is what X is made of — so plotting
  // them against the gap plots rate against itself. Population size genuinely
  // doesn't know how far off its measure is.
  //
  // `need` and `open` aren't plotted; they're the effort numbers, and they ride
  // the tooltip and the drill-down instead. A chart with four positional
  // variables has none.
  const matrix = useMemo(() => {
    const seen = new Set();
    const rows = catGrid
      .filter((m) => m.measure_id && !seen.has(m.measure_id) && seen.add(m.measure_id))
      .map((m) => {
        const rate = num(m.rate), goal = num(m.goal_50th);
        // SIGNED, not clamped at zero. The sign is the whole point: it puts the
        // goal at the origin and the three bands either side of it, which is
        // what lets one chart carry all 26 instead of three tabs carrying a
        // third each.
        const gap = Math.round((goal - rate) * 10) / 10;
        const mag = Math.abs(gap);
        return {
          key: m.measure_id, id: shortId(m.measure_id), name: m.display_name,
          rate: Math.round(rate), goal, gap,
          standing: gap > 0 ? `${pts(mag)} behind` : gap < 0 ? `${pts(mag)} ahead` : 'level with goal',
          tone: STATUS_TONE[m.kpi_status] || 'below',
          pop: num(m.denominator), open: openGaps(m), need: neededToGoal(m),
          intensity: severityFor(rate, goal), measure: m,
        };
      });
    if (!rows.length) return { rows: [], xMin: -1, xMax: 1, yMin: 0, yMax: 1, xMid: 0, yMid: 0 };
    const pops = rows.map((r) => r.pop);
    const gaps = rows.map((r) => r.gap);
    // X spans both sides of the goal and is NOT clipped — 0 has to stay on the
    // chart and stay meaningful, because it's the line every measure is judged
    // against. Padded so the extremes aren't welded to the edges.
    const xLo = Math.min(-1, Math.min(...gaps)), xHi = Math.max(1, Math.max(...gaps));
    const xPad = Math.max(1, (xHi - xLo) * 0.06);
    // Y doesn't anchor at 0: no measure has an eligible population near zero, so
    // anchoring there would spend most of the axis on empty space and squash the
    // board into a stripe. These are dots, not bars — position carries the
    // meaning and no length lies about a ratio — so clipping to where the data
    // lives is honest as long as both ends are labelled, which they are.
    const yLo = Math.min(...pops), yHi = Math.max(...pops);
    const yPad = Math.max(1, (yHi - yLo) * 0.12);
    const med = (xs) => {
      if (!xs.length) return 0;
      const s = [...xs].sort((a, b) => a - b), i = Math.floor(s.length / 2);
      return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
    };
    // The medians split WORK, so they're taken from the measures that have any —
    // the below-goal set. Taking them across all 26 would drag both splits left
    // and down by the 11 measures that are already done, and put half the
    // finished board in a quadrant called "push now".
    const work = rows.filter((r) => r.gap > 0);
    const xMid = med(work.map((r) => r.gap));
    const yMid = med(work.map((r) => r.pop));
    return {
      rows: rows.map((r) => ({ ...r, quad: quadOf(r, xMid, yMid) })),
      xMin: xLo - xPad, xMax: xHi + xPad,
      yMin: Math.max(0, yLo - yPad), yMax: yHi + yPad, xMid, yMid,
    };
  }, [catGrid]);

  const pushCount = matrix.rows.filter((r) => r.quad === 'push').length;
  const panelCfg = STATUS_PANELS[statusFilter] || STATUS_PANELS['Below Goal'];

  // "Critical" only applies to below-goal measures (≥20 pts under target).
  const criticalCount = useMemo(
    () => statusMeasures.filter((m) => num(m.goal_50th) - num(m.rate) >= 20).length,
    [statusMeasures]
  );

  // Ranked, de-duplicated list for the panel — worst-first.
  const panelList = useMemo(() => {
    const seen = new Set();
    return [...statusMeasures].sort(byAttainment)
      .filter((m) => {
        if (!m.measure_id || seen.has(m.measure_id)) return false;
        seen.add(m.measure_id);
        return true;
      });
  }, [statusMeasures]);

  // The table's rows: the whole band, de-duplicated, no cap. This is the browse
  // surface — truncating it silently would defeat the one thing it is for.
  //
  // Margin is a first-class column rather than something to infer from rate vs
  // goal: it's signed, and each measure's goal differs, so the eye can't do that
  // subtraction down a column.
  const tableRows = useMemo(() => {
    const seen = new Set();
    const rows = catGrid
      .filter((m) => m.measure_id)
      .filter((m) => !seen.has(m.measure_id) && seen.add(m.measure_id))
      .map((m) => {
        const rate = num(m.rate), goal = num(m.goal_50th);
        const margin = Math.round((rate - goal) * 10) / 10;
        const mag = Math.abs(margin);
        return {
          key: m.measure_id, id: shortId(m.measure_id), name: m.display_name,
          rate: Math.round(rate), goal, margin, open: Math.max(0, num(m.denominator) - num(m.numerator)),
          tone: STATUS_TONE[m.kpi_status] || 'below',
          marginLabel: goal > 0 ? `${margin > 0 ? '+' : margin < 0 ? '−' : ''}${pts(mag)}` : '—',
          measure: m,
        };
      });
    const cmp = TABLE_CMP[tableSort.key] || TABLE_CMP.margin;
    rows.sort((a, b) => (tableSort.dir === 'desc' ? -cmp(a, b) : cmp(a, b)));
    return rows;
  }, [catGrid, tableSort]);

  // The same read the board gets, above the table. portfolioRead already speaks
  // all three bands, so the two surfaces say the same kind of thing in the same
  // voice without a second code path — the band changes the sentence, not the
  // shape. Skipped on the field statuses, where the panel already carries it.
  // The table's heading is the same read the panel gives the board: the
  // below-goal set is the story whichever way you're looking at it.
  const tableRead = useMemo(
    () => (showsField || !statusMeasures.length
      ? null
      : portfolioRead(statusMeasures, BOARD_BAND, catGrid.length)),
    [showsField, statusMeasures, catGrid.length]
  );


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
      // Only speaks when it has something to add. The "N below target" half just
      // restated the big number beside it, and the critical half was reporting a
      // zero as if it were news — "0 critical" in alarm red is a line that costs
      // a read and returns nothing. It earns its place only when a measure is
      // actually ≥20 pts under, which the count above can't tell you.
      sub: criticalCount > 0 ? `↘ ${criticalCount} of ${matchCount} critically below` : null,
      read: portfolioRead(statusMeasures, statusFilter, catGrid.length),
      rows: panelList.slice(0, 6).map((m) => ({
        key: m.measure_id, label: m.display_name, meta: null, rate: num(m.rate),
        goal: num(m.goal_50th), measureId: m.measure_id, pick: true,
      })),
    };
  }, [lens, crspList, equityList, panelCfg, matchCount, catGrid.length, criticalCount, panelList, statusMeasures, statusFilter]);

  const fieldTotal = lens === 'Providers' ? crspList.length : equityList.length;

  // The focus cards live inside the panel now, so picking one selects the measure
  // right where the reader already is — no scroll back up to a board a viewport away.
  const pickFromFocus = (id) => { if (id) setSelectedId(id); };

  // The arrows walk the selected measure's OWN band, worst-first — not the bubble
  // field's packing order, which is a spatial layout with no meaningful "next".
  // Keyed off the measure's band rather than the board's so a focus-card pick
  // from another band steps through that band, instead of landing with no
  // stepper at all or stepping into a list it isn't part of.
  const panelIds = useMemo(() => rankedIds(selectedPeers), [selectedPeers]);
  const selIdx = selectedId ? panelIds.indexOf(selectedId) : -1;
  const stepMeasure = (dir) => {
    if (selIdx < 0 || !panelIds.length) return;
    const next = (selIdx + dir + panelIds.length) % panelIds.length;
    setSelectedId(panelIds[next]);
  };

  // The three "where to focus" lists, one card at a time in the panel: the worst
  // performers, the flagged CRSPs and the equity gaps. They cost the panel's
  // width instead of a whole band along the bottom, and picking a row selects the
  // measure in the board beside it.
  //
  // Ranked from the grid rather than the lowest-performing endpoint, because a
  // pre-computed global top-8 can't be scoped by filtering it: narrow to AAC and
  // every row drops out, since neither AAC measure was in the worst 8 overall.
  // Filtering a ranking gives you the wrong answer; you have to re-rank. The
  // endpoint returns [measure_id, display_name, rate] — nothing the grid doesn't
  // already carry — so ranking it here is the same list, correctly scoped, and
  // always agreeing with the board beside it.
  const lowestList = useMemo(() => {
    const seen = new Set();
    return [...catGrid]
      .filter((m) => m.measure_id && !seen.has(m.measure_id) && seen.add(m.measure_id))
      .sort((a, b) => num(a.rate) - num(b.rate))
      .slice(0, 5);
  }, [catGrid]);
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
            <div className="ov2-toolbar-right">
              {/* Only where there's a field to switch away from. The other two
                  bands are a table already; a toggle there would offer a view
                  that doesn't exist. */}
              {canToggleView && (
                <div className="ov2-views" role="group" aria-label="View">
                  {[['board', 'Board'], ['table', 'Table']].map(([k, label]) => (
                    <button key={k} type="button"
                      className={`ov2-view ${view === k ? 'is-active' : ''}`}
                      aria-pressed={view === k} onClick={() => setView(k)}>{label}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* The table owns the whole body — no field column, no panel, no
            resizer. That's the point: it's a document, not a chart with an
            inspector, and giving it the full width is what stops four rows from
            reading as a half-rendered board. */}
        {!showsField ? (
          <div className="ov2-body is-table">
            {error ? (
              <ErrorState message="Couldn't load measures." onRetry={refetch} />
            ) : loading ? (
              <div className="ov2-table-wrap"><SkeletonText lines={8} /></div>
            ) : tableRows.length === 0 ? (
              <EmptyState icon="🔍" title="No measures"
                hint="Nothing to show for the selected month and category." />
            ) : (
              <MeasureTable rows={tableRows} total={catGrid.length} copy={TABLE_COPY}
                read={tableRead} sort={tableSort} onSort={onSort}
                onOpen={(m) => onInvestigate && onInvestigate(m)} />
            )}
          </div>
        ) : (
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
                ) : lens === 'Measures' ? (
                  /* The Measures board is the opportunity matrix. Providers and
                     Equity keep the bubble field below: their rows carry neither
                     a goal nor a denominator, so neither of the matrix's axes
                     exists for them — there is no "gap to goal" on a CRSP row. */
                  matrix.rows.length === 0 ? (
                    <EmptyState icon="✅" title="No measures below goal"
                      hint="Nothing needs attention this month." />
                  ) : (
                    <OpportunityMatrix rows={matrix.rows} size={fieldSize}
                      xMin={matrix.xMin} xMax={matrix.xMax} yMin={matrix.yMin} yMax={matrix.yMax}
                      xMid={matrix.xMid} yMid={matrix.yMid}
                      selectedId={selectedId} onSelect={setSelectedId} />
                  )
                ) : packed.length === 0 ? (
                  lens === 'Providers' ? (
                    <EmptyState icon="✅" title="No CRSPs flagged" hint="No providers need attention this month." />
                  ) : (
                    <EmptyState icon="✅" title="No equity alerts" hint="No equity disparities detected this month." />
                  )
                ) : (
                  <div className="ov2-bubbles" key={lens}>
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
                then excludes the caption, so the plot can never sit on it however
                many lines the caption wraps to. */}
            {!error && !loading && lens === 'Measures' && matrix.rows.length > 0 && (
              <MatrixLegend n={matrix.rows.length} push={pushCount}
                xMid={matrix.xMid} yMid={matrix.yMid} />
            )}
            {!error && !loading && lens !== 'Measures' && legend && (
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
                  peers={selectedPeers} selectedMonth={selectedMonth}
                  pos={selIdx >= 0 ? selIdx + 1 : null} total={panelIds.length}
                  onStep={stepMeasure}
                  onClear={() => setSelectedId(null)}
                  onInvestigate={() => onInvestigate && onInvestigate(selected)}
                  onAssign={(intervention) => setAssignScope({ measure: selected, level: 'measure', intervention })} />
              ) : (
                <DefaultPanel loading={loading} panel={activePanel} cards={focusCards} onPick={pickFromFocus} />
              )}
            </div>
          </aside>
        </div>
        )}
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
      scope={scope} onClose={onClose} onAssign={onAssign} />
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
export const MeasureIntel = ({ measure, crsps = [], token, peers, selectedMonth, onAssign }) => {
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
        {onAssign ? (
          // Recommend → assign is one flow: this seeds the assign panel with the
          // recommended play so the reader can queue the tasks that run it.
          <button type="button" className="btn btn-assign btn-sm ov2-rec-assign"
            onClick={() => onAssign(rec.action)}>
            Assign this intervention
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        ) : (
          <>
            <p className="ov2-rec-applynote">Ran this play? Mark it applied — we log the action and weight it higher for measures like this next cycle.</p>
            <LearningInline measure={measure} rec={rec} />
          </>
        )}
      </Stage>
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
export const ProviderIntel = ({ intel, compact = false, onAssign }) => {
  if (!intel || !intel.read) return null;
  const { read, top, rec } = intel;
  return (
    <div className="ov2-intel pva-intel">
      <Stage label="Standing" summary={read.synthesis}
        tag={`Confidence · ${read.confidence.level}`} defaultOpen={!compact}>
        <Signals items={read.signals} />
        <p className="ov2-read-why mono">{read.confidence.why}</p>
      </Stage>

      {!compact && top && (
        <Stage label="Where to focus"
          summary={`Work ${shortId(top.measure.measure_id)} first — ${top.open.toLocaleString()} members open · ${pts(top.gap)} under goal.`}
          tag={`Score ${top.score}`}>
          <div className="ov2-prio">
            <span className="ov2-prio-bar"><span className="ov2-prio-fill" style={{ width: `${Math.max(4, top.score)}%` }} /></span>
            <span className="ov2-prio-score mono num">{top.score}</span>
          </div>
          <Signals items={priorityFactors(top)} className="ov2-prio-factors" />
        </Stage>
      )}

      {!compact && rec && top && (
        <Stage label="Recommended action" summary={rec.action} tag="Suggested" tagKind="preview">
          <p className="ov2-stage-lead">Biggest lever for this provider — on {shortId(top.measure.measure_id)}, run {rec.action.toLowerCase()}. Because {rec.rationale}.</p>
          <div className="ov2-rec-chips">
            {rec.chips.map((c, i) => <span key={i} className={`ov2-rec-chip mono ${c.strong ? 'is-strong' : ''}`}>{c.label}</span>)}
          </div>
          <p className="ov2-read-why mono">{rec.basis}</p>
          {onAssign && (
            <button type="button" className="btn btn-assign btn-sm ov2-rec-assign"
              onClick={() => onAssign(rec.action, top.measure)}>
              Assign this intervention
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          )}
        </Stage>
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
        <Stage label="Board read" summary={panel.read.synthesis}
          tag={`Confidence · ${panel.read.confidence.level}`} defaultOpen>
          <Signals items={panel.read.signals} />
          <p className="ov2-read-why mono">{panel.read.confidence.why}</p>
        </Stage>
      </div>
    )}

    <FocusCarousel cards={cards} loading={loading} onPick={onPick} />
  </div>
);

const SelectedPanel = ({ measure, crsps, token, peers, selectedMonth, pos, total, onStep, onClear, onInvestigate, onAssign }) => {
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
        {onClear && (
          <button type="button" className="ov2-clear" onClick={onClear} title="Clear selection">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear
          </button>
        )}
      </div>
      <h2 className="ov2-measure-name">{measure.display_name}</h2>
      {measure.measure_definition && <p className="ov2-measure-def">{measure.measure_definition}</p>}

      <div className="ov2-measure-rate">
        <span className="num">{rate}%</span>
        <span className={`ov2-gap ov2-gap-${gap >= 0 ? 'pos' : 'neg'} num`}>
          {gap === 0 ? 'at goal' : `${gap > 0 ? '↗' : '↘'} ${pts(Math.abs(gap))} ${gap > 0 ? 'above' : 'below'} goal`}
        </span>
      </div>

      <div className="ov2-goalbar" title={`Goal ${goal}%`}>
        <span className={`ov2-goalbar-fill ov2-goalbar-${tone}`} style={{ width: `${Math.min(100, Math.max(0, rate))}%` }} />
        {goal > 0 && <span className="ov2-goalbar-marker" style={{ left: `${Math.min(100, goal)}%` }} />}
      </div>

      <MeasureIntel measure={measure} crsps={crsps} token={token} peers={peers} selectedMonth={selectedMonth} onAssign={onAssign} />

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
