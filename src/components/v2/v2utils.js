// Shared helpers + sample fallbacks for the v2 Quality Scorecard flow.
// Styling/status semantics reuse the app's existing Direction A tokens.

export const STATUS_TONE = {
  'Below Goal': 'below',
  'At Goal': 'at',
  'Above Goal': 'above',
};

export const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const shortId = (id) => (id || '').replace(/_/g, ' ');

// "1 pts" reads as a typo, and these strings carry the board read — the one card
// on the page whose whole job is to sound like it checked its own arithmetic.
// Takes the magnitude; callers own the sign and the direction word.
export const pts = (n) => `${n} ${Math.abs(n) === 1 ? 'pt' : 'pts'}`;

// How many members must convert for a measure to cross its goal. The effort
// number: "open gaps" is the pool you could work, this is how much of it you
// actually have to close. 0 when the measure is already at or above goal.
export const neededToGoal = (measure) => {
  const goal = num(measure && measure.goal_50th);
  const denom = num(measure && measure.denominator);
  if (goal <= 0 || denom <= 0) return 0;
  return Math.max(0, Math.ceil((goal / 100) * denom) - num(measure.numerator));
};

// The workable pool — members with an open gap. Distinct from neededToGoal:
// a measure can have 1.8k open and need only 140 of them to cross.
export const openGaps = (measure) =>
  Math.max(0, num(measure && measure.denominator) - num(measure && measure.numerator));

// Compact badge for a long CRSP name, e.g. "Riverside Behavioral Health" → "RBH".
export const acronym = (name) => ((name || '').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase() || '—');

