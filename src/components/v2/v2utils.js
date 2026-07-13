// Shared helpers + sample fallbacks for the v2 Quality Scorecard flow.
// Styling/status semantics reuse the app's existing Direction A tokens.

export const STATUS_TONE = {
  'Below Goal': 'below',
  'At Goal': 'at',
  'Above Goal': 'above',
};

export const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const shortId = (id) => (id || '').replace(/_/g, ' ');

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
  return { measure_id, display_name, rate, goal_50th, kpi_status, numerator, denominator, measure_definition: def };
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
