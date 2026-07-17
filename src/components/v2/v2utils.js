// Shared helpers + sample fallbacks for the v2 Quality Scorecard flow.
// Styling/status semantics reuse the app's existing Direction A tokens.

export const STATUS_TONE = {
  'Below Goal': 'below',
  'At Goal': 'at',
  'Above Goal': 'above',
};

export const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const shortId = (id) => (id || '').replace(/_/g, ' ');

// Compact badge for a long CRSP name, e.g. "Riverside Behavioral Health" → "RBH".
export const acronym = (name) => ((name || '').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase() || '—');

// HEDIS reporting domains ("sub-categories"). Live grid rows carry their own
// `category`; the sample set below is tagged from this map so the category tabs
// are demonstrable on the fallback path too. Anything unmapped falls to EOC.
export const CATEGORY_MAP = {
  APM_E: 'EOC', FUM_7: 'EOC', FUM_30: 'EOC', FUA_7: 'EOC', HBD: 'EOC', SSD: 'EOC',
  CBP: 'EOC', AMM_Acute: 'EOC', AMM_Cont: 'EOC', SPC: 'EOC', SPD: 'EOC', ADD: 'EOC', BPD: 'EOC',
  BCS_E: 'ECDS', CCS: 'ECDS', COL_E: 'ECDS', IMA: 'ECDS', CIS: 'ECDS', CHL: 'ECDS', FVA: 'ECDS', W30: 'ECDS', WCV: 'ECDS',
  AAP: 'AAC', PPC_Pre: 'AAC',
  PCE: 'URU', AMR: 'URU',
};
export const categoryOf = (m) => (m && (m.category || CATEGORY_MAP[m.measure_id])) || 'EOC';

// Distinct categories present in a measure set, in a stable domain order so the
// tabs don't reshuffle between renders. Unknown categories sort to the end.
const CATEGORY_ORDER = ['EOC', 'ECDS', 'AAC', 'URU'];
export const categoriesOf = (measures) => {
  const seen = new Set((measures || []).map(categoryOf).filter(Boolean));
  const known = CATEGORY_ORDER.filter((c) => seen.has(c));
  const extra = [...seen].filter((c) => !CATEGORY_ORDER.includes(c)).sort();
  return [...known, ...extra];
};

// Derive a status bucket from rate vs goal when the API doesn't supply one.
export const statusFor = (rate, goal) => {
  const d = num(rate) - num(goal);
  if (d >= 2) return 'Above Goal';
  if (d >= -1) return 'At Goal';
  return 'Below Goal';
};

// ── Rich sample measure set ───────────────────────────────────
// Used as a fallback so the views are always demonstrable (the bundled JWT is
// frequently expired). Spread across all three status buckets with varied
// distance-from-goal so the bubble sizing is visible.
const M = (measure_id, display_name, rate, goal_50th, def) => {
  const kpi_status = statusFor(rate, goal_50th);
  const denominator = 1500 + ((rate * 37) % 5000);
  const numerator = Math.round((rate / 100) * denominator);
  return { measure_id, display_name, rate, goal_50th, kpi_status, numerator, denominator, measure_definition: def, category: CATEGORY_MAP[measure_id] || 'EOC' };
};