// HEDIS reporting domains ("sub-categories"). Live grid rows carry their own
// `category`; the sample set below is tagged from this map so the category tabs
// are demonstrable on the fallback path too. Anything unmapped falls to EOC.
// EOC is the roster from the client's "HEDIS Category Distribution (EOC)" sheet —
// real measure codes and names, so the sample set matches the measures people
// actually name in review. Only that sheet was supplied; ECDS and URU keep their
// placeholder measures until the other sheets land.
export const CATEGORY_MAP = {
  AAB: 'EOC', AAP: 'EOC', ADD: 'EOC', AMM: 'EOC', APC: 'EOC', BCS: 'EOC', CBP: 'EOC',
  CCS: 'EOC', COL: 'EOC', CPC: 'EOC', DAE: 'EOC', DRR: 'EOC', EED: 'EOC', FUA: 'EOC',
  FUH: 'EOC', FUI: 'EOC', FUM: 'EOC', GSD: 'EOC', HBD: 'EOC', IET: 'EOC', KED: 'EOC',
  PPC: 'EOC', SAA: 'EOC', SMD: 'EOC', SSD: 'EOC', TBC: 'EOC', WCC: 'EOC', WCV: 'EOC',
  IMA: 'ECDS', CIS: 'ECDS', CHL: 'ECDS', FVA: 'ECDS', W30: 'ECDS',
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
// The eligible population is given per measure rather than derived from the rate.
// It used to be `1500 + (rate * 37) % 5000`, which made every variable a function
// of the rate: open-gap counts landed in a 1.3k–1.8k band and the bubble field
// drew two dozen near-identical circles, so the size channel carried nothing.
// Real denominators span orders of magnitude — a whole-population access measure
// against a depression-remission cohort — and the goals span 12% to 88%, so the
// field now varies in both size and ring fill.
const M = (measure_id, display_name, rate, goal_50th, eligible, def) => {
  const kpi_status = statusFor(rate, goal_50th);
  const denominator = eligible;
  const numerator = Math.round((rate / 100) * denominator);
  return { measure_id, display_name, rate, goal_50th, kpi_status, numerator, denominator, measure_definition: def, category: CATEGORY_MAP[measure_id] || 'EOC' };
};

export const SAMPLE_MEASURES = [
  // ── EOC — the client's measure roster (code + name as supplied) ──────────
  // rate, goal, eligible population.
  M('AAB', 'Avoidance of Antibiotic Treatment for Acute Bronchitis/Bronchiolitis', 28, 32, 8400, 'Episodes of acute bronchitis NOT dispensed an antibiotic.'),
  M('AAP', "Adults' Access to Preventive/Ambulatory Health Services", 81, 86, 46000, 'Adults with at least one ambulatory or preventive visit during the year.'),
  M('ADD', 'Follow-Up Care for Children Prescribed ADHD Medication', 41, 45, 2100, 'Children on ADHD medication with the recommended follow-up visits.'),
  M('AMM', 'Antidepressant Medication Management', 74, 72, 5600, 'Members who stayed on antidepressant medication as prescribed.'),
  M('APC', 'Asthma Medication Ratio', 58, 63, 3900, 'Members with persistent asthma holding an acceptable controller ratio.'),
  M('BCS', 'Breast Cancer Screening', 69, 74, 12800, 'Women 50–74 screened for breast cancer with a mammogram.'),
  M('CBP', 'Controlling High Blood Pressure', 57, 62, 15400, 'Members with hypertension whose blood pressure is adequately controlled.'),
  M('CCS', 'Cervical Cancer Screening', 66, 71, 11200, 'Women screened for cervical cancer at the recommended interval.'),
  M('COL', 'Colorectal Cancer Screening', 44, 55, 18600, 'Adults 45–75 screened for colorectal cancer.'),
  M('CPC', 'Care for Older Adults', 52, 48, 2700, 'Older adults receiving the full care-assessment set.'),
  M('DAE', 'Appropriate Testing for Pharyngitis', 84, 88, 4300, 'Pharyngitis episodes with an appropriate strep test before antibiotics.'),
  M('DRR', 'Depression Remission or Response', 8, 12, 900, 'Members reaching remission or response after a positive depression screen.'),
  M('EED', 'Eye Exam for Patients With Diabetes', 49, 58, 9700, 'Diabetic members with a retinal eye exam in the measurement year.'),
  M('FUA', 'Follow-Up After Emergency Department Visit for People With Mental Illness', 29, 36, 3100, 'Follow-up within 7 days of an ED visit for mental illness.'),
  M('FUH', 'Follow-Up After Hospitalization for Mental Illness', 51, 58, 1800, 'Follow-up within 7 days of a mental-illness inpatient discharge.'),
  M('FUI', 'Follow-Up After High-Intensity Care for Substance Use Disorder', 17, 24, 1150, 'Follow-up after high-intensity substance use disorder care.'),
  M('FUM', 'Follow-Up After Emergency Department Visit for People With Multiple High-Risk Chronic Conditions', 63, 68, 2450, 'Follow-up within 7 days of an ED visit for multiple chronic conditions.'),
  M('GSD', 'Glycemic Status Assessment for Patients With Diabetes', 55, 61, 10400, 'Diabetic members whose glycemic status was assessed and in range.'),
  M('HBD', 'Hemoglobin A1c Control for Patients With Diabetes', 61, 59, 9900, 'Diabetic members whose most recent HbA1c is in control.'),
  M('IET', 'Initiation and Engagement of Substance Use Disorder Treatment', 13, 18, 6200, 'Members who initiated and then engaged in SUD treatment.'),
  M('KED', 'Kidney Health Evaluation for Patients With Diabetes', 36, 42, 8900, 'Diabetic members with both an eGFR and a uACR in the year.'),
  M('PPC', 'Prenatal and Postpartum Care', 78, 82, 2300, 'Pregnant members receiving timely prenatal and postpartum care.'),
  M('SAA', 'Adherence to Antipsychotic Medications for Individuals With Schizophrenia', 62, 66, 1400, 'Members with schizophrenia adherent to their antipsychotic medication.'),
  M('SMD', 'Diabetes Screening for People With Schizophrenia or Bipolar Disorder Using Antipsychotic Medications', 83, 79, 1650, 'Members on antipsychotics screened for diabetes.'),
  M('SSD', 'Diabetes Monitoring for People With Diabetes and Schizophrenia', 57, 64, 780, 'Members with both diabetes and schizophrenia receiving diabetes monitoring.'),
  M('TBC', 'Tobacco Use Screening and Cessation Intervention', 71, 76, 22500, 'Members screened for tobacco use and offered a cessation intervention.'),
  M('WCC', 'Well-Child Visits in the First 30 Months of Life', 59, 65, 3400, 'Infants and toddlers with the recommended well-child visits.'),
  M('WCV', 'Child and Adolescent Well-Care Visits', 46, 52, 16800, 'Children and adolescents with at least one well-care visit.'),

  // ── ECDS / URU — placeholders until those sheets are supplied ────────────
  M('IMA', 'Immunizations for Adolescents', 51, 60, 4100, 'Adolescents who received recommended immunizations by age 13.'),
  M('CIS', 'Childhood Immunization Status', 78, 68, 3600, 'Children who received recommended immunizations by age 2.'),
  M('CHL', 'Chlamydia Screening in Women', 81, 70, 5200, 'Sexually active women screened for chlamydia during the year.'),
  M('FVA', 'Flu Vaccinations for Adults', 83, 70, 24000, 'Adults who received an influenza vaccination.'),
  M('W30', 'Well-Child Visits — First 30 Months', 76, 66, 2900, 'Infants with the recommended well-child visits in 30 months.'),
  M('PCE', 'COPD — Pharmacotherapy Management', 79, 69, 2050, 'COPD members on appropriate pharmacotherapy.'),
  M('AMR', 'Asthma Medication Ratio — Rural cohort', 55, 63, 3800, 'Rural members with persistent asthma holding an acceptable ratio.'),
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
    if (gap <= -0.5) { signals.push({ k: 'Gap', v: `${pts(Math.abs(gap))} below the ${goal}% goal.` }); stance = `${pts(Math.abs(gap))} below goal`; }
    else if (gap < 2) { signals.push({ k: 'Gap', v: `Holding right at the ${goal}% goal.` }); stance = 'at goal'; }
    else { signals.push({ k: 'Gap', v: `${pts(gap)} above the ${goal}% goal.` }); stance = `${pts(gap)} above goal`; }
  }

  // Direction of travel, first vs. last point of the trend series.
  let motion = '';
  if (trend && trend.length >= 2) {
    const first = num(trend[0].rate);
    const last = num(trend[trend.length - 1].rate);
    const delta = Math.round((last - first) * 10) / 10;
    const months = trend.length;
    if (delta <= -1) { signals.push({ k: 'Trend', v: `Down ${pts(Math.abs(delta))} over the last ${months} months — still sliding.` }); motion = 'and still sliding'; }
    else if (delta >= 1) { signals.push({ k: 'Trend', v: `Up ${pts(delta)} over the last ${months} months — recovering.` }); motion = 'but recovering'; }
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
const MEASURE_WEIGHT = { FUA: 3, FUH: 3, FUM: 3, FUI: 3, IET: 2, SAA: 2, SSD: 2, SMD: 2, AMM: 2, ADD: 2 };

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
  { k: 'Gap', v: `${pts(s.gap)} below goal` },
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
      v: `${shortId(lead.measure_id)} — ${pts(Math.abs(leadGap))} ${above ? 'ahead of' : 'under'} its ${num(lead.goal_50th)}% target.`,
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
  // Not "holding at goal": the band runs a point under to two over, so some of
  // these are already under it. They're on the line, which is the reason the tab
  // is a watch list rather than a result.
  else synthesis = `${n} of ${total} measures sit on the edge of goal — inside the noise, either way.`;

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
    if (gap <= -0.5) signals.push({ k: 'Gap', v: `${pts(Math.abs(gap))} below the ${goal}% goal.` });
    else if (gap < 2) signals.push({ k: 'Gap', v: `Holding right at the ${goal}% goal.` });
    else signals.push({ k: 'Gap', v: `${pts(gap)} above the ${goal}% goal.` });
  }
  if (n >= 2 && rank) {
    const place = rank === 1 ? 'the furthest behind' : rank === n ? 'the strongest' : 'mid-pack';
    signals.push({ k: 'Standing', v: `${ordinal(rank)} of ${n} ${dim} groups — ${place}.` });
    signals.push({ k: 'Spread', v: `${pts(spread)} between ${worst.group} (${num(worst.rate)}%) and ${best.group} (${num(best.rate)}%).` });
  }

  const disparity = rank === 1 && n >= 2 && gap < 0;
  // No group prefix: the only surface for this read is the worklist header card,
  // whose title is already the group. "6 - 17 is 16 pts below goal" under a "6 - 17"
  // heading just says it twice.
  const synthesis = goal > 0
    ? `${pts(Math.abs(gap))} ${gap < -0.5 ? 'below' : gap >= 2 ? 'above' : 'at'} goal${disparity ? ' — the widest disparity in this group' : ''}.`
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
    if (gap <= -0.5) signals.push({ k: 'Gap', v: `${pts(Math.abs(gap))} below the ${goal}% goal.` });
    else if (gap < 2) signals.push({ k: 'Gap', v: `Holding right at the ${goal}% goal.` });
    else signals.push({ k: 'Gap', v: `${pts(gap)} above the ${goal}% goal.` });
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
  if (goal > 0 && gap < 0) {
    const need = neededToGoal(measure);
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
      v: `${worst.group} at ${num(worst.rate)}%${wGap < 0 ? ` — ${pts(Math.abs(wGap))} under goal` : ''} · network-wide ${DIM_LABEL[worst.type]} cut.`,
    });
  }

  const stance = goal > 0
    ? `${pts(Math.abs(gap))} ${gap < -0.5 ? 'below' : gap >= 2 ? 'above' : 'at'} goal ${who}`
    : `${rate}% ${who}`;
  const synthesis = open > 0
    ? `${stance} — ${open.toLocaleString()} ${open === 1 ? 'member' : 'members'} still open on this list.`
    : `${stance}.`;

  // Confidence rides the eligible population, same as the measure-level read.
  // (This used a local `denom` that the neededToGoal extraction removed; it's
  // the measure's denominator, so read it straight.)
  const denom = num(measure?.denominator);
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

