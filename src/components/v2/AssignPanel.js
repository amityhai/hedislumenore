import { useState, useMemo, useEffect } from 'react';
import './AssignPanel.css';
import useAsync from '../../hooks/useAsync';
import {
  fetchMemberDetails,
  fetchRaceMemberDetails,
  fetchEthnicityMemberDetails,
  fetchCRSPMemberDetails,
} from '../../services/workflowService';
import { num, statusFor, STAFF, INTERVENTIONS, addAssignment, assignmentScopeKey, activeAssignmentsForMeasure, activePlaysForMember, ASSIGNMENTS_EVENT, sampleMembersForStrata } from './v2utils';

export const UNASSIGNED = 'Unassigned pool';

// Strata below this size are suppressed rather than shown — a rate over a
// handful of members isn't a signal, and HEDIS reporting suppresses the same way.
const MIN_CELL = 11;

// How far a stratum must trail the measure before it's worth surfacing. Below
// this, listing it just teaches people to skip the equity section.
const EQUITY_GAP_PTS = 3;

// Fewest providers that together account for this share of the total shortfall.
const CONCENTRATION = 0.6;

const DIMS = [
  { key: 'age', label: 'Age' },
  { key: 'race', label: 'Race' },
  { key: 'ethnicity', label: 'Ethnicity' },
];

// A low rate among members whose demographics were never recorded is a data
// quality problem, not a disparity — never offer it as an outreach target.
const UNRECORDED = /^(unknown|unspecified|not reported|not recorded|declined|refused|missing|n\/?a|-)$/i;

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

// Members that must become compliant for this population to reach goal.
const gapToGoal = (numer, denom, goal) => Math.max(0, Math.ceil((goal / 100) * denom) - numer);

const withStats = (p, goal) => {
  const denom = num(p.denominator);
  const numer = num(p.numerator);
  return { ...p, denom, numer, nonCompliant: Math.max(0, denom - numer), need: gapToGoal(numer, denom, goal) };
};

// The smallest set of providers responsible for CONCENTRATION of the shortfall.
const concentrate = (rows) => {
  const sorted = [...rows].sort((a, b) => b.need - a.need);
  const total = sorted.reduce((s, r) => s + r.need, 0);
  if (!total) return null;
  let cum = 0;
  let k = 0;
  while (k < sorted.length && cum < total * CONCENTRATION) { cum += sorted[k].need; k += 1; }
  if (k === 0 || k >= sorted.length) return null; // no meaningful concentration to call out
  return { rows: sorted.slice(0, k), share: Math.round((cum / total) * 100) };
};

const equityOutliers = (equity, baseRate) => {
  const out = [];
  let hidden = 0;
  let unrecorded = 0;
  DIMS.forEach(({ key, label }) => {
    (equity[key] || []).forEach((g) => {
      const denom = num(g.denom ?? g.denominator);
      if (denom > 0 && denom < MIN_CELL) { hidden += 1; return; }
      const delta = Math.round((num(g.rate) - baseRate) * 10) / 10;
      if (delta > -EQUITY_GAP_PTS) return;
      if (UNRECORDED.test(String(g.group).trim())) { unrecorded += 1; return; }
      out.push({
        dim: key, dimLabel: label, group: g.group, rate: num(g.rate), delta, denom,
        notMeeting: num(g.notMeeting ?? Math.max(0, denom - num(g.num))),
      });
    });
  });
  return { rows: out.sort((a, b) => a.delta - b.delta), hidden, unrecorded };
};

const defaultDue = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

const sameRow = (a, b) => a.dim === b.dim && a.group === b.group;