export const SAMPLE_MEASURES = [
  M('AAP', 'Adult Access to Preventive/Ambulatory Health', 62, 68, 'Adults with at least one outpatient or preventive visit during the year.'),
  M('APM_E', 'Antipsychotic Metabolic Monitoring', 49, 60, 'Members on antipsychotics with appropriate metabolic monitoring.'),
  M('FUM_7', 'Follow-Up After ED Visit — Mental Illness (7-day)', 41, 55, 'Follow-up within 7 days of an ED visit for mental illness.'),
  M('FUM_30', 'Follow-Up After ED Visit — Mental Illness (30-day)', 58, 66, 'Follow-up within 30 days of an ED visit for mental illness.'),
  M('FUA_7', 'Follow-Up After ED Visit — Substance Use (7-day)', 38, 52, 'Follow-up within 7 days of an ED visit for substance use.'),
  M('HBD', 'Hemoglobin A1c Control for Diabetes', 57, 65, 'Diabetic patients whose most recent HbA1c is in control.'),
  M('BCS_E', 'Breast Cancer Screening', 64, 70, 'Women 50–74 who had a mammogram to screen for breast cancer.'),
  M('CCS', 'Cervical Cancer Screening', 60, 67, 'Women screened for cervical cancer at the recommended interval.'),
  M('COL_E', 'Colorectal Cancer Screening', 53, 64, 'Adults 45–75 screened for colorectal cancer.'),
  M('SSD', 'Diabetes Screening — Schizophrenia/Bipolar', 47, 58, 'Members on antipsychotics screened for diabetes.'),
  M('AMR', 'Asthma Medication Ratio', 55, 63, 'Members with persistent asthma with an acceptable medication ratio.'),
  M('IMA', 'Immunizations for Adolescents', 51, 60, 'Adolescents who received recommended immunizations by age 13.'),
  M('WCV', 'Well-Child Visits (3–6 yrs)', 59, 65, 'Children with the recommended number of well-child visits.'),
  M('PPC_Pre', 'Prenatal Care — Timeliness', 61, 68, 'Pregnant members who received timely prenatal care.'),
  M('CBP', 'Controlling High Blood Pressure', 67, 70, 'Members with hypertension whose blood pressure is controlled.'),
  M('AMM_Acute', 'Antidepressant Medication — Acute Phase', 69, 70, 'Members who stayed on antidepressants through the acute phase.'),
  M('SPC', 'Statin Therapy — Cardiovascular Disease', 71, 70, 'Members with CVD on appropriate statin therapy.'),
  M('SPD', 'Statin Therapy — Diabetes', 68, 68, 'Diabetic members on appropriate statin therapy.'),
  M('ADD', 'Follow-Up for Children on ADHD Medication', 66, 65, 'Children on ADHD meds with appropriate follow-up.'),
  M('AMM_Cont', 'Antidepressant Medication — Continuation', 72, 70, 'Members who stayed on antidepressants through continuation.'),
  M('CHL', 'Chlamydia Screening in Women', 81, 70, 'Sexually active women screened for chlamydia during the year.'),
  M('CIS', 'Childhood Immunization Status', 78, 68, 'Children who received recommended immunizations by age 2.'),
  M('W30', 'Well-Child Visits — First 30 Months', 76, 66, 'Infants with the recommended well-child visits in 30 months.'),
  M('BPD', 'Blood Pressure Control for Diabetes', 74, 67, 'Diabetic members whose blood pressure is controlled.'),
  M('FVA', 'Flu Vaccinations for Adults', 83, 70, 'Adults who received an influenza vaccination.'),
  M('PCE', 'COPD — Pharmacotherapy Management', 79, 69, 'COPD members on appropriate pharmacotherapy.'),
];

export const sampleKpis = () => {
  const c = { 'Above Goal': 0, 'At Goal': 0, 'Below Goal': 0 };
  SAMPLE_MEASURES.forEach((m) => { c[m.kpi_status] += 1; });
  const total = SAMPLE_MEASURES.length;
  return [
    { label: 'Above Goal', value: c['Above Goal'], total },
    { label: 'At Goal', value: c['At Goal'], total },
    { label: 'Below Goal', value: c['Below Goal'], total, trend: `${SAMPLE_MEASURES.filter((m) => m.rate < 45).length} critical, ${c['Below Goal']} below target` },
  ];
};

export const sampleLowest = () =>
  [...SAMPLE_MEASURES]
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 8)
    .map((m) => ({ measure_id: m.measure_id, display_name: m.display_name, rate: m.rate }));

const CRSP_NAMES = [
  'Star Center', 'Arab Community Center for Economic Services', 'Riverside Behavioral Health',
  'Eastside Family Clinic', 'Northgate Wellness', 'Lakeshore Primary Care',
  'Unity Health Partners', 'Cedar Grove Medical', 'Hopewell Community Health',
  'Maplewood Health Center', 'Summit Care Alliance', 'Bayview Medical Group',
  'Greenfield Family Practice', 'Oakridge Community Clinic', 'Harborview Health',
  'Pinecrest Wellness Center', 'Sunrise Primary Care', 'Ironwood Medical Associates',
  'Fairmont Health Partners', 'Westgate Community Health', 'Silverlake Clinic',
  'Brookside Behavioral Health', 'Cornerstone Family Medicine', 'Meridian Health Group',
  'Lakeland Care Center', 'Cypress Community Wellness', 'Ridgeway Medical Clinic',
  'Ashford Primary Care', 'Willowbrook Health Services', 'Trailhead Community Clinic',
];

export const sampleCrsps = () =>
  SAMPLE_MEASURES.filter((m) => m.kpi_status === 'Below Goal')
    .slice(0, 6)
    .map((m, i) => ({ measure_id: m.measure_id, crsp_name: CRSP_NAMES[i % CRSP_NAMES.length], rate: Math.max(30, m.rate - 6) }));

// Equity alerts: below-goal measures where a race stratum lags the overall rate.
const RACE_STRATA = ['Black or African American', 'Arab American', 'Hispanic / Latino', 'Asian', 'Other'];
export const sampleEquityAlerts = () =>
  [...SAMPLE_MEASURES]
    .filter((m) => m.kpi_status === 'Below Goal')
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 4)
    .map((m, i) => ({ measure_id: m.measure_id, race_strat: RACE_STRATA[i % RACE_STRATA.length], rate: Math.max(28, m.rate - (8 + i * 2)) }));

