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
];

export const sampleCrsps = () =>
  SAMPLE_MEASURES.filter((m) => m.kpi_status === 'Below Goal')
    .slice(0, 6)
    .map((m, i) => ({ measure_id: m.measure_id, crsp_name: CRSP_NAMES[i % CRSP_NAMES.length], rate: Math.max(30, m.rate - 6) }));

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
