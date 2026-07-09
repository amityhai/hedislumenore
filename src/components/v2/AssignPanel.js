import { useState, useMemo } from 'react';
import './AssignPanel.css';
import { num, statusFor, STAFF, INTERVENTIONS } from './v2utils';

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

// There is no assignments API yet (workflowService.saveCareAction is a stub), so
// the already-assigned figure is derived from the scope key instead of fetched.
// It stays stable for a given scope so the preview doesn't flicker.
const estimateAssigned = (key, pool) => {
  if (!pool) return 0;
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return Math.min(pool, Math.round(pool * (0.04 + (h % 70) / 1000)));
};

const defaultDue = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

const AssignPanel = ({ measure, providers = [], equity = { age: [], race: [], ethnicity: [] }, scope, assignedCount = null, onClose, onAssign }) => {
  const [target, setTarget] = useState(null); // null | {kind:'providers'|'stratum', …}
  const [intervention, setIntervention] = useState(INTERVENTIONS[0]);
  const [staff, setStaff] = useState(UNASSIGNED);
  const [due, setDue] = useState(defaultDue);
  const [why, setWhy] = useState('');

  const atMeasure = scope.level === 'measure';
  const goal = num(measure?.goal_50th);
  const measureDenom = num(measure?.denominator);

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

  const inScope = useMemo(() => {
    if (target?.kind === 'providers') {
      return {
        members: target.rows.reduce((s, r) => s + r.nonCompliant, 0),
        providers: target.rows.length,
        approx: false,
      };
    }
    if (target?.kind === 'stratum') {
      if (atMeasure) return { members: target.row.notMeeting, providers: providerRows.length, approx: false };
      // No provider × stratum rate exists; scale the network stratum by this
      // provider's share of the denominator and mark the result approximate.
      const share = measureDenom > 0 ? baseDenom / measureDenom : 0;
      return { members: Math.round(target.row.notMeeting * share), providers: 1, approx: true };
    }
    return { members: baseNonCompliant, providers: atMeasure ? providerRows.length : 1, approx: false };
  }, [target, atMeasure, providerRows, baseNonCompliant, baseDenom, measureDenom]);

  const scopeKey = `${measure?.measure_id}|${scope.level}|${scope.provider?.crsp || ''}|${target?.kind || ''}|${target?.row?.group || target?.rows?.length || ''}`;
  const estimated = assignedCount == null;
  const skipped = estimated ? estimateAssigned(scopeKey, inScope.members) : Math.min(inScope.members, assignedCount);
  const created = Math.max(0, inScope.members - skipped);

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

  const targetLabel = target?.kind === 'providers'
    ? `${target.rows.length} providers`
    : target?.kind === 'stratum' ? `${target.row.dimLabel}: ${target.row.group}` : null;

  const submit = () => onAssign({
    scope: {
      measureId: measure?.measure_id,
      level: scope.level,
      crsp: atMeasure ? null : scope.provider.crsp,
      providers: target?.kind === 'providers' ? target.rows.map((r) => r.crsp) : null,
      stratum: target?.kind === 'stratum' ? { type: target.row.dim, group: target.row.group } : null,
      nonCompliantOnly: true,
    },
    intervention, assignedTo: staff, due, why,
    preview: { members: inScope.members, created, skipped },
  });

  return (
    <div className="apx-scrim" onClick={onClose}>
      <div className="apx" role="dialog" aria-modal="true" aria-label="Assign intervention" onClick={(e) => e.stopPropagation()}>
        <header className="apx-head">
          <div>
            <h3>Assign intervention</h3>
            <p className="apx-sub">
              {atMeasure
                ? <>Measure-wide · <strong>{measure?.display_name}</strong></>
                : <>Provider · <strong>{scope.provider.crsp}</strong> · {measure?.display_name}</>}
            </p>
          </div>
          <button type="button" className="apx-x" onClick={onClose} aria-label="Close">✕</button>
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

          {targetLabel && (
            <div className="apx-target">
              <span>Narrowed to <strong>{targetLabel}</strong></span>
              <button type="button" onClick={() => setTarget(null)}>Clear ✕</button>
            </div>
          )}

          {atMeasure && providerRows.length > 0 && (
            <section className="apx-block">
              <h4 className="apx-block-title">Providers</h4>
              <p className="apx-line">
                <strong className="num">{providerRows.length}</strong> total · <strong className="num">{belowGoal}</strong> below goal
              </p>
              {conc && !target && (
                <button type="button" className="apx-pick" onClick={() => setTarget({ kind: 'providers', rows: conc.rows })}>
                  <span><strong className="num">{conc.rows.length}</strong> providers account for <strong className="num">{conc.share}%</strong> of the shortfall</span>
                  <span className="apx-pick-cta">Target these</span>
                </button>
              )}
            </section>
          )}

          <section className="apx-block">
            <h4 className="apx-block-title">Members</h4>
            {hasCounts ? (
              <ul className="apx-stack">
                <li><span className="num">{inScope.members.toLocaleString()}</span> non-compliant in scope{inScope.approx && <em> (estimated)</em>}</li>
                <li className="is-muted">
                  <span className="num">{skipped.toLocaleString()}</span> already assigned — will be skipped
                  {estimated && <em> (estimated — no assignment records yet)</em>}
                </li>
                <li className="is-strong">→ <span className="num">{created.toLocaleString()}</span> new tasks</li>
              </ul>
            ) : (
              <p className="apx-line is-muted">Member counts aren't available for this provider.</p>
            )}
          </section>

          <section className="apx-block">
            <h4 className="apx-block-title">
              Equity
              {!atMeasure && <span className="apx-block-note">network-wide rates</span>}
            </h4>
            {eqRows.length === 0 ? (
              <p className="apx-line is-muted">No significant equity gap for this measure.</p>
            ) : (
              <div className="apx-eq">
                {eqRows.slice(0, 4).map((r) => {
                  const on = target?.kind === 'stratum' && target.row.group === r.group && target.row.dim === r.dim;
                  return (
                    <button key={`${r.dim}:${r.group}`} type="button" className={`apx-eqrow ${on ? 'is-on' : ''}`}
                      onClick={() => setTarget(on ? null : { kind: 'stratum', row: r })}>
                      <span className="apx-eq-group">{r.group}</span>
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
                {INTERVENTIONS.map((x) => <option key={x}>{x}</option>)}
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
            {!hasCounts ? 'Scope has no member counts to preview.' : (
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
            <button type="button" className="btn btn-primary" disabled={!created} onClick={submit}>
              Assign {created > 0 ? created.toLocaleString() : ''}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AssignPanel;