// ── Behavior Intelligence (Stage 1) ──────────────────────────
// Turns a measure's own numbers into a plain-language read of what's happening
// and who's driving it. Deterministic and explainable by design — every line is
// derived from data already on screen (gap, trend, denominator, CRSP rates), no
// model and no invented facts. `confidence` is a function of denominator size,
// because a read off 4,000 members is more trustworthy than one off 40.
export const behaviorRead = (measure, trend, crsps = []) => {
  const rate = num(measure.rate);
  const goal = num(measure.goal_50th);
  const denom = num(measure.denominator);
  const numer = num(measure.numerator);
  const open = Math.max(0, denom - numer);
  const gap = Math.round((rate - goal) * 10) / 10;

  const signals = [];

  // Where it sits versus its own goal.
  let stance = 'steady';
  if (goal > 0) {
    if (gap <= -0.5) { signals.push({ k: 'Gap', v: `${Math.abs(gap)} pts below the ${goal}% goal.` }); stance = `${Math.abs(gap)} pts below goal`; }
    else if (gap < 2) { signals.push({ k: 'Gap', v: `Holding right at the ${goal}% goal.` }); stance = 'at goal'; }
    else { signals.push({ k: 'Gap', v: `${gap} pts above the ${goal}% goal.` }); stance = `${gap} pts above goal`; }
  }

  // Direction of travel, first vs. last point of the trend series.
  let motion = '';
  if (trend && trend.length >= 2) {
    const first = num(trend[0].rate);
    const last = num(trend[trend.length - 1].rate);
    const delta = Math.round((last - first) * 10) / 10;
    const months = trend.length;
    if (delta <= -1) { signals.push({ k: 'Trend', v: `Down ${Math.abs(delta)} pts over the last ${months} months — still sliding.` }); motion = 'and still sliding'; }
    else if (delta >= 1) { signals.push({ k: 'Trend', v: `Up ${delta} pts over the last ${months} months — recovering.` }); motion = 'but recovering'; }
    else { signals.push({ k: 'Trend', v: `Flat over the last ${months} months — no real movement.` }); motion = 'and flat'; }
  }

  // How much work still sits here.
  if (denom > 0) {
    const pct = Math.round((open / denom) * 100);
    signals.push({ k: 'Open gaps', v: `${open.toLocaleString()} members still open — ${pct}% of the ${denom.toLocaleString()} eligible.` });
  }

  // Who is furthest behind — the "who's driving it" line.
  const mine = (crsps || []).filter((c) => c.measure_id === measure.measure_id && num(c.rate) > 0);
  if (mine.length) {
    const worst = mine.reduce((lo, c) => (num(c.rate) < num(lo.rate) ? c : lo), mine[0]);
    signals.push({ k: 'Driver', v: `${worst.crsp_name} is furthest behind at ${num(worst.rate)}%.` });
  }

  const level = denom >= 1000 ? 'High' : denom >= 300 ? 'Moderate' : 'Low';
  const confidenceWhy = denom > 0
    ? `${denom.toLocaleString()} eligible members · trend + claims only`
    : 'no denominator — read is directional only';

  const synthesis = [stance, motion].filter(Boolean).join(' ');

  return {
    synthesis: synthesis ? `${synthesis.charAt(0).toUpperCase()}${synthesis.slice(1)}.` : 'Stable this period.',
    signals,
    confidence: { level, why: confidenceWhy },
  };
};

export const fmtCompact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(n)));

// ── Decision Intelligence (Stage 2) ──────────────────────────
// A few HEDIS measures carry outsized program weight (behavioral-health
// follow-up measures are triple-weighted in Medicaid quality programs); the rest
// default to 1. Kept as an explicit, editable table so the weight shows in the
// math rather than hiding in a model.
const MEASURE_WEIGHT = { FUM_7: 3, FUA_7: 3, FUH: 3, FUM_30: 2, APM_E: 2, SSD: 2, AMM_Acute: 2, AMM_Cont: 2 };

// Priority = recoverable work × how far below goal × program weight × urgency.
// Every term comes from the measure's own numbers, so a rank can always explain
// itself. "Recoverable" is the winnable member count, not the raw miss — a big
// gap on 40 members ranks below a small gap on 4,000.
export const priorityScore = (measure) => {
  const rate = num(measure.rate), goal = num(measure.goal_50th);
  const open = Math.max(0, num(measure.denominator) - num(measure.numerator));
  const gap = Math.max(0, Math.round((goal - rate) * 10) / 10); // points below goal
  const weight = MEASURE_WEIGHT[measure.measure_id] || 1;
  const urgency = gap >= 20 ? 1.5 : gap >= 10 ? 1.2 : 1;
  const raw = open * (gap / 100) * weight * urgency;
  return { raw, open, gap, weight, urgency };
};

// Rank a set of measures by priority, normalising the raw score to 0–100 so the
// leader reads as 100 and the rest are relative to it.
export const rankByPriority = (measures) => {
  const scored = (measures || []).filter((m) => m && m.measure_id).map((m) => ({ measure: m, ...priorityScore(m) }));
  const max = Math.max(1, ...scored.map((s) => s.raw));
  return scored
    .sort((a, b) => b.raw - a.raw)
    .map((s, i) => ({ ...s, score: Math.round((s.raw / max) * 100), rank: i + 1 }));
};