// ── Intervention assignments (local mock) ────────────────────
// There is no assignments API yet (saveCareAction is a stub), so assignments are
// persisted to localStorage. Each record is self-describing so this can be
// swapped for a server store without touching the UI. The Intervention Tracking
// screen and the "action taken" chips both read from here.
//
// `target` is EITHER a predicate over the population OR an explicit member set:
//   { kind: 'population' }                        — every non-compliant member in scope
//   { kind: 'stratum', strata: [{type, group}] }  — an age/race/ethnicity band (a predicate)
//   { kind: 'members', memberIds: [], label }     — a hand-picked subset
// The distinction is what makes the assignment scenarios work: a predicate keeps
// matching members who enter the population later (so a new arrival shows up as
// "newly eligible" under an existing play), while an explicit set never grows.
const ASSIGN_KEY = 'qp_v2_assignments';
export const ASSIGNMENTS_EVENT = 'qp-assignments-changed';
export const ASSIGN_STATUSES = ['assigned', 'in_progress', 'action_taken', 'closed'];
export const ASSIGN_STATUS_LABEL = {
  assigned: 'Assigned', in_progress: 'In progress', action_taken: 'Action taken', closed: 'Closed',
};

const readAssignments = () => { try { return JSON.parse(localStorage.getItem(ASSIGN_KEY) || '[]'); } catch { return []; } };
// Broadcast on write so any mounted chip / tracking view re-reads without prop
// plumbing across the tree. The `storage` event only fires cross-tab, so this
// synthetic one covers same-tab changes.
const writeAssignments = (list) => {
  try {
    localStorage.setItem(ASSIGN_KEY, JSON.stringify(list));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ASSIGNMENTS_EVENT));
  } catch { /* storage off */ }
};
let assignSeq = 0;
const newAssignId = () => `a_${Date.now().toString(36)}_${(assignSeq += 1)}`;

