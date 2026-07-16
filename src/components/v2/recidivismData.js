// ── Sample data for the two ported flows ─────────────────────────────
// Outcome Analysis (recidivism-prevention impact) and the Inpatient
// Tracking board (risk stratification → intervention assignment).
//
// The current backend has no recidivism / inpatient endpoints, so both
// pages run on deterministic sample data — same convention the rest of v2
// uses for its sample fallback. Numbers are reconstructed from the source
// product but made internally consistent (savings sum to the total, QoQ
// deltas actually derive from the quarter series) and ordered
// chronologically (Q1 → Q2 → Q3) rather than the source's shuffled order.

// Deterministic integer mix (mulberry-style) — scatters consecutive seeds so
// member rows look varied but stay stable across renders (no Math.random).
// Returns a well-distributed unsigned 32-bit int.
const mix = (n) => {
  let x = (n + 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
};

// ── Outcome Analysis ─────────────────────────────────────────────────

// Quarter series (chronological). Members prevented trends up; savings peak
// mid-year then dip slightly — which is what drives the QoQ deltas below.
export const OUTCOME_QUARTERS = [
  { q: '2026-Q1', prevented: 71, savings: 8.99, recidivists: 9 },
  { q: '2026-Q2', prevented: 113, savings: 22.24, recidivists: 8 },
  { q: '2026-Q3', prevented: 155, savings: 21.96, recidivists: 0 },
];

const sum = (arr, k) => arr.reduce((a, b) => a + b[k], 0);
const pctChange = (cur, prev) => (prev === 0 ? 0 : ((cur - prev) / prev) * 100);

export const outcomeKpis = () => {
  const qs = OUTCOME_QUARTERS;
  const cur = qs[qs.length - 1];
  const prev = qs[qs.length - 2];
  return {
    preventedFytd: sum(qs, 'prevented'),
    preventedCur: cur.prevented,
    preventedPrev: prev.prevented,
    preventedQoQ: pctChange(cur.prevented, prev.prevented),
    savingsFytd: sum(qs, 'savings'),
    savingsCur: cur.savings,
    savingsPrev: prev.savings,
    savingsQoQ: pctChange(cur.savings, prev.savings),
    currentQuarter: cur.q,
  };
};

// Missed opportunities — interventions that should have fired but didn't.
export const MISSED_KPIS = {
  count: 19,
  recidivistMembers: 0,
  cost: 9.71, // $M
};

export const MISSED_BY_INTERVENTION = [
  { name: 'Housing First & Supportive Housing', total: 263, recidivists: 0 },
  { name: 'Med Drop – Modifier PH', total: 252, recidivists: 0 },
  { name: 'Supported Employment', total: 251, recidivists: 1 },
  { name: 'Behavioral Health Home', total: 221, recidivists: 0 },
  { name: 'SUD Health Home', total: 221, recidivists: 0 },
  { name: 'Assertive Community Treatment (ACT)', total: 176, recidivists: 0 },
  { name: 'E&M visits, Bundled Authorization only', total: 162, recidivists: 0 },
  { name: 'Psychotherapy, Bundled Authorization', total: 129, recidivists: 0 },
  { name: 'Transitional Discharge Model (TDM)', total: 95, recidivists: 0 },
  { name: 'Psychiatric Eval – Bundle for 90791 & 90792', total: 90, recidivists: 0 },
  { name: 'Assessment – Developmental screening', total: 83, recidivists: 0 },
  { name: 'Self Help / Peer Services', total: 54, recidivists: 0 },
  { name: 'Recovery Supports', total: 53, recidivists: 0 },
];

export const MISSED_BY_STAKEHOLDER = [
  { name: 'TEAM MENTAL HEALTH SERVICES, INC.', total: 2180, recidivists: 17 },
  { name: 'CENTRAL CITY INTEGRATED HEALTH (CCIH)', total: 870, recidivists: 0 },
  { name: 'HEGIRA HEALTH, INC.', total: 715, recidivists: 0 },
  { name: 'LINCOLN BEHAVIORAL SERVICES INC.', total: 603, recidivists: 0 },
  { name: '1053 MORAN', total: 503, recidivists: 0 },
  { name: 'NEIGHBORHOOD SERVICE ORGANIZATION', total: 403, recidivists: 0 },
  { name: 'DEVELOPMENT CENTERS, INC.', total: 158, recidivists: 0 },
  { name: 'DWIHN OUTPATIENT CLINIC – 707', total: 143, recidivists: 0 },
  { name: 'PSYGENICS, INC.', total: 129, recidivists: 0 },
];

// ── Inpatient Tracking board ─────────────────────────────────────────

// Donut breakdowns of the inpatient population. Each slice carries its own
// tone token so charts and legends stay in sync.
export const TRACK_DONUTS = {
  risk: {
    title: 'Members by Risk Level',
    slices: [
      { label: 'High', value: 195, tone: 'below' },
      { label: 'Medium', value: 1416, tone: 'warn' },
      { label: 'Low', value: 3043, tone: 'above' },
    ],
  },
  disability: {
    title: 'Members by Disability',
    slices: [
      { label: 'SMI', value: 3870, tone: 'v1' },
      { label: 'SED', value: 592, tone: 'v2' },
      { label: 'I/DD', value: 118, tone: 'v3' },
      { label: 'SUD', value: 74, tone: 'v4' },
    ],
  },
  assessment: {
    title: 'Assessment Status',
    slices: [
      { label: 'Not Assessed', value: 2932, tone: 'v5' },
      { label: 'Yes', value: 1214, tone: 'v1' },
      { label: 'No', value: 508, tone: 'v3' },
    ],
  },
  ethnicity: {
    title: 'Members by Ethnicity',
    slices: [
      { label: 'African American', value: 2759, tone: 'v1' },
      { label: 'White', value: 1266, tone: 'v2' },
      { label: 'Unknown Race', value: 439, tone: 'v3' },
      { label: 'Arab American', value: 128, tone: 'v4' },
      { label: 'Asian', value: 38, tone: 'v5' },
    ],
  },
  gender: {
    title: 'Members by Gender',
    slices: [
      { label: 'Male', value: 2141, tone: 'v1' },
      { label: 'Female', value: 1660, tone: 'v2' },
      { label: 'Unknown', value: 852, tone: 'v3' },
    ],
  },
  age: {
    title: 'Members by Age Group',
    slices: [
      { label: '0–17', value: 131, tone: 'v5' },
      { label: '18–25', value: 497, tone: 'v4' },
      { label: '26–39', value: 1748, tone: 'v1' },
      { label: '40–49', value: 888, tone: 'v2' },
      { label: '50–64', value: 687, tone: 'v3' },
      { label: '65+', value: 650, tone: 'v4' },
    ],
  },
};

const FIRST = ['Sheryl', 'Myron', 'Savanna', 'Shaun', 'Naomi', 'Marcus', 'Aisha', 'Darnell', 'Lena', 'Omar', 'Grace', 'Tariq', 'Renee', 'Victor', 'Camille', 'Elijah', 'Priya', 'Hassan', 'Denise', 'Andre'];
const LAST = ['Wakefield', 'Bannerman', 'Brantley', 'Green', 'Reedus', 'Holloway', 'Okafor', 'Vance', 'Castillo', 'Whitfield', 'Nakamura', 'Ellison', 'Dupree', 'Salazar', 'Mensah', 'Rourke', 'Abbas', 'Coleman', 'Igwe', 'Farrow'];
const ETHNICITIES = ['African American', 'White', 'Arab American', 'Asian', 'Unknown Race'];
const DISABILITY = ['SMI', 'SED', 'I/DD', 'SUD'];
const SUD_STATUS = ['YES', 'NOT ASSESSED', 'NO'];
const LOCUS = ['Level 1', 'Level 2', 'Level 3', 'Level 4'];

// Risk mix weighted toward High at the top of the worklist (that's the whole
// point of an AI-ranked list — the urgent ones surface first).
const riskFor = (i, total) => {
  const frac = i / total;
  if (frac < 0.45) return 'High';
  if (frac < 0.78) return 'Medium';
  return 'Low';
};

export const sampleInpatientMembers = (count = 47) =>
  Array.from({ length: count }).map((_, i) => {
    // Draw each field from an independent mixed stream so nothing correlates.
    const h0 = mix(i);
    const h1 = mix(i * 2 + 101);
    const h2 = mix(i * 3 + 202);
    const genderRoll = h1 % 10;
    return {
      id: 1100000 + (mix(i * 5 + 7) % 899999),
      name: `${FIRST[h0 % FIRST.length]} ${LAST[h1 % LAST.length]}`.toUpperCase(),
      risk: riskFor(i, count),
      age: 18 + (h0 % 52),
      ethnicity: ETHNICITIES[h2 % ETHNICITIES.length],
      gender: genderRoll < 5 ? 'M' : genderRoll < 9 ? 'F' : 'Unk',
      primaryDisability: DISABILITY[(h0 >>> 4) % DISABILITY.length],
      secondaryDisability: h2 % 3 === 0 ? DISABILITY[(h2 >>> 4) % DISABILITY.length] : 'N/A',
      sud: SUD_STATUS[(h1 >>> 4) % SUD_STATUS.length],
      locus: LOCUS[(h2 >>> 8) % LOCUS.length],
      // For the drill-down profile.
      recommended: RECOMMENDED[(h0 >>> 8) % RECOMMENDED.length],
      lastAdmission: `2026-0${1 + (h1 % 6)}-${String(1 + (h2 % 27)).padStart(2, '0')}`,
      admissions12mo: 1 + (h0 % 5),
    };
  });

const RECOMMENDED = [
  'Transitional Discharge Model (TDM)',
  'Assertive Community Treatment (ACT)',
  'Behavioral Health Home',
  'Housing First & Supportive Housing',
  'Supported Employment',
  'SUD Health Home',
];

export const RISK_TONE = { High: 'below', Medium: 'warn', Low: 'above' };