// The human-readable "why this rank" breakdown for one scored measure.
export const priorityFactors = (s) => [
  { k: 'Recoverable', v: `${s.open.toLocaleString()} members still open` },
  { k: 'Gap', v: `${s.gap} pts below goal` },
  { k: 'Weight', v: `×${s.weight}${s.weight > 1 ? ' · program-weighted' : ''}` },
  ...(s.urgency > 1 ? [{ k: 'Urgency', v: s.urgency >= 1.5 ? '×1.5 · critical gap' : '×1.2 · wide gap' }] : []),
];

// Portfolio-level companion to behaviorRead: the "what's happening across the
// whole board" narrative shown before any single measure is opened. Same shape
// and same discipline — every line is a roll-up of the current snapshot (counts,
// widest gap, total open work, where that work concentrates). Snapshot only, so
// it makes no trend claim it can't back up.
export const portfolioRead = (measures, statusFilter, totalCount) => {
  const set = (measures || []).filter((m) => m && m.measure_id);
  const n = set.length;
  const total = totalCount || n;
  if (!n) return null;

  const att = (m) => (num(m.goal_50th) > 0 ? num(m.rate) / num(m.goal_50th) : num(m.rate) / 100);
  const openOf = (m) => Math.max(0, num(m.denominator) - num(m.numerator));
  const totalOpen = set.reduce((s, m) => s + openOf(m), 0);
  const totalDenom = set.reduce((s, m) => s + num(m.denominator), 0);

  const above = statusFilter === 'Above Goal';
  const below = statusFilter === 'Below Goal';

  const sorted = [...set].sort((a, b) => (above ? att(b) - att(a) : att(a) - att(b)));
  const lead = sorted[0];
  const leadGap = Math.round((num(lead.rate) - num(lead.goal_50th)) * 10) / 10;
  const critical = below ? set.filter((m) => num(m.goal_50th) - num(m.rate) >= 20).length : 0;

  const signals = [];
  if (lead && num(lead.goal_50th) > 0) {
    signals.push({
      k: above ? 'Leader' : 'Widest gap',
      v: `${shortId(lead.measure_id)} — ${Math.abs(leadGap)} pts ${above ? 'ahead of' : 'under'} its ${num(lead.goal_50th)}% target.`,
    });
  }
  if (totalOpen > 0) {
    signals.push({ k: 'Open work', v: `~${fmtCompact(totalOpen)} members carry an open gap across these ${n} measures.` });
    const top3 = sorted.slice(0, 3).reduce((s, m) => s + openOf(m), 0);
    const pct = Math.round((top3 / totalOpen) * 100);
    if (n > 3 && pct > 0) signals.push({ k: 'Concentration', v: `The 3 ${below ? 'widest-gap' : 'lowest'} measures hold ${pct}% of that work.` });
  }

  let synthesis;
  if (below) synthesis = `${n} of ${total} measures sit below goal${critical ? ` — ${critical} critically` : ''}.`;
  else if (above) synthesis = `${n} of ${total} measures are beating goal.`;
  else synthesis = `${n} of ${total} measures are holding at goal.`;

  const level = totalDenom >= 5000 ? 'High' : totalDenom >= 1000 ? 'Moderate' : 'Low';
  return { synthesis, signals, confidence: { level, why: `${totalDenom.toLocaleString()} eligible across ${n} measures` } };
};

// Stratum-level companion to behaviorRead: the "what's happening for THIS equity
// group" narrative, relevant to the group rather than the whole measure. Same
// discipline — every line is a roll-up of the group's own rate against goal and
// against its sibling strata (rank, spread). Deterministic and explainable.
const DIM_LABEL = { age: 'age', race: 'race', ethnicity: 'ethnicity' };
const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
export const stratumRead = (pick, siblings, measure) => {
  if (!pick) return null;
  const rate = num(pick.rate);
  const goal = num(pick.goal ?? measure?.goal_50th);
  const gap = Math.round((rate - goal) * 10) / 10;
  const dim = DIM_LABEL[pick.type] || 'peer';

  const set = (siblings || []).filter((s) => s && s.group);
  const sorted = [...set].sort((a, b) => num(a.rate) - num(b.rate)); // worst-first
  const n = sorted.length;
  const rank = sorted.findIndex((s) => s.group === pick.group) + 1; // 1 = furthest behind
  const worst = sorted[0];
  const best = sorted[n - 1];
  const spread = n >= 2 ? Math.round((num(best.rate) - num(worst.rate)) * 10) / 10 : 0;

  const signals = [];
  if (goal > 0) {
    if (gap <= -0.5) signals.push({ k: 'Gap', v: `${Math.abs(gap)} pts below the ${goal}% goal.` });
    else if (gap < 2) signals.push({ k: 'Gap', v: `Holding right at the ${goal}% goal.` });
    else signals.push({ k: 'Gap', v: `${gap} pts above the ${goal}% goal.` });
  }
  if (n >= 2 && rank) {
    const place = rank === 1 ? 'the furthest behind' : rank === n ? 'the strongest' : 'mid-pack';
    signals.push({ k: 'Standing', v: `${ordinal(rank)} of ${n} ${dim} groups — ${place}.` });
    signals.push({ k: 'Spread', v: `${spread} pts between ${worst.group} (${num(worst.rate)}%) and ${best.group} (${num(best.rate)}%).` });
  }

  const disparity = rank === 1 && n >= 2 && gap < 0;
  // No group prefix: the only surface for this read is the worklist header card,
  // whose title is already the group. "6 - 17 is 16 pts below goal" under a "6 - 17"
  // heading just says it twice.
  const synthesis = goal > 0
    ? `${Math.abs(gap)} pts ${gap < -0.5 ? 'below' : gap >= 2 ? 'above' : 'at'} goal${disparity ? ' — the widest disparity in this group' : ''}.`
    : `${rate}% — no goal set for this group.`;

  const denom = num(measure?.denominator);
  const level = denom >= 3000 ? 'High' : denom >= 800 ? 'Moderate' : 'Low';
  return {
    signals,
    synthesis,
    isDisparity: disparity,
    confidence: { level, why: `stratified rate · ${dim} cut · claims only` },
  };
};