// A stable identity for a scope so an assign button can find "its" record on a
// later visit. Strata/ids are sorted so order never changes the key.
export const assignmentScopeKey = ({ measureId, crsp = null, target = null }) => {
  const t = target || {};
  const strata = (t.strata || []).map((x) => `${x.type}:${x.group}`).sort().join('+');
  const ids = t.memberIds ? `#${[...t.memberIds].sort().join(',')}` : '';
  return `${measureId}|${crsp || '*'}|${t.kind || 'population'}|${strata}|${ids}`;
};

// Newest first, so the tracking board and chips read the latest play first.
export const listAssignments = () => readAssignments().sort((a, b) => b.createdAt - a.createdAt);

export const addAssignment = (rec) => {
  const list = readAssignments();
  const full = {
    id: newAssignId(),
    status: 'assigned',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    scopeKey: assignmentScopeKey(rec),
    ...rec,
  };
  list.push(full);
  writeAssignments(list);
  return full;
};

export const updateAssignment = (id, patch) => {
  const list = readAssignments();
  const i = list.findIndex((a) => a.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch, updatedAt: Date.now() };
  writeAssignments(list);
  return list[i];
};

export const removeAssignment = (id) => {
  writeAssignments(readAssignments().filter((a) => a.id !== id));
};