const AssignPanel = ({ measure, providers = [], equity = { age: [], race: [], ethnicity: [] }, scope, token, selectedMonth, onClose, onAssign }) => {
  // null (closed) | { kind: 'scope' } (whole in-scope roster, honouring the
  // targeting checkboxes) | { kind: 'stratum', row } (one equity group, opened
  // straight from its "view members" link regardless of what's targeted).
  const [memberScope, setMemberScope] = useState(null);
  // Providers and strata narrow the scope independently and compose: picking a
  // stratum shouldn't wipe a provider selection, or vice versa.
  const [provPick, setProvPick] = useState(null); // null | provider rows
  const [strata, setStrata] = useState([]);       // stratum rows, multi-select
  // Hand-picked members from the roster table. When any are checked they become
  // the target — an explicit set — and the panel's counts follow the selection
  // instead of the predicate. memberId -> member object.
  const [picked, setPicked] = useState({});
  const pickedList = useMemo(() => Object.values(picked), [picked]);
  const hasPicked = pickedList.length > 0;
  const pickedKey = useMemo(() => Object.keys(picked).sort().join(','), [picked]);
  const togglePick = (m) => setPicked((p) => {
    const n = { ...p };
    if (n[m.memberId]) delete n[m.memberId]; else n[m.memberId] = m;
    return n;
  });
  const togglePickMany = (members, on) => setPicked((p) => {
    const n = { ...p };
    members.forEach((m) => { if (on) n[m.memberId] = m; else delete n[m.memberId]; });
    return n;
  });
  const clearPicked = () => setPicked({});
  // A recommended action can seed the intervention (see the "Assign this
  // intervention" button on the measure card's Recommended-action stage). The
  // recommendation vocabulary is separate from the assign list, so a preset that
  // isn't already an option gets prepended rather than dropped.
  const [intervention, setIntervention] = useState(scope.intervention || INTERVENTIONS[0]);
  const interventionOptions = useMemo(
    () => (scope.intervention && !INTERVENTIONS.includes(scope.intervention)
      ? [scope.intervention, ...INTERVENTIONS] : INTERVENTIONS),
    [scope.intervention]
  );
  const [staff, setStaff] = useState(UNASSIGNED);
  const [due, setDue] = useState(defaultDue);
  const [why, setWhy] = useState('');

  const atMeasure = scope.level === 'measure';
  const goal = num(measure?.goal_50th);
  const measureDenom = num(measure?.denominator);
  const measureNonCompliant = Math.max(0, measureDenom - num(measure?.numerator));

  const providerRows = useMemo(
    () => providers.filter((p) => !p.overall).map((p) => withStats(p, goal)),
    [providers, goal]
  );
  const belowGoal = useMemo(
    () => providerRows.filter((p) => statusFor(p.rate, goal) === 'Below Goal').length,
    [providerRows, goal]
  );
  const conc = useMemo(() => (atMeasure ? concentrate(providerRows) : null), [atMeasure, providerRows]);

  const self = atMeasure ? null : withStats(scope.provider, goal);
  const baseRate = num(atMeasure ? measure?.rate : scope.provider?.rate);
  const baseDenom = atMeasure ? measureDenom : self.denom;
  const baseNumer = atMeasure ? num(measure?.numerator) : self.numer;
  const baseNonCompliant = Math.max(0, baseDenom - baseNumer);
  const hasCounts = baseDenom > 0;
  const need = gapToGoal(baseNumer, baseDenom, goal);

  // Equity is fetched per measure, never per provider — so on a provider scope
  // these rates describe the network, not this CRSP. Targeting still works (the
  // member fetch accepts crsp + stratum together); only the rates are network-wide.
  const { rows: eqRows, hidden: eqHidden, unrecorded: eqUnrecorded } = useMemo(
    () => equityOutliers(equity, num(measure?.rate)),
    [equity, measure]
  );

  // Groups inside one dimension are mutually exclusive, so their open gaps add
  // up exactly. Across dimensions they overlap — every member has an age *and* a
  // race — so the union is estimated by inclusion–exclusion, treating the two
  // dimensions as independent. Summing instead would count the same member twice.
  const strataReach = useMemo(() => {
    if (!strata.length) return null;
    const byDim = new Map();
    strata.forEach((r) => byDim.set(r.dim, (byDim.get(r.dim) || 0) + r.notMeeting));
    const dims = [...byDim.values()];
    const crossDim = dims.length > 1;
    if (!measureNonCompliant) return { members: 0, crossDim };
    const union = dims.reduce((acc, s) => acc + s - (acc * s) / measureNonCompliant, 0);
    return { members: Math.min(measureNonCompliant, Math.round(union)), crossDim };
  }, [strata, measureNonCompliant]);

  const inScope = useMemo(() => {
    // A hand-picked set is exact and overrides every predicate narrowing.
    if (hasPicked) return { members: pickedList.length, providers: 1, approx: false };

    const base = atMeasure && provPick
      ? provPick.reduce((s, r) => s + r.nonCompliant, 0)
      : baseNonCompliant;
    const providerCount = atMeasure ? (provPick ? provPick.length : providerRows.length) : 1;

    if (!strataReach) return { members: base, providers: providerCount, approx: false };

    // The stratum counts describe the whole network. They're exact only when
    // nothing else narrows the scope; otherwise there's no provider × stratum
    // cross-tab to read, so the stratum's share of the network's open gaps gets
    // applied to the narrower base.
    const wholeNetwork = atMeasure && !provPick;
    const members = wholeNetwork
      ? strataReach.members
      : Math.round(base * (measureNonCompliant > 0 ? strataReach.members / measureNonCompliant : 0));

    const why = [];
    if (!wholeNetwork) why.push('no provider × group cross-tab');
    if (strataReach.crossDim) why.push('selected groups overlap');
    return { members, providers: providerCount, approx: why.length > 0, why: why.join('; ') };
  }, [hasPicked, pickedList.length, strataReach, provPick, atMeasure, providerRows, baseNonCompliant, measureNonCompliant]);

  // The target this assign describes: a predicate (a stratum band, or the whole
  // eligible population) that keeps matching members as they enter the pool. An
  // explicit hand-picked member set comes from the worklist, not this panel.
  const target = useMemo(
    () => {
      if (hasPicked) {
        return {
          kind: 'members',
          memberIds: pickedList.map((m) => m.memberId),
          label: `${pickedList.length} selected member${pickedList.length === 1 ? '' : 's'}`,
        };
      }
      return strata.length
        ? { kind: 'stratum', strata: strata.map((r) => ({ type: r.dim, group: r.group })) }
        : { kind: 'population' };
    },
    // pickedKey stands in for the picked ids so identity churn doesn't re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasPicked, pickedKey, strata]
  );
  const crspForScope = atMeasure ? (provPick && provPick.length === 1 ? provPick[0].crsp : null) : scope.provider?.crsp || null;
  const currentScopeKey = assignmentScopeKey({ measureId: measure?.measure_id, crsp: crspForScope, target });

  // Real dedup, replacing the old hashed guess: members already covered by an
  // active play on the SAME scope are skipped, and only the delta becomes new
  // tasks. Reopening a scope that was already assigned is exactly scenario 2 —
  // the prior coverage is skipped and any growth in the pool shows as newly
  // eligible. Read once at open; the panel closes on submit.
  const priorForScope = useMemo(
    () => activeAssignmentsForMeasure(measure?.measure_id).filter((a) => a.scopeKey === currentScopeKey),
    [measure?.measure_id, currentScopeKey]
  );
  const priorCovered = priorForScope.reduce((s, a) => s + (a.coverEstimate || 0), 0);
  const skipped = Math.min(inScope.members, priorCovered);
  const created = Math.max(0, inScope.members - skipped);
  const hasPrior = priorForScope.length > 0;

  // "If every gap closes" is a useless projection — it's always 100%. What the
  // assigner needs is the inverse: how much of this scope has to convert to hit
  // goal, and whether the scope is even big enough to get there.
  const reach = useMemo(() => {
    if (!hasCounts || need === 0) return null;
    if (created < need) {
      return { short: true, ceiling: pct(baseNumer + created, baseDenom), gap: need - created };
    }
    return { short: false, mustClose: need, share: Math.round((need / created) * 100) };
  }, [hasCounts, need, created, baseNumer, baseDenom]);

  // One chip per narrowing: the provider set, then each dimension with the
  // groups picked inside it ("Race: Asian, White").
  const targetChips = useMemo(() => {
    const byDim = new Map();
    strata.forEach((r) => {
      if (!byDim.has(r.dim)) byDim.set(r.dim, { label: r.dimLabel, groups: [] });
      byDim.get(r.dim).groups.push(r.group);
    });
    return [
      ...(provPick ? [`${provPick.length} providers`] : []),
      ...[...byDim.values()].map((d) => `${d.label}: ${d.groups.join(', ')}`),
    ];
  }, [provPick, strata]);

  const clearTarget = () => { setProvPick(null); setStrata([]); };
  const toggleStratum = (r) => setStrata((cur) =>
    cur.some((x) => sameRow(x, r)) ? cur.filter((x) => !sameRow(x, r)) : [...cur, r]);

  const submit = () => {
    // Persist the assignment locally so it survives reload — the tracking board
    // and the "action taken" chips read from the same store. `coverEstimate` is
    // the tasks this play newly creates, so reopening the scope later skips it.
    const record = addAssignment({
      measureId: measure?.measure_id,
      measureName: measure?.display_name,
      level: scope.level,
      crsp: crspForScope,
      providers: provPick ? provPick.map((r) => r.crsp) : null,
      target,
      intervention, assignedTo: staff, due, why,
      coverEstimate: created,
    });
    onAssign({
      scope: {
        measureId: measure?.measure_id,
        level: scope.level,
        crsp: crspForScope,
        providers: record.providers,
        strata: target.strata || null,
        nonCompliantOnly: true,
      },
      intervention, assignedTo: staff, due, why,
      preview: { members: inScope.members, created, skipped },
      assignmentId: record.id,
    });
  };

  const viewStratum = memberScope?.kind === 'stratum'
    ? memberScope.row
    : (strata.length === 1 ? strata[0] : null);
  // Is the roster's stratum currently targeted? If so its whole roster reads as
  // selected — targeting the group and ticking every member are the same intent.
  const stratumTargeted = !!viewStratum && strata.some((x) => sameRow(x, viewStratum));
  const toggleViewStratum = () => { if (viewStratum) toggleStratum(viewStratum); };
  // How many members are hand-picked per group (tagged at pick time), so a group
  // with some — but not all — of its members picked shows a partial checkbox.
  const pickedByStratum = useMemo(() => {
    const map = {};
    pickedList.forEach((m) => {
      if (m._stratum) {
        const k = `${m._stratum.dim}:${m._stratum.group}`;
        map[k] = (map[k] || 0) + 1;
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedKey]);

  return (
    <div className="apx-scrim" onClick={onClose}>
      <div className={`apx-shell ${memberScope ? 'has-members' : ''}`} onClick={(e) => e.stopPropagation()}>
      <div className="apx" role="dialog" aria-modal="true" aria-label="Assign intervention">
        <header className="apx-head">
          <div>
            <h3>Assign intervention</h3>
            <p className="apx-sub">
              {atMeasure
                ? <>Measure-wide · <strong>{measure?.display_name}</strong></>
                : <>Provider · <strong>{scope.provider.crsp}</strong> · {measure?.display_name}</>}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm apx-x" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="apx-body">
          {/* The number that makes the blast radius mean something. */}
          <div className="apx-hero">
            <div className="apx-hero-rates">
              <span className="apx-hero-rate num">{baseRate}%</span>
              <span className="apx-hero-arrow" aria-hidden="true">→</span>
              <span className="apx-hero-goal num">goal {goal}%</span>
            </div>
            {hasCounts && (
              <p className="apx-hero-need">
                {need > 0
                  ? <>Need <strong className="num">{need.toLocaleString()}</strong> more compliant {need === 1 ? 'member' : 'members'} to reach goal</>
                  : <>Already at goal — {baseNonCompliant.toLocaleString()} open gaps remain</>}
              </p>
            )}
          </div>

          {targetChips.length > 0 && (
            <div className="apx-target">
              <span>Narrowed to {targetChips.map((c, i) => (
                <span key={c}>{i > 0 && <span className="apx-target-sep"> · </span>}<strong>{c}</strong></span>
              ))}</span>
              <button type="button" onClick={clearTarget}>Clear ✕</button>
            </div>
          )}

          {atMeasure && providerRows.length > 0 && (
            <section className="apx-block">
              <h4 className="apx-block-title">Providers</h4>
              <p className="apx-line">
                <strong className="num">{providerRows.length}</strong> total · <strong className="num">{belowGoal}</strong> below goal
              </p>
              {conc && (
                <button type="button" aria-pressed={!!provPick} className={`apx-pick ${provPick ? 'is-on' : ''}`}
                  onClick={() => setProvPick(provPick ? null : conc.rows)}>
                  <span className="apx-check" aria-hidden="true" />
                  <span><strong className="num">{conc.rows.length}</strong> providers account for <strong className="num">{conc.share}%</strong> of the shortfall</span>
                  <span className="apx-pick-cta">{provPick ? 'Targeted' : 'Target these'}</span>
                </button>
              )}
            </section>
          )}

          <section className="apx-block">
            <h4 className="apx-block-title">Members</h4>
            {hasPicked ? (
              <ul className="apx-stack">
                <li><span className="num">{pickedList.length.toLocaleString()}</span> hand-picked from the roster</li>
                <li className="is-strong">→ <span className="num">{created.toLocaleString()}</span> new tasks</li>
                <li><button type="button" className="apx-linkbtn" onClick={clearPicked}>Clear selection</button></li>
              </ul>
            ) : hasCounts ? (
              <ul className="apx-stack">
                <li><span className="num">{inScope.members.toLocaleString()}</span> non-compliant in scope{inScope.approx && <em> (estimated — {inScope.why})</em>}</li>
                {hasPrior && (
                  <li className="is-muted">
                    <span className="num">{skipped.toLocaleString()}</span> already covered by an active play — will be skipped
                  </li>
                )}
                <li className="is-strong">
                  → <span className="num">{created.toLocaleString()}</span> {hasPrior ? 'newly-eligible tasks' : 'new tasks'}
                </li>
              </ul>
            ) : (
              <p className="apx-line is-muted">Member counts aren't available for this provider.</p>
            )}
            {/* The counts above are the aggregate; this docks the roster table so the
                assigner can see who they are and check specific members to pick a set. */}
            <button type="button" className={`btn btn-secondary btn-sm apx-viewmembers ${memberScope?.kind === 'scope' ? 'is-on' : ''}`}
              aria-pressed={memberScope?.kind === 'scope'} onClick={() => setMemberScope(memberScope?.kind === 'scope' ? null : { kind: 'scope' })}>
              {hasPicked ? 'View / pick members' : 'View members'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </section>

          <section className="apx-block">
            <h4 className="apx-block-title">
              Equity
              {eqRows.length > 0 && (
                <span className="apx-block-note">
                  {!atMeasure && 'network-wide rates · '}select one or more
                </span>
              )}
            </h4>
            {eqRows.length === 0 ? (
              <p className="apx-line is-muted">No significant equity gap for this measure.</p>
            ) : (
              <div className="apx-eq">
                {eqRows.slice(0, 4).map((r) => {
                  const on = strata.some((x) => sameRow(x, r));
                  const viewing = memberScope?.kind === 'stratum' && sameRow(memberScope.row, r);
                  // Some of this group's members hand-picked, but not the whole group.
                  const partial = !on && (pickedByStratum[`${r.dim}:${r.group}`] || 0) > 0;
                  return (
                    <button key={`${r.dim}:${r.group}`} type="button" aria-pressed={on}
                      className={`apx-eqrow ${on ? 'is-on' : ''} ${partial ? 'is-partial' : ''} ${viewing ? 'is-viewing' : ''}`} onClick={() => toggleStratum(r)}>
                      <span className="apx-check" aria-hidden="true" />
                      <span className="apx-eq-group">{r.group}</span>
                      {/* Peek at just this group's roster without changing what's targeted. */}
                      <span className={`apx-eq-view ${viewing ? 'is-viewing' : ''}`} role="button" tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); setMemberScope(viewing ? null : { kind: 'stratum', row: r }); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setMemberScope(viewing ? null : { kind: 'stratum', row: r }); } }}>
                        {viewing ? 'viewing ✓' : 'view members ›'}
                      </span>
                      <span className="apx-eq-rate num">{r.rate}%</span>
                      <span className="apx-eq-delta num">▼ {Math.abs(r.delta)} pts</span>
                      <span className="apx-eq-cta">{on ? 'Targeted' : 'Target this'}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {(eqHidden > 0 || eqUnrecorded > 0) && (
              <p className="apx-hidden">
                {eqHidden > 0 && <>{eqHidden} {eqHidden === 1 ? 'group' : 'groups'} hidden — fewer than {MIN_CELL} members. </>}
                {eqUnrecorded > 0 && <>{eqUnrecorded} excluded — demographics not recorded, so a low rate there is a data gap, not a disparity.</>}
              </p>
            )}
          </section>

          <div className="apx-form">
            <label className="apx-field">
              <span>Intervention</span>
              <select value={intervention} onChange={(e) => setIntervention(e.target.value)}>
                {interventionOptions.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label className="apx-field">
              <span>Assign to</span>
              <select value={staff} onChange={(e) => setStaff(e.target.value)}>
                <option>{UNASSIGNED}</option>
                {STAFF.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label className="apx-field">
              <span>Due</span>
              <input type="date" min={today()} value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
            <label className="apx-field apx-field-wide">
              <span>Why <em>(shown to whoever picks this up)</em></span>
              <input type="text" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="e.g. Q3 push — worst measure vs benchmark" />
            </label>
          </div>
        </div>

        <footer className="apx-foot">
          <p className={`apx-summary ${reach?.short ? 'is-short' : ''}`}>
            {hasPicked ? (
              <>Creates <strong className="num">{created.toLocaleString()}</strong> {created === 1 ? 'task' : 'tasks'} for the <strong>{pickedList.length.toLocaleString()}</strong> selected {pickedList.length === 1 ? 'member' : 'members'}</>
            ) : !hasCounts ? 'Scope has no member counts to preview.' : (
              <>
                Creates <strong className="num">{created.toLocaleString()}</strong> tasks · skips <strong className="num">{skipped.toLocaleString()}</strong>
                {reach && (reach.short
                  ? <> · <strong>too small</strong> — even if all close, {baseRate}% → <strong className="num">{reach.ceiling}%</strong>, still <strong className="num">{reach.gap.toLocaleString()}</strong> short of goal</>
                  : <> · <strong className="num">{reach.mustClose.toLocaleString()}</strong> ({reach.share}%) must close to reach {goal}%</>)}
              </>
            )}
          </p>
          <div className="apx-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-assign" disabled={!created} onClick={submit}>
              Assign {created > 0 ? created.toLocaleString() : ''}
            </button>
          </div>
        </footer>
      </div>

      {memberScope && (
        <MembersPanel
          token={token}
          selectedMonth={selectedMonth}
          measureId={measure?.measure_id}
          measureName={measure?.display_name}
          level={scope.level}
          crsp={crspForScope}
          stratum={viewStratum}
          strata={strata}
          isStratumView={memberScope.kind === 'stratum'}
          intervention={intervention}
          picked={picked}
          stratumTargeted={stratumTargeted}
          onToggleStratumTarget={toggleViewStratum}
          onTogglePick={togglePick}
          onTogglePickMany={togglePickMany}
          onClose={() => setMemberScope(null)}
        />
      )}
      </div>
    </div>
  );
};

// ── Members panel ────────────────────────────────────────────
// The roster behind the counts. The assign panel deals in aggregates; this docks
// open beside it as a wide table so the assigner can SEE the in-scope members and
// hand-pick a set with the checkboxes — the ticked rows become the panel's target
// and its counts follow the selection. Coverage from the store still shows which
// members are already in an active play.
const isCompliant = (m) => {
  if (typeof m.compliant === 'boolean') return m.compliant;
  const s = String(m.status ?? m.priority ?? '').toLowerCase();
  if (/non|open|gap|incomplete|^0$|false/.test(s)) return false;
  if (/compl|met|closed|^1$|true/.test(s)) return true;
  return !!m.source && m.source !== '-';
};
const dash = (v) => (v && v !== '-' ? v : '—');
const normMember = (m, fallbackCrsp) => ({
  memberId: m.memberId,
  memberName: m.memberName,
  dob: dash(m.dob),
  age: m.age,
  crsp: m.crsp && m.crsp !== 'NO CRSP' ? m.crsp : (fallbackCrsp || m.crsp || '—'),
  serviceDate: dash(m.serviceDate),
  source: dash(m.source),
  compliant: isCompliant(m),
});

const MembersPanel = ({ token, selectedMonth, measureId, level, crsp, stratum, strata = [], isStratumView, intervention, picked, stratumTargeted, onToggleStratumTarget, onTogglePick, onTogglePickMany, onClose }) => {
  // The groups the roster must reflect. A "view members ›" peek pins one group;
  // the scope view follows every targeted group (none = the whole scope roster).
  const activeStrata = isStratumView ? (stratum ? [stratum] : []) : strata;
  const strataKey = activeStrata.map((s) => `${s.dim}:${s.group}`).join('|');
  const [showAll, setShowAll] = useState(false);
  const [storeVer, setStoreVer] = useState(0);
  useEffect(() => {
    const bump = () => setStoreVer((v) => v + 1);
    window.addEventListener(ASSIGNMENTS_EVENT, bump);
    window.addEventListener('storage', bump);
    return () => { window.removeEventListener(ASSIGNMENTS_EVENT, bump); window.removeEventListener('storage', bump); };
  }, []);
  // Escape collapses the roster back to just the panel.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { data, loading, error } = useAsync(async () => {
    // One stratum → one fetch; several → union their rosters (deduped by member),
    // so a multi-group target shows exactly the members it will act on. No strata
    // falls through to the whole-scope roster.
    const fetchStratum = (st) => {
      if (st?.dim === 'age') return fetchMemberDetails({ measureId, ageStrat: st.group, crsp }, token);
      if (st?.dim === 'race') return fetchRaceMemberDetails({ measureId, raceStrat: st.group, crsp }, token);
      if (st?.dim === 'ethnicity') return fetchEthnicityMemberDetails({ measureId, ethnicityStrat: st.group, crsp }, token);
      return fetchCRSPMemberDetails({ measureId, crsp }, token);
    };
    try {
      let rows;
      if (activeStrata.length <= 1) {
        rows = await fetchStratum(activeStrata[0]);
      } else {
        const lists = await Promise.all(activeStrata.map(fetchStratum));
        const seen = new Map();
        lists.flat().forEach((r) => { if (r?.memberId != null && !seen.has(r.memberId)) seen.set(r.memberId, r); });
        rows = [...seen.values()];
      }
      if (!rows || rows.length === 0) throw new Error('empty');
      return rows.map((r) => normMember(r, crsp));
    } catch (e) {
      return sampleMembersForStrata(activeStrata, crsp).map((r) => normMember(r, crsp));
    }
  }, [measureId, crsp, strataKey, selectedMonth], { enabled: !!measureId });

  const all = data || [];
  const nonCompliant = useMemo(() => all.filter((m) => !m.compliant), [all]);
  const rows = showAll ? all : nonCompliant;

  // Per-member coverage from the assignment store (re-resolves on storeVer).
  const coverage = useMemo(() => {
    const map = {};
    rows.forEach((m) => {
      const plays = activePlaysForMember(m, measureId, crsp);
      if (plays.length) map[m.memberId] = plays[0];
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, measureId, crsp, storeVer]);

  // A row is selected when its stratum is targeted (whole group) or it's been
  // individually picked. Targeting the group and ticking every row are one intent.
  const rowChecked = (m) => stratumTargeted || !!picked[m.memberId];
  const shownPicked = rows.filter((m) => picked[m.memberId]).length;
  const allExplicit = rows.length > 0 && shownPicked === rows.length;
  const allShown = stratumTargeted || allExplicit;
  const someShown = !stratumTargeted && shownPicked > 0 && !allExplicit;
  const selectedCount = stratumTargeted ? rows.length : shownPicked;

  // Tag each pick with the group it came from so the equity list can show a
  // partial (indeterminate) checkbox when only some of a group's members are in.
  const tag = stratum ? { dim: stratum.dim, group: stratum.group } : null;
  const withTag = (m) => ({ ...m, _stratum: tag });

  // Header select-all: when viewing a stratum it targets/untargets the whole
  // group (so it stays a predicate); otherwise it toggles the shown rows' picks.
  const toggleAllShown = () => {
    if (stratum) {
      if (!stratumTargeted) onTogglePickMany(rows.map(withTag), false); // explicit picks are subsumed by the group
      onToggleStratumTarget();
    } else {
      onTogglePickMany(rows.map(withTag), !allExplicit);
    }
  };
  // Ticking one row off a targeted group converts it to an explicit set (all
  // shown except this one), the way select-all-then-deselect-one usually works.
  const toggleRow = (m) => {
    if (stratumTargeted) {
      onToggleStratumTarget();
      onTogglePickMany(rows.filter((r) => r.memberId !== m.memberId).map(withTag), true);
    } else {
      onTogglePick(withTag(m));
    }
  };

  // The scope chip mirrors the roster: a single group when peeking or targeting
  // one, the union of names when several are targeted, else the provider /
  // measure-wide scope. Several groups union — flagged so the label reads as a set.
  const scopeName = crsp || (level === 'measure' ? 'All providers' : 'Provider');
  const chip = isStratumView
    ? stratum.group
    : activeStrata.length === 0
      ? scopeName
      : activeStrata.length <= 2
        ? activeStrata.map((s) => s.group).join(' + ')
        : `${activeStrata.length} groups`;
  const chipUnion = !isStratumView && activeStrata.length > 1;

  return (
    <section className="apxm" role="dialog" aria-modal="true" aria-label="Members in scope">
      <header className="apxm-head">
        <div className="apxm-head-id">
          <h3>Members</h3>
          <span className="apxm-scope">
            {chip}
            {chipUnion && <em> · any of {activeStrata.length} groups</em>}
          </span>
          <span className="apxm-scope-sub">{intervention}</span>
        </div>
        <div className="apxm-tabs">
          {selectedCount > 0 && <span className="apxm-selected"><span className="num">{selectedCount}</span> selected</span>}
          <button type="button" className={`apxm-tab ${!showAll ? 'is-on' : ''}`} onClick={() => setShowAll(false)}>
            Non-compliant <span className="num">{nonCompliant.length.toLocaleString()}</span>
          </button>
          <button type="button" className={`apxm-tab ${showAll ? 'is-on' : ''}`} onClick={() => setShowAll(true)}>
            All <span className="num">{all.length.toLocaleString()}</span>
          </button>
          <button type="button" className="btn btn-ghost btn-icon btn-sm apxm-x" onClick={onClose} aria-label="Hide members">✕</button>
        </div>
      </header>

      <div className="apxm-scroll">
        {loading ? (
          <p className="apxm-note">Loading members…</p>
        ) : rows.length === 0 ? (
          <p className="apxm-note">No members to show for this scope.</p>
        ) : (
          <table className="apxm-table">
            <thead>
              <tr>
                <th className="apxm-pick">
                  <input type="checkbox" aria-label="Select all shown"
                    checked={allShown} ref={(el) => { if (el) el.indeterminate = someShown; }}
                    onChange={toggleAllShown} />
                </th>
                <th>Member ID</th><th>Name</th><th>DOB</th><th className="ta-r">Age</th>
                <th>Service date</th><th>Source</th><th>Priority</th><th>Assigned / play</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const play = coverage[m.memberId];
                const who = play?.assignedTo;
                const covered = !!play;
                const isPicked = rowChecked(m);
                return (
                  <tr key={m.memberId} className={`${covered ? 'is-covered' : ''} ${isPicked ? 'is-picked' : ''}`}>
                    <td className="apxm-pick">
                      <input type="checkbox" aria-label={`Select ${m.memberName}`}
                        checked={isPicked} onChange={() => toggleRow(m)} />
                    </td>
                    <td><span className="apxm-id mono">{m.memberId}</span></td>
                    <td className="apxm-name">{m.memberName}</td>
                    <td className="apxm-dim">{m.dob}</td>
                    <td className="ta-r num">{m.age}</td>
                    <td className="apxm-dim">{m.serviceDate}</td>
                    <td className="apxm-dim">{m.source}</td>
                    <td>
                      <span className={`apxm-prio ${m.compliant ? 'is-ok' : 'is-gap'}`}>
                        <span className="apxm-prio-dot" aria-hidden="true" />{m.compliant ? 'Compliant' : 'Open gap'}
                      </span>
                    </td>
                    <td>
                      {covered ? (
                        <span className="apxm-play" title={`${play.intervention || 'Intervention'}${who ? ` · ${who}` : ''}`}>
                          <span className="apxm-play-dot" aria-hidden="true" />
                          <span className="apxm-play-tag">In active play</span>
                          {play.intervention && <span className="apxm-play-sub">· {play.intervention}</span>}
                        </span>
                      ) : <span className="apxm-unassigned">Unassigned</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <footer className="apxm-foot">
        <span className="apxm-foot-note">
          Tick members to build a set — the panel's counts and <strong>Assign</strong> button follow your selection. Leave all unticked to assign the whole scope.
          {error && ' · Showing sample roster — live member list unavailable.'}
        </span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Hide</button>
      </footer>
    </section>
  );
};

export default AssignPanel;