// The worklist's own read, for when NO equity stratum is filtering the list —
// the population the list is actually showing: this provider (or all providers)
// on this measure. Companion to stratumRead and the same shape, so the worklist
// header renders one component either way. Nothing is selected is not the same
// as nothing to say: the standing, the open work, and the widest stratum gap
// underneath are all knowable before a chip is picked.
//   `stats`  — { members, nonCompliant } counted from the rows on screen.
//   `equity` — the measure's strata, used only to name the widest gap; it's a
//              network-wide cut, so the signal says so rather than implying the
//              disparity was measured inside this provider.
export const worklistRead = (measure, provider, equity, stats) => {
  if (!measure) return null;
  const overall = !provider || !!provider.overall;
  const rate = num(provider && !overall ? provider.rate : measure.rate);
  const goal = num(provider && !overall ? provider.goal : measure.goal_50th);
  const gap = Math.round((rate - goal) * 10) / 10;
  const who = overall ? 'across all providers' : `at ${provider.crsp}`;

  const signals = [];
  if (goal > 0) {
    if (gap <= -0.5) signals.push({ k: 'Gap', v: `${Math.abs(gap)} pts below the ${goal}% goal.` });
    else if (gap < 2) signals.push({ k: 'Gap', v: `Holding right at the ${goal}% goal.` });
    else signals.push({ k: 'Gap', v: `${gap} pts above the ${goal}% goal.` });
  }

  // What the list in front of the reader actually holds.
  const shown = num(stats?.members);
  const open = num(stats?.nonCompliant);
  if (shown > 0) {
    const pct = Math.round((open / shown) * 100);
    signals.push({ k: 'Open gaps', v: `${open.toLocaleString()} of ${shown.toLocaleString()} members listed carry an open gap — ${pct}%.` });
  }

  // Members that must convert for this population to reach goal — the number
  // that decides whether the list below is even big enough to close the gap.
  const denom = num(measure.denominator);
  if (goal > 0 && gap < 0 && denom > 0) {
    const need = Math.max(0, Math.ceil((goal / 100) * denom) - num(measure.numerator));
    if (need > 0) signals.push({ k: 'To goal', v: `~${fmtCompact(need)} members must close to reach ${goal}%.` });
  }

  // The widest stratum gap sitting under this population — the reason to reach
  // for the equity filter rather than work the list flat.
  const all = ['age', 'race', 'ethnicity'].flatMap((type) =>
    (equity?.[type] || []).filter((g) => g && g.group).map((g) => ({ ...g, type })));
  const worst = all.length >= 2
    ? all.reduce((lo, g) => (num(g.rate) < num(lo.rate) ? g : lo), all[0])
    : null;
  if (worst) {
    const wGap = Math.round((num(worst.rate) - num(worst.goal ?? goal)) * 10) / 10;
    signals.push({
      k: 'Widest gap',
      v: `${worst.group} at ${num(worst.rate)}%${wGap < 0 ? ` — ${Math.abs(wGap)} pts under goal` : ''} · network-wide ${DIM_LABEL[worst.type]} cut.`,
    });
  }

  const stance = goal > 0
    ? `${Math.abs(gap)} pts ${gap < -0.5 ? 'below' : gap >= 2 ? 'above' : 'at'} goal ${who}`
    : `${rate}% ${who}`;
  const synthesis = open > 0
    ? `${stance} — ${open.toLocaleString()} ${open === 1 ? 'member' : 'members'} still open on this list.`
    : `${stance}.`;

  const level = denom >= 3000 ? 'High' : denom >= 800 ? 'Moderate' : 'Low';
  return {
    signals,
    synthesis: synthesis.charAt(0).toUpperCase() + synthesis.slice(1),
    isDisparity: false,
    confidence: { level, why: `${shown.toLocaleString()} members listed · claims only` },
  };
};