// Active (not closed) assignments for a measure — the basis for the "action
// taken" chip and the dedup/newly-eligible read on the assign panel.
export const activeAssignmentsForMeasure = (measureId) =>
  listAssignments().filter((a) => a.measureId === measureId && a.status !== 'closed');

// Does a member's age fall in a stratum band like "6 - 17" or "65+"?
const ageInBand = (age, band) => {
  const n = num(age);
  if (!band) return false;
  const plus = /(\d+)\s*\+/.exec(band);
  if (plus) return n >= num(plus[1]);
  const range = /(\d+)\s*-\s*(\d+)/.exec(band);
  if (range) return n >= num(range[1]) && n <= num(range[2]);
  return false;
};

// Which active plays already cover this member? This is the per-member resolution
// of the same coverage the assign panel rolls up into its "will be skipped" count.
//   • members target  — exact memberId match (a hand-picked or single-row assign)
//   • population/stratum — a predicate: it covers any open-gap member in the play's
//     scope (crsp; plus the age band when the stratum is an age band). Race/eth
//     bands aren't carried on a member row, so those match on scope alone.
// A compliant member has no open gap, so predicate plays never claim them; an
// explicit member-set play still shows (someone deliberately queued them).
// Returns the covering plays, newest first (listAssignments already sorts).
export const activePlaysForMember = (member, measureId, scopeCrsp = null) => {
  if (!member || !measureId) return [];
  const crsp = member.crsp && member.crsp !== '—' ? member.crsp : (scopeCrsp || null);
  return activeAssignmentsForMeasure(measureId).filter((a) => {
    const t = a.target || {};
    if (t.kind === 'members') return (t.memberIds || []).includes(member.memberId);
    if (member.compliant) return false;
    if (a.crsp && crsp && a.crsp !== crsp) return false;
    if (t.kind === 'stratum') {
      const ageBand = (t.strata || []).find((s) => s.type === 'age');
      if (ageBand) return ageInBand(member.age, ageBand.group);
    }
    return true;
  });
};

