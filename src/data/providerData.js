// Provider-portal data layer. Reuses the same local assignment store the staff
// side reads/writes (v2utils' `qp_v2_assignments`) so an intervention a
// provider closes out shows up immediately in the staff Care Action Center —
// there is one store, two audiences. Provider "identity" and performance are
// both demo-grade and deterministic (no NPI roster / provider-auth endpoint
// exists yet), following the same pattern v2utils already uses for CRSP
// names and rates (see `providerProfile`, `sampleProviderNames`).
import {
  SAMPLE_MEASURES, sampleProviderNames, sampleMembers, providerProfile, providerSummary, providerIntel,
  listAssignments, addAssignment, updateAssignment, removeAssignment, ASSIGN_STATUSES, ASSIGN_STATUS_LABEL,
  statusFor, num,
} from '../components/v2/v2utils';

const SESSION_KEY = 'qp_provider_session';

const hashStr = (s) => { let h = 0; for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

// Deterministic NPI → provider identity, same demo-grade approach as the rest
// of the sample data layer: stable across logins, distinct per NPI.
export const resolveProviderIdentity = (npi) => {
  const names = sampleProviderNames();
  const providerName = names[hashStr(npi) % names.length];
  const practiceId = `PRV-${npi.slice(0, 4)}-${npi.slice(4)}`;
  return { npi, providerName, practiceId };
};

export const getProviderSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setProviderSession = (identity) => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...identity, loginAt: Date.now() }));
  } catch { /* storage off */ }
};

export const clearProviderSession = () => {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* storage off */ }
};

// ── Performance (rate vs goal per measure this provider supports) ──────────
export const getProviderProfile = (providerName) => providerProfile(providerName, false, SAMPLE_MEASURES);
export const getProviderSummary = (profile) => providerSummary(profile);
export const getProviderIntel = (profile) => providerIntel(profile);

// ── Interventions assigned to this provider ─────────────────────────────────
// Scoped strictly to this provider's CRSP: either the sole scope (`crsp`) or
// explicitly included in a multi-provider assignment (`providers`). Network-
// wide plays (no crsp) aren't a specific provider's inbox item.
export const getProviderInterventions = (providerName) =>
  listAssignments().filter((a) => a.crsp === providerName || (a.providers || []).includes(providerName));

export const isOverdue = (a) => {
  if (!a.due || a.status === 'closed' || a.status === 'action_taken') return false;
  return a.due < new Date().toISOString().slice(0, 10);
};

const STATUS_TONE_PV = { assigned: 'info', in_progress: 'warn', action_taken: 'success', closed: 'neutral' };
export const interventionStatusMeta = (a) => {
  if (isOverdue(a)) return { label: 'Overdue', tone: 'error' };
  return { label: ASSIGN_STATUS_LABEL[a.status] || a.status, tone: STATUS_TONE_PV[a.status] || 'neutral' };
};

export const interventionLabel = (a) =>
  (a.interventions && a.interventions.length ? a.interventions.join(', ') : a.intervention) || 'Outreach';