// ── Recommendation Intelligence (Stage 3) ────────────────────
// Precedent-based, and honest about it: these are the interventions that most
// often move measures LIKE this one (drawn from published quality-improvement
// patterns), NOT yet learned from this organization's own outcomes — that's
// Stage 4. Every recommendation is labelled "pattern-based" so it never reads as
// a live outcome claim, in line with the "explainable, no invented facts" rule.
const INTERVENTION_PATTERNS = [
  { test: (id) => /^(FU|FUH|FUM|FUA)/.test(id), action: 'Post-discharge outreach + scheduling',
    why: 'follow-up measures move most when contact happens inside the closing window', lift: '9–12%' },
  { test: (id) => /^(APM|SSD|AMM|SPC|SPD|PCE|HBD|BPD)/.test(id), action: 'Pharmacy adherence + records reconciliation',
    why: 'medication and monitoring gaps are often documentation, not missing care', lift: '8–11%' },
  { test: (id) => /^(BCS|CCS|COL|CIS|IMA|W30|WCV|CHL|AAP|PPC|ADD)/.test(id), action: 'Screening & visit reminder campaign',
    why: 'preventive measures respond to reminders paired with easy scheduling', lift: '6–9%' },
  { test: () => true, action: 'Coding & records review',
    why: 'a share of the gap is usually care that was delivered but never coded', lift: '5–8%' },
];

export const recommendAction = (measure, read) => {
  const id = measure.measure_id || '';
  const pick = INTERVENTION_PATTERNS.find((r) => r.test(id)) || INTERVENTION_PATTERNS[INTERVENTION_PATTERNS.length - 1];
  const open = Math.max(0, num(measure.denominator) - num(measure.numerator));
  return {
    action: pick.action,
    rationale: pick.why,
    chips: [
      { label: `similar measures +${pick.lift}`, strong: true },
      { label: `${fmtCompact(open)} members in scope` },
      ...(read && read.confidence ? [{ label: `read confidence ${read.confidence.level.toLowerCase()}` }] : []),
    ],
    basis: 'Pattern-based — from how measures like this behave, not yet learned from your own outcomes.',
  };
};

// ── Learning Intelligence (Stage 4) ──────────────────────────
// A working preview of the feedback loop. Applied actions are logged locally
// (localStorage) and fed back as "what we've learned here". A real deployment
// persists this server-side and ties each action to the next measurement cycle;
// this shows the shape of the loop and is labelled as a local preview.
const LEARN_KEY = 'qp_v2_learning';
const readLearnLog = () => { try { return JSON.parse(localStorage.getItem(LEARN_KEY) || '{}'); } catch { return {}; } };
const writeLearnLog = (log) => { try { localStorage.setItem(LEARN_KEY, JSON.stringify(log)); } catch { /* storage off */ } };

export const learningState = (measureId) => {
  const entries = readLearnLog()[measureId] || [];
  return { count: entries.length, last: entries[entries.length - 1] || null };
};

export const recordApplied = (measureId, action) => {
  const log = readLearnLog();
  const entries = log[measureId] || [];
  entries.push({ action, at: Date.now() });
  log[measureId] = entries;
  writeLearnLog(log);
  return { count: entries.length, last: entries[entries.length - 1] };
};

// A short monthly trend ending at the measure's current rate — used as a
// fallback so the detail panel always shows a trend line (mirrors the classic
// Measure Detail header) when live mini-chart data isn't available.
export const sampleTrend = (measureId, fallbackRate) => {
  const m = SAMPLE_MEASURES.find((x) => x.measure_id === measureId);
  const end = num(m ? m.rate : (fallbackRate != null ? fallbackRate : 55));
  const months = ['Oct', 'Nov', 'Dec'];
  const start = Math.max(5, end - 8);
  return months.map((mo, i) => ({
    month: `${mo}-2026`,
    rate: Math.round(start + ((end - start) * i) / (months.length - 1)),
  }));
};

// A provider's standing across the WHOLE measure set. There is no provider-→-all-
// measures endpoint, so a stable per-(provider, measure) offset is applied to each
// measure's network rate — the same demo-grade, deterministic approach as
// sampleProviders, giving each provider a distinct but repeatable profile. The
// "Overall" provider is the network itself, so it passes through unchanged.
const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
export const providerProfile = (providerName, overall, measures) =>
  (measures || []).filter((m) => m && m.measure_id).map((m) => {
    const net = num(m.rate);
    const goal = num(m.goal_50th);
    const off = overall ? 0 : ((hashStr(`${providerName}|${m.measure_id}`) % 25) - 12); // −12..+12 pts
    const rate = Math.max(20, Math.min(96, net + off));
    const denominator = 60 + (hashStr(`${m.measure_id}|${providerName}`) % 340);
    const numerator = Math.round((rate / 100) * denominator);
    return {
      measure_id: m.measure_id, display_name: m.display_name, measure_definition: m.measure_definition,
      category: categoryOf(m), goal_50th: goal, netRate: net,
      rate, numerator, denominator, kpi_status: statusFor(rate, goal),
    };
  });