// ── Custom goals (local mock) ────────────────────────────────
// A user-defined goal per measure. When set, it REPLACES the 50th-percentile
// benchmark as the working target everywhere — `withCustomGoals` rewrites the
// grid's goal_50th and recomputes kpi_status against it, so every downstream
// read (status band, tone, gap, bars, KPIs) follows one number. The Goal
// definition screen edits this store; the benchmark is kept separately there so
// it can still be shown alongside. Stored as { measureId: goalNumber }.
const GOALS_KEY = 'qp_v2_goals';
export const GOALS_EVENT = 'qp-goals-changed';
export const readGoals = () => { try { return JSON.parse(localStorage.getItem(GOALS_KEY) || '{}'); } catch { return {}; } };
const writeGoals = (map) => {
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(map));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(GOALS_EVENT));
  } catch { /* storage off */ }
};

export const getMeasureGoal = (measureId) => {
  const v = readGoals()[measureId];
  return typeof v === 'number' ? v : null;
};

// Passing null (or a non-finite value) clears the custom goal, reverting the
// measure to its benchmark.
export const setMeasureGoal = (measureId, value) => {
  const map = readGoals();
  const n = Number(value);
  if (value == null || value === '' || !Number.isFinite(n)) delete map[measureId];
  else map[measureId] = Math.min(100, Math.max(0, Math.round(n * 10) / 10));
  writeGoals(map);
  return map[measureId] ?? null;
};

export const clearAllGoals = () => writeGoals({});
export const customGoalCount = () => Object.keys(readGoals()).length;

// Rewrite a measures grid so custom goals win. Recomputes kpi_status against the
// effective goal (the band has to move with the target) and flags the row so the
// UI can mark measures judged against a custom goal rather than the benchmark.
// Preserves the untouched benchmark on `_benchmarkGoal` for any surface that
// wants to show both. A no-op (same array) when no goals are set.
export const withCustomGoals = (grid) => {
  const goals = readGoals();
  if (!grid || !grid.length || !Object.keys(goals).length) return grid;
  return grid.map((m) => {
    const g = goals[m.measure_id];
    if (typeof g !== 'number') return m;
    return {
      ...m,
      _benchmarkGoal: num(m.goal_50th),
      goal_50th: g,
      kpi_status: statusFor(num(m.rate), g),
      _customGoal: true,
    };
  });
};