// ── Dates on the intervention ───────────────────────────────────────────────
// Providers reason in "how long have I got", not ISO strings. The clock runs
// from *today* to the due date — not from the assigned date — so a row that sat
// untouched for a month reads as more urgent, which is the point.
export const MS_DAY = 86400000;
export const daysUntilDue = (a) => {
  if (!a.due) return null;
  const today = new Date().toISOString().slice(0, 10);
  return Math.round((Date.parse(`${a.due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / MS_DAY);
};
export const assignedDate = (a) => (a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : null);
// MM-DD-YYYY — the format the care-management tools these providers already use
// put on every intervention record.
export const fmtDate = (isoDate) => {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-');
  return `${m}-${d}-${y}`;
};

// ── Provider-facing disposition ─────────────────────────────────────────────
// A provider records what happened in their own terms; each choice maps onto
// the shared assignment status the staff app already reads, so the two sides
// stay in sync without staff learning a second vocabulary. `disposition` is
// stored alongside so the provider's literal answer survives the mapping
// (accepted and delivered are distinct acts even where staff see one status).
export const DISPOSITIONS = [
  { key: 'accepted', label: 'Intervention Accepted', status: 'in_progress' },
  { key: 'delivered', label: 'Intervention Delivered', status: 'action_taken' },
  { key: 'rejected', label: 'Intervention Rejected', status: 'closed' },
];
export const dispositionFor = (a) =>
  a.disposition || (DISPOSITIONS.find((d) => d.status === a.status) || {}).key || '';

// Billable codes a provider can attach when documenting delivery, keyed by
// intervention type. A sample coding reference for the demo — not a
// billing-grade catalog, and deliberately short so the picker stays scannable.
const CPT_CODES = {
  'Outreach call': ['98966', '98967', '98968', '99441'],
  'Schedule appointment': ['99401', '99402', '99429'],
  'Send reminder letter': ['99490', '98961', '99484'],
  'Refer to care manager': ['T1017', 'T1016', '99484'],
  'Telehealth follow-up': ['99421', '99422', '99423', '99457'],
};
export const cptCodesFor = (a) => CPT_CODES[interventionLabel(a).split(', ')[0]] || ['99401', '99402'];

// The member this intervention is actually for — care happens to a person,
// not a population, so every provider-portal surface reads through this
// rather than the generic (population/stratum/crsp) scope label.
export const interventionMember = (a) => a.member || null;

// Advance/close an intervention and log the note as an append-only outreach
// entry — additive to the shared record, so staff-side views (which don't
// know about `outreachLog`) keep working unmodified.
export const logProviderOutreach = (assignment, { status, note, disposition, cpt }) => {
  const entry = { at: Date.now(), note: note || '', status, disposition, cpt: cpt || [] };
  const log = [...(assignment.outreachLog || []), entry];
  const patch = { status, outreachLog: log };
  if (disposition) patch.disposition = disposition;
  if (cpt) patch.cpt = cpt;
  return updateAssignment(assignment.id, patch);
};

export { ASSIGN_STATUSES, ASSIGN_STATUS_LABEL, statusFor, num, addAssignment };

// ── Demo seeding ─────────────────────────────────────────────────────────
// A brand-new provider's inbox is otherwise empty (nothing has been assigned
// to their exact CRSP name yet in the shared store). Seed a small, varied set
// once so the portal is immediately demonstrable — mirrors how OverviewExplore
// falls back to SAMPLE_MEASURES when the live grid is unavailable.
const iso = (daysFromNow) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};

// Bumped whenever the shape of a seeded row changes, so a browser holding an
// older localStorage seed re-seeds instead of rendering a half-migrated inbox.
const SEED_VERSION = 3;

export const seedDemoInterventions = (providerName) => {
  const existing = getProviderInterventions(providerName);
  // Already seeded at the current shape — leave it alone.
  if (existing.length > 0 && existing.every((a) => a.member && a.seedVersion === SEED_VERSION)) return;
  // Anything here predates member-level targeting (localStorage carried over
  // from before this change, shaped like `{ target: { kind: 'population' } }`
  // with no `member`) — replace it with a proper member-level seed rather
  // than leaving stale population-scoped demo rows mixed in.
  existing.forEach((a) => removeAssignment(a.id));

  const below = SAMPLE_MEASURES.filter((m) => statusFor(m.rate, m.goal_50th) === 'Below Goal');
  const pickMeasure = (i) => below[(hashStr(providerName) + i * 7) % below.length];

  // Every intervention targets exactly one named member with an open gap —
  // that member is who the provider actually has to call/schedule/follow up
  // with, not "the population." A different, deterministic slice of the
  // sample roster per provider so two providers don't see identical inboxes.
  const openGapPool = sampleMembers(30, providerName).filter((m) => !m.compliant);
  const offset = hashStr(providerName) % openGapPool.length;
  const pickMember = (i) => openGapPool[(offset + i * 3) % openGapPool.length];

  // `memberIdx` deliberately reuses an earlier member so some people carry gaps
  // in several measures at once — that overlap is the whole point of the home
  // page's member-grouped queue, and a seed of five unique members would make
  // every row read "1 measure."
  const plan = [
    { status: 'assigned', due: iso(-3), intervention: 'Outreach call', why: 'Member is overdue for screening this cycle — reach out to schedule.' },
    { status: 'in_progress', due: iso(4), intervention: 'Schedule appointment', why: 'Care manager is coordinating a visit slot with this member.' },
    { status: 'assigned', due: iso(9), intervention: 'Send reminder letter', why: 'Reminder queued for this member’s open gap.' },
    { status: 'action_taken', due: iso(-10), intervention: 'Telehealth follow-up', why: 'Follow-up visit completed for this member, awaiting claim.' },
    { status: 'assigned', due: iso(2), intervention: 'Refer to care manager', why: 'Member flagged for care-management outreach.' },
    { status: 'assigned', due: iso(6), intervention: 'Outreach call', why: 'Second open gap for this member — bundle it into the same call.', memberIdx: 1 },
    { status: 'assigned', due: iso(11), intervention: 'Schedule appointment', why: 'Third open gap for this member — one visit can close several.', memberIdx: 1 },
    { status: 'assigned', due: iso(8), intervention: 'Send reminder letter', why: 'Second open gap for this member.', memberIdx: 2 },
    { status: 'assigned', due: iso(13), intervention: 'Outreach call', why: 'Member has an open gap with no outreach logged yet.', memberIdx: 5 },
  ];
  plan.forEach(({ status, due, intervention, why, memberIdx }, i) => {
    const m = pickMeasure(i);
    const member = pickMember(memberIdx === undefined ? i : memberIdx);
    const rec = addAssignment({
      measureId: m.measure_id,
      measureName: m.display_name,
      level: 'crsp',
      crsp: providerName,
      providers: null,
      target: { kind: 'members', memberIds: [member.memberId], label: member.memberName },
      member: { memberId: member.memberId, memberName: member.memberName, age: member.age, dob: member.dob },
      intervention,
      assignedTo: providerName,
      due,
      why,
      coverEstimate: 1,
      seedVersion: SEED_VERSION,
      // Backdate to a 60-day delivery window ending at the due date. Without
      // this every seeded row reads "assigned today" (addAssignment stamps
      // Date.now()), which makes the action modal's assigned-date/remaining
      // pair meaningless the moment you look at it.
      createdAt: Date.parse(`${due}T00:00:00Z`) - 60 * MS_DAY,
    });
    if (status !== 'assigned') updateAssignment(rec.id, { status });
  });
};