// Goal-standing roll-up over a provider profile (rate-vs-goal per measure): the
// KPI-header numbers — counts by tone, average gap, member totals, open gaps.
export const providerSummary = (profile) => {
  const set = (profile || []).filter((m) => m && m.measure_id);
  const c = { below: 0, at: 0, above: 0 };
  let gapSum = 0;
  set.forEach((m) => {
    c[STATUS_TONE[statusFor(m.rate, m.goal_50th)] || 'below'] += 1;
    gapSum += num(m.rate) - num(m.goal_50th);
  });
  const total = set.length;
  const members = set.reduce((s, m) => s + num(m.denominator), 0);
  const open = set.reduce((s, m) => s + Math.max(0, num(m.denominator) - num(m.numerator)), 0);
  return { ...c, total, avgGap: total ? Math.round((gapSum / total) * 10) / 10 : 0, members, open };
};

// Provider-level intelligence: the same read the Overview gives a single measure,
// but rolled up across everything a provider supports — where it stands, which
// measure to work first, and the intervention with the biggest lever here. Shared
// by the Provider Analysis page and the Explorer's active-provider card so a
// provider reads identically on both surfaces.
export const providerIntel = (profile) => {
  const set = (profile || []).filter((m) => m && m.measure_id);
  if (!set.length) return null;
  const below = set.filter((m) => (STATUS_TONE[statusFor(m.rate, m.goal_50th)] || 'below') === 'below');
  const read = portfolioRead(below.length ? below : set, below.length ? 'Below Goal' : 'At Goal', set.length);
  const top = rankByPriority(set)[0];
  const rec = top ? recommendAction(top.measure, read) : null;
  return { read, top, rec };
};

// Where a single provider sits among the others ON THE CURRENT MEASURE. `providers`
// is the CRSP list for the active measure (Overall excluded here). Rank is stated
// as "behind N of M" — how many peers post a higher rate — which is the one thing
// an individual provider card can say that the aggregate can't. Returns null when
// there aren't enough peers to rank against.
export const peerRank = (provider, providers) => {
  const peers = (providers || []).filter((p) => p && !p.overall);
  const total = peers.length;
  if (!provider || total <= 1) return null;
  const rate = num(provider.rate);
  const ahead = peers.filter((p) => num(p.rate) > rate).length;
  return { rate, total, ahead };
};

// The individual-provider Standing read: leads with peer standing on the current
// measure, then the portfolio breadth; expands to concentration, recoverable
// members, and the category the provider is weakest in. Distinct from the
// aggregate `providerIntel` read, which has no single-measure peer context.
export const providerCardRead = (profile, summary, peer) => {
  const set = (profile || []).filter((m) => m && m.measure_id);
  if (!set.length || !summary) return null;
  const below = set.filter((m) => (STATUS_TONE[statusFor(m.rate, m.goal_50th)] || 'below') === 'below');

  const peerLine = peer
    ? (peer.ahead === 0
      ? `${peer.rate}% here — strongest of ${peer.total} providers on this measure.`
      : peer.ahead >= peer.total - 1
        ? `${peer.rate}% here — weakest of ${peer.total} providers on this measure.`
        : `${peer.rate}% here — behind ${peer.ahead} of ${peer.total} providers on this measure.`)
    : '';
  const gapWord = summary.avgGap < 0 ? 'under' : 'over';
  const breadth = `${summary.below} of ${summary.total} measures below goal · avg ${Math.abs(summary.avgGap)} pts ${gapWord}.`;
  const synthesis = peerLine ? `${peerLine} ${breadth}` : breadth;

  const signals = [];
  // Concentration: how many below-goal measures hold ~half the members-to-goal.
  const need = (m) => Math.max(0, Math.ceil((num(m.goal_50th) / 100) * num(m.denominator)) - num(m.numerator));
  const belowSorted = [...below].sort((a, b) => need(b) - need(a));
  const totalNeed = belowSorted.reduce((s, m) => s + need(m), 0);
  if (totalNeed > 0 && belowSorted.length >= 3) {
    let cum = 0;
    let k = 0;
    while (k < belowSorted.length && cum < totalNeed * 0.5) { cum += need(belowSorted[k]); k += 1; }
    if (k > 0 && k < belowSorted.length) {
      signals.push({ k: 'Concentration', v: `${k} of ${belowSorted.length} below-goal measures hold ~half the shortfall.` });
    }
  }
  if (summary.open > 0) {
    signals.push({ k: 'Recoverable', v: `~${fmtCompact(summary.open)} members carry an open gap.` });
  }
  // Category tilt: where the provider trails on the most measures.
  const byCat = {};
  below.forEach((m) => { const c = m.category || 'Other'; byCat[c] = (byCat[c] || 0) + 1; });
  const worstCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  if (worstCat && worstCat[1] >= 2) {
    signals.push({ k: 'Weakest in', v: `${worstCat[0]} — ${worstCat[1]} measures below goal.` });
  }

  const totalDenom = set.reduce((s, m) => s + num(m.denominator), 0);
  const level = totalDenom >= 5000 ? 'High' : totalDenom >= 1000 ? 'Moderate' : 'Low';
  return { synthesis, signals, confidence: { level, why: `${totalDenom.toLocaleString()} eligible across ${set.length} measures` } };
};