// Best-available "previous year" rate. There is no real prior-year feed (only a
// month-over-month trend), so this derives a stable, plausible MY-2025 value per
// measure — a small deterministic offset from the current rate. Every surface
// that shows it labels it as indicative. Swap for a real endpoint when one lands.
export const priorYearRate = (measureId, currentRate) => {
  const base = num(currentRate);
  const key = String(measureId || '');
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const delta = (h % 13) - 6; // −6..+6 pts, stable per measure
  return Math.min(100, Math.max(0, Math.round((base - delta) * 10) / 10));
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

// The provider directory has no provider-by-stratum-by-measure endpoint. This
// stable portfolio signal therefore models where repeated underperformance is
// most likely concentrated from the provider's own below-goal profile. It is
// explicitly labelled as a portfolio signal in the UI and is used to give the
// reader a consistent drill/action target until a live cross-measure equity feed
// is available.
const PROVIDER_STRATA = [
  { type: 'age', label: 'Age', groups: ['6 - 17', '18 - 34', '35 - 49', '50 - 64', '65+'] },
  { type: 'race', label: 'Race', groups: ['Black or African American', 'Asian', 'Arab American', 'White', 'Other'] },
  { type: 'ethnicity', label: 'Ethnicity', groups: ['Hispanic / Latino', 'Not Hispanic / Latino', 'Unknown'] },
];

export const providerCriticalStratification = (providerName, profile) => {
  const below = (profile || [])
    .filter((m) => statusFor(m.rate, m.goal_50th) === 'Below Goal')
    .sort((a, b) => (num(a.rate) - num(a.goal_50th)) - (num(b.rate) - num(b.goal_50th)));
  if (!below.length) return null;

  const hash = hashStr(`${providerName}|critical-stratification`);
  const dimension = PROVIDER_STRATA[hash % PROVIDER_STRATA.length];
  const group = dimension.groups[Math.floor(hash / PROVIDER_STRATA.length) % dimension.groups.length];
  const share = 0.45 + ((hash % 31) / 100);
  const affectedMeasures = Math.max(1, Math.min(below.length, Math.round(below.length * share)));
  const affected = below.slice(0, affectedMeasures);
  const avgGap = Math.round((affected.reduce((sum, m) => sum + (num(m.rate) - num(m.goal_50th)), 0) / affected.length) * 10) / 10;
  const lead = affected[0];
  const groupRate = Math.max(0, Math.round((num(lead.rate) - 5 - (hash % 5)) * 10) / 10);
  const notMeeting = Math.max(1, Math.round(num(lead.denominator) * (1 - groupRate / 100) * 0.32));

  return {
    type: dimension.type,
    dim: dimension.type,
    dimLabel: dimension.label,
    group,
    affectedMeasures,
    totalBelow: below.length,
    avgGap,
    rate: groupRate,
    goal: num(lead.goal_50th),
    notMeeting,
    measure: lead,
    severity: affectedMeasures >= Math.max(3, Math.ceil(below.length / 2)) ? 'critical' : 'watch',
  };
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
  const breadth = `${summary.below} of ${summary.total} measures below goal · avg ${pts(Math.abs(summary.avgGap))} ${gapWord}.`;
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

// Which age band an age falls in — keeps sample rows consistent with AGE_GROUPS
// so a stratum filter over the sample matches the same bands the equity list shows.
export const ageBandOf = (age) => {
  if (age <= 17) return '6 - 17';
  if (age <= 34) return '18 - 34';
  if (age <= 49) return '35 - 49';
  if (age <= 64) return '50 - 64';
  return '65+';
};

export const sampleMembers = (count = 18, crsp) =>
  Array.from({ length: count }).map((_, i) => {
    const open = i % 3 === 0; // ~1/3 non-compliant (open care gap)
    const age = 24 + ((i * 7) % 45);
    return {
      memberId: String(10000000 + i * 137911).padStart(10, '0').slice(0, 10),
      memberName: `${LAST[i % LAST.length]}, ${FIRST[i % FIRST.length]}`,
      dob: '01/30/1994',
      age,
      crsp: crsp || CRSP_NAMES[i % CRSP_NAMES.length],
      serviceDate: open ? '-' : `0${1 + (i % 9)}/${10 + (i % 18)}/2026`,
      source: open ? '-' : SOURCES[i % 2],
      compliant: !open,
      priority: open ? 'Open gap' : 'Complaint',
      // Deterministic demographics so a stratum filter returns a real subset,
      // not the whole pool. Strides differ per dimension so groups don't line up.
      race: RACE_GROUPS[i % RACE_GROUPS.length],
      ethnicity: ETH_GROUPS[(i * 2) % ETH_GROUPS.length],
      ageBand: ageBandOf(age),
    };
  });

// Does a sample member fall in a given equity group (age / race / ethnicity)?
export const memberInStratum = (m, st) => {
  if (!st) return true;
  if (st.dim === 'age') return (m.ageBand || ageBandOf(m.age)) === st.group;
  if (st.dim === 'race') return m.race === st.group;
  if (st.dim === 'ethnicity') return m.ethnicity === st.group;
  return true;
};

// Sample roster narrowed to the selected strata. Multiple groups union — a member
// counts if they match ANY selected group — matching how the assign panel estimates
// cross-group reach. No strata → the whole scope roster.
export const sampleMembersForStrata = (strata, crsp, count = 30) => {
  const pool = sampleMembers(count, crsp);
  if (!strata || strata.length === 0) return pool;
  return pool.filter((m) => strata.some((st) => memberInStratum(m, st)));
};

// Sample care staff + intervention types for the assignment flow.
export const STAFF = ['Maria Chen, RN', 'James Okafor', 'Priya Patel, CHW', 'David Kim', 'Aisha Rahman, RN'];
export const INTERVENTIONS = ['Outreach call', 'Schedule appointment', 'Send reminder letter', 'Refer to care manager', 'Telehealth follow-up'];