// Every provider in the network, name only — the directory's spine. There is no
// provider-roster endpoint (fetchCRSPLevelData is per-measure and
// fetchCRSPsNeedingAttention only returns the flagged ones), so the directory
// derives each provider's standing from providerProfile over the measure grid,
// the same deterministic profile the Provider Analysis page reads. Names come
// from live CRSP rows when any are available; otherwise this roster.
export const sampleProviderNames = () => [...CRSP_NAMES];

// Providers (CRSP-level) for a measure.
export const sampleProviders = (measureId) => {
  const base = SAMPLE_MEASURES.find((m) => m.measure_id === measureId)?.rate || 60;
  const list = [{ crsp: 'Overall', rate: base, numerator: 0, denominator: 0 }];
  CRSP_NAMES.forEach((name, i) => {
    const rate = Math.max(28, Math.min(95, base + ((i * 7 + 3) % 24) - 12));
    const denominator = 200 + ((i * 53) % 700);
    list.push({ crsp: name, rate, denominator, numerator: Math.round((rate / 100) * denominator) });
  });
  return list;
};

// Equity strata for a measure (age / race / ethnicity).
const AGE_GROUPS = ['6 - 17', '18 - 34', '35 - 49', '50 - 64', '65+'];
const RACE_GROUPS = ['White', 'Black or African American', 'Asian', 'Arab American', 'Other'];
const ETH_GROUPS = ['Hispanic / Latino', 'Not Hispanic / Latino', 'Unknown'];

const stratList = (groups, measureId, salt) => {
  const base = SAMPLE_MEASURES.find((m) => m.measure_id === measureId)?.rate || 60;
  const goal = SAMPLE_MEASURES.find((m) => m.measure_id === measureId)?.goal_50th || 67;
  return groups.map((group, i) => {
    const rate = Math.max(30, Math.min(96, base + ((i * 11 + salt) % 26) - 13));
    const denominator = 120 + ((i * 47 + salt) % 500);
    const numerator = Math.round((rate / 100) * denominator);
    return { group, rate, goal, denom: denominator, num: numerator, notMeeting: denominator - numerator };
  });
};

export const sampleEquity = (measureId) => ({
  age: stratList(AGE_GROUPS, measureId, 3),
  race: stratList(RACE_GROUPS, measureId, 7),
  ethnicity: stratList(ETH_GROUPS, measureId, 5),
});

// Member-level rows for a stratum.
const FIRST = ['Shareen', 'Crystal', 'Daisha', 'Daniel', 'Lisa', 'Marcus', 'Aisha', 'Hassan', 'Maria', 'Robert', 'Nina', 'Omar', 'Grace', 'Tariq', 'Elena'];
const LAST = ['Abdullah', 'Adams', 'Baker', 'Brown', 'Carter', 'Diallo', 'Evans', 'Farah', 'Garcia', 'Hughes', 'Ibrahim', 'Jackson', 'Khan', 'Lopez', 'Mensah'];
const SOURCES = ['Claim', 'EHR', '-'];

export const sampleMembers = (count = 18, crsp) =>
  Array.from({ length: count }).map((_, i) => {
    const open = i % 3 === 0; // ~1/3 non-compliant (open care gap)
    return {
      memberId: String(10000000 + i * 137911).padStart(10, '0').slice(0, 10),
      memberName: `${LAST[i % LAST.length]}, ${FIRST[i % FIRST.length]}`,
      dob: '01/30/1994',
      age: 24 + ((i * 7) % 45),
      crsp: crsp || CRSP_NAMES[i % CRSP_NAMES.length],
      serviceDate: open ? '-' : `0${1 + (i % 9)}/${10 + (i % 18)}/2026`,
      source: open ? '-' : SOURCES[i % 2],
      compliant: !open,
      priority: open ? 'Open gap' : 'Complaint',
    };
  });

// Sample care staff + intervention types for the assignment flow.
export const STAFF = ['Maria Chen, RN', 'James Okafor', 'Priya Patel, CHW', 'David Kim', 'Aisha Rahman, RN'];
export const INTERVENTIONS = ['Outreach call', 'Schedule appointment', 'Send reminder letter', 'Refer to care manager', 'Telehealth follow-up'];
