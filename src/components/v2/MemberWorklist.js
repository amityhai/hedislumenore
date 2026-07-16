import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './MemberWorklist.css';
import { Skeleton, EmptyState, ErrorState } from '../ui/Feedback';
import { useToast } from '../ui/Toast';
import useAsync from '../../hooks/useAsync';
import AssignPanel, { UNASSIGNED } from './AssignPanel';
import {
  fetchMemberDetails,
  fetchRaceMemberDetails,
  fetchEthnicityMemberDetails,
  fetchCRSPMemberDetails,
  fetchMeasureStratification,
  fetchMeasureStratificationRace,
  fetchMeasureStratificationEthnicity,
  saveCareAction,
} from '../../services/workflowService';
import { num, statusFor, STATUS_TONE, sampleEquity, sampleMembers, STAFF, INTERVENTIONS, stratumRead, recommendAction } from './v2utils';
import { Stage, Signals } from './OverviewExplore';

const toneFor = (rate, goal) => STATUS_TONE[statusFor(rate, goal)] || 'below';

const EQUITY_DIMS = [
  { key: 'age', title: 'AGE' },
  { key: 'race', title: 'RACE' },
  { key: 'ethnicity', title: 'ETHNICITY' },
];

const PAGE_SIZE = 12;

// Non-compliant = an open care gap (no qualifying service this period). We treat
// a member as compliant only when the source data explicitly says so.
const isCompliant = (m) => {
  if (typeof m.compliant === 'boolean') return m.compliant;
  const s = String(m.status ?? m.priority ?? '').toLowerCase();
  if (/non|open|gap|incomplete|^0$|false/.test(s)) return false;
  if (/compl|met|closed|^1$|true/.test(s)) return true;
  return !!m.source && m.source !== '-';
};

const normalize = (m, fallbackCrsp) => ({
  memberId: m.memberId,
  memberName: m.memberName,
  age: m.age,
  crsp: m.crsp && m.crsp !== 'NO CRSP' ? m.crsp : (fallbackCrsp || m.crsp || '—'),
  compliant: isCompliant(m),
});

const MemberWorklist = ({ token, selectedMonth, measure, provider, strat, onAnalyzeProvider }) => {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [ncOnly, setNcOnly] = useState(false);     // show only non-compliant
  const [assigned, setAssigned] = useState({});   // memberId -> staff name
  const [modalMember, setModalMember] = useState(null);
  const [assignState, setAssignState] = useState(null); // null | { intervention? } — provider-wide / stratum assign
  // Equity segment is an in-place filter, not a navigation: picking a stratum
  // narrows the member list below without leaving the page. `pickedStrat` holds
  // the active chip; it composes with the `strat` prop (a stratum this worklist
  // was opened on already) — the prop wins, and the segment card is hidden then.
  const [pickedStrat, setPickedStrat] = useState(null);

  const measureId = measure?.measure_id;
  const providerCrsp = provider && !provider.overall ? provider.crsp : undefined;
  // On a provider (or all-provider) worklist that isn't already narrowed to a
  // stratum, offer an equity-segmentation card up top rather than dropping the
  // reader straight into a flat member list.
  const showSegment = !!provider && !strat;
  // The stratum actually driving the list: an in-page pick, or the prop it opened on.
  const effStrat = strat || pickedStrat;

  // A different provider/measure is a different population — drop any in-page pick.
  useEffect(() => { setPickedStrat(null); setPage(1); }, [measureId, providerCrsp]);

  // Equity strata power three things now: the segmentation card, the provider-wide
  // Assign panel, and the stratum-level insight read (which needs the sibling
  // strata to rank the active group). So fetch whenever there's a measure and
  // either a provider worklist or an already-picked stratum — not only when the
  // segment card is showing.
  const wantEquity = !!measureId && (!!provider || !!strat);
  const equityAsync = useAsync(async () => {
    if (!wantEquity) return null;
    try {
      const [a, r, e] = await Promise.all([
        fetchMeasureStratification(measureId, token),
        fetchMeasureStratificationRace(measureId, token),
        fetchMeasureStratificationEthnicity(measureId, token),
      ]);
      const age = a?.[measureId]?.age || [];
      const race = r?.[measureId]?.race || [];
      const ethnicity = e?.[measureId]?.ethnicity || [];
      if (age.length + race.length + ethnicity.length === 0) throw new Error('empty');
      return { age, race, ethnicity };
    } catch (err) { return sampleEquity(measureId); }
  }, [measureId, wantEquity, selectedMonth], { enabled: !!token && wantEquity });
  const equity = equityAsync.data || { age: [], race: [], ethnicity: [] };

  // Stratum-level intelligence — the same shape of read the Overview gives a
  // measure, but about the active equity group: where it sits vs goal, how it
  // ranks against its sibling strata, and a targeted next move.
  const stratInsight = useMemo(() => {
    if (!effStrat) return null;
    const siblings = equity[effStrat.type] || [];
    const read = stratumRead(effStrat, siblings, measure);
    if (!read) return null;
    const rec = measure ? recommendAction(measure, read) : null;
    return { read, rec };
  }, [effStrat, equity, measure]);

  const { data, loading, error, refetch } = useAsync(async () => {
    try {
      let rows = [];
      if (effStrat?.type === 'age') rows = await fetchMemberDetails({ measureId, ageStrat: effStrat.group, crsp: providerCrsp }, token);
      else if (effStrat?.type === 'race') rows = await fetchRaceMemberDetails({ measureId, raceStrat: effStrat.group, crsp: providerCrsp }, token);
      else if (effStrat?.type === 'ethnicity') rows = await fetchEthnicityMemberDetails({ measureId, ethnicityStrat: effStrat.group, crsp: providerCrsp }, token);
      else rows = await fetchCRSPMemberDetails({ measureId, crsp: provider?.crsp }, token);
      if (!rows || rows.length === 0) throw new Error('empty');
      return { rows: rows.map((r) => normalize(r, providerCrsp)), sample: false };
    } catch (e) {
      return { rows: sampleMembers(20, providerCrsp).map((r) => normalize(r, providerCrsp)), sample: true };
    }
  }, [measureId, providerCrsp, effStrat?.type, effStrat?.group, selectedMonth], { enabled: !!token && !!measureId });

  const members = data?.rows || [];
  const nonCompliant = members.filter((m) => !m.compliant).length;
  const compliant = members.length - nonCompliant;

  const shown = useMemo(() => (ncOnly ? members.filter((m) => !m.compliant) : members), [members, ncOnly]);
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const pageRows = useMemo(() => shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [shown, page]);
  const setFilter = (v) => { setNcOnly(v); setPage(1); };

  // Context header metrics — reflect the effective stratum so the header follows
  // an in-page equity filter, not just the stratum this worklist opened on.
  const rate = num(effStrat?.rate ?? provider?.rate ?? measure?.rate);
  const goal = num(effStrat?.goal ?? provider?.goal ?? measure?.goal_50th);
  const delta = Math.round((rate - goal) * 10) / 10;
  const tone = STATUS_TONE[statusFor(rate, goal)] || 'below';
  const title = effStrat?.group || (provider && !provider.overall ? provider.crsp : null) || measure?.display_name || 'Members';
  const providerName = provider ? (provider.overall ? 'All providers (Overall)' : provider.crsp) : null;

  const saveAssignment = async ({ member, staff, intervention, notes }) => {
    setAssigned((a) => ({ ...a, [member.memberId]: staff }));
    setModalMember(null);
    toast({ type: 'success', message: `${intervention} assigned to ${staff}` });
    try {
      await saveCareAction({ memberId: member.memberId, measureId, crsp: member.crsp, assignedTo: staff, actionType: intervention, notes }, token);
    } catch (e) {
      setAssigned((a) => { const n = { ...a }; delete n[member.memberId]; return n; });
      toast({ type: 'error', message: `Couldn't assign for ${member.memberName} — please retry.` });
    }
  };

  return (
    <div className="mwl">
      {/* Context header */}
      <div className={`mwl-head mwl-head-${tone}`}>
        <div className="mwl-head-left">
          <div className="mwl-head-titlerow">
            <h2 className="mwl-head-title">{title}</h2>
            <span className={`mwl-head-rate mwl-rate-${tone} num`}>{rate}%</span>
          </div>
          {providerName && <div className="mwl-head-provider">Provider · <strong>{providerName}</strong></div>}
          {provider && (
            <div className="mwl-head-actions">
              <button type="button" className="btn btn-tonal btn-sm"
                onClick={() => setAssignState({})}>
                Assign intervention
              </button>
              {!provider.overall && onAnalyzeProvider && (
                <button type="button" className="btn btn-secondary btn-sm"
                  onClick={() => onAnalyzeProvider(measure, provider)}>
                  Analyze provider
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
        <div className="mwl-head-metrics">
          <div><span className="mwl-mk">Rate</span><span className="mwl-mv num">{rate}%</span></div>
          <div><span className="mwl-mk">Goal</span><span className="mwl-mv num">{goal}%</span></div>
          <div><span className="mwl-mk">Delta</span><span className={`mwl-mv num ${delta < 0 ? 'is-neg' : 'is-pos'}`}>{delta >= 0 ? '+' : ''}{delta} pts</span></div>
          <div className="mwl-msep" />
          <div><span className="mwl-mk">Members</span><span className="mwl-mv num">{loading ? '—' : members.length}</span></div>
          <div><span className="mwl-mk">Non-compliant</span><span className="mwl-mv num is-neg">{loading ? '—' : nonCompliant}</span></div>
          <div><span className="mwl-mk">Compliant</span><span className="mwl-mv num is-pos">{loading ? '—' : compliant}</span></div>
        </div>
      </div>

      {/* Equity segmentation — segregate this provider's members by stratum
          instead of dropping straight into a flat list. */}
      {showSegment && (
        <EquitySegment equity={equity} loading={equityAsync.loading} measureGoal={goal}
          selected={pickedStrat}
          onPick={(dim, g) => {
            const pick = { type: dim, ...g, goal: num(g.goal ?? goal) };
            // Toggle: re-picking the active stratum clears the filter.
            setPickedStrat((cur) => (cur && cur.type === dim && cur.group === g.group ? null : pick));
            setPage(1);
          }}
          onClear={() => { setPickedStrat(null); setPage(1); }} />
      )}

      {/* Stratum insight — a read relevant to the active equity group */}
      {effStrat && stratInsight && (
        <StratumInsight insight={stratInsight} stratum={effStrat} loading={equityAsync.loading}
          onAssign={(intervention) => setAssignState({ intervention })} />
      )}

      {/* Table */}
      <div className="mwl-card">
        {error ? (
          <ErrorState message="Couldn't load members." onRetry={refetch} />
        ) : loading ? (
          <div className="mwl-loading">{[...Array(8)].map((_, i) => <Skeleton key={i} height={20} style={{ marginBottom: 14 }} />)}</div>
        ) : members.length === 0 ? (
          <EmptyState icon="🎉" title="No members" hint="Nothing to work in this group." />
        ) : (
          <>
            <div className="mwl-toolbar">
              <button type="button" className={`mwl-filter ${ncOnly ? 'is-active' : ''}`} onClick={() => setFilter(!ncOnly)}>
                <span className="mwl-filter-dot" aria-hidden="true" />
                Non-compliant only
                <span className="mwl-filter-count num">{nonCompliant}</span>
              </button>
              {ncOnly && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilter(false)}>Clear ✕</button>
              )}
              <span className="mwl-toolbar-count num">{shown.length} of {members.length} shown</span>
            </div>
            {shown.length === 0 ? (
              <EmptyState icon="✅" title="No non-compliant members" hint="Everyone in this group is compliant." />
            ) : (
            <>
            <div className="mwl-table" role="table">
              <div className="mwl-row mwl-row-head" role="row">
                <span>Member ID</span><span>Name</span><span className="ta-r">Age</span>
                <span>Provider (CRSP)</span><span>Status</span><span>Assigned to</span><span className="ta-r">Action</span>
              </div>
              {pageRows.map((m, i) => {
                const who = assigned[m.memberId];
                return (
                  <div className={`mwl-row mwl-row-data ${!m.compliant ? 'is-gap' : ''}`} role="row" key={`${m.memberId}-${i}`} style={{ animationDelay: `${i * 20}ms` }}>
                    <span className="mwl-id mono">{m.memberId}</span>
                    <span className="mwl-name">{m.memberName}</span>
                    <span className="ta-r num">{m.age}</span>
                    <span className="mwl-crsp">{m.crsp}</span>
                    <span className={`mwl-status ${m.compliant ? 'is-ok' : 'is-gap'}`}>
                      <span aria-hidden="true">{m.compliant ? '✓' : '✕'}</span> {m.compliant ? 'Compliant' : 'Non-compliant'}
                    </span>
                    <span>
                      {who ? <span className="mwl-assigned">{who}</span> : <span className="mwl-unassigned">Unassigned</span>}
                    </span>
                    <span className="ta-r">
                      <button type="button" className={`btn ${who ? 'btn-secondary' : 'btn-primary'} btn-sm`} onClick={() => setModalMember(m)}>
                        {who ? 'Reassign' : 'Assign'}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mwl-pager">
                <button type="button" className="btn btn-secondary btn-icon btn-sm" aria-label="Previous page"
                  disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
                <span className="mwl-pg-info num">{page} / {totalPages}</span>
                <button type="button" className="btn btn-secondary btn-icon btn-sm" aria-label="Next page"
                  disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
              </div>
            )}
            </>
            )}
          </>
        )}
      </div>

      {data?.sample && !loading && <div className="mwl-sample">Showing sample data — live workflow unavailable.</div>}

      {/* Portaled to <body> so the fixed overlay isn't trapped by an ancestor's
          stacking/transform context (it would otherwise dim only the content card). */}
      {modalMember && createPortal(
        <AssignModal member={modalMember} providerName={providerName} current={assigned[modalMember.memberId]}
          onClose={() => setModalMember(null)} onSave={saveAssignment} />,
        document.body
      )}

      {/* Assign, launched from the header (provider-wide) or a stratum's
          Recommended-action button (seeded with that play). Scoped to this
          provider when there is one, else measure-wide; equity is the same
          measure-level set the segmentation card uses. */}
      {assignState && measure && createPortal(
        <AssignPanel measure={measure}
          providers={provider ? (provider.overall ? [] : [provider]) : []}
          equity={equity}
          scope={{
            ...(provider && !provider.overall ? { level: 'provider', provider } : { level: 'measure' }),
            intervention: assignState.intervention,
          }}
          onClose={() => setAssignState(null)}
          onAssign={(payload) => {
            setAssignState(null);
            const where = provider && !provider.overall ? provider.crsp : 'all providers';
            toast({ type: 'success', message: `${payload.preview.created.toLocaleString()} tasks queued for ${where} · ${payload.assignedTo === UNASSIGNED ? 'unassigned pool' : payload.assignedTo}` });
          }} />,
        document.body
      )}
    </div>
  );
};

// ── Equity segmentation card ─────────────────────────────────
// Sits above the member list on a provider worklist and acts as an in-place
// FILTER: picking a stratum narrows the member list below (scoped to the
// provider by the member fetch) without leaving the page; re-picking it clears.
// Each stratum is a color-coded chip. Reads all strata — the equity picture is a
// comparison, so nothing is hidden.
const EquitySegment = ({ equity, loading, measureGoal, selected, onPick, onClear }) => {
  const dims = EQUITY_DIMS.filter((d) => (equity[d.key] || []).length > 0);
  return (
    <div className={`mwl-segment ${selected ? 'is-filtering' : ''}`}>
      <div className="mwl-segment-head">
        <span className="mwl-segment-title">Filter by equity</span>
        <span className="mwl-segment-sub">
          {selected ? <>Showing <strong>{selected.group}</strong> · the list below is filtered</> : 'Pick a stratum to narrow the list below'}
        </span>
        {selected && (
          <button type="button" className="mwl-segment-clear" onClick={onClear}>Clear filter ✕</button>
        )}
      </div>
      {loading ? (
        <div className="mwl-segment-loading">{[...Array(3)].map((_, i) => <Skeleton key={i} height={30} width={120} radius={9999} />)}</div>
      ) : dims.length === 0 ? (
        <div className="mwl-segment-empty">No equity strata for this measure.</div>
      ) : (
        dims.map((d) => (
          <div key={d.key} className="mwl-segment-dim">
            <span className="mwl-segment-dimlabel mono">{d.title}</span>
            <div className="mwl-segment-chips">
              {(equity[d.key] || []).slice().sort((a, b) => num(a.rate) - num(b.rate)).map((g, i) => {
                const gGoal = num(g.goal ?? measureGoal);
                const active = selected && selected.type === d.key && selected.group === g.group;
                return (
                  <button key={i} type="button" aria-pressed={!!active}
                    className={`mwl-segment-chip mwl-segment-chip-${toneFor(g.rate, gGoal)} ${active ? 'is-active' : ''}`}
                    onClick={() => onPick(d.key, g)}>
                    <span className={`mwl-segment-dot mwl-segment-dot-${toneFor(g.rate, gGoal)}`} aria-hidden="true" />
                    <span className="mwl-segment-name">{g.group}</span>
                    <span className="mwl-segment-rate num">{num(g.rate)}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ── Stratum insight card ─────────────────────────────────────
// Shown when a worklist is scoped to an equity stratum (opened on one, or
// filtered to one). Carries the same Behavior / Recommended-action read the
// Overview gives a measure, but framed for the group — reusing the Overview's
// Stage / Signals so it reads identically across surfaces.
const StratumInsight = ({ insight, stratum, loading, onAssign }) => {
  const { read, rec } = insight;
  return (
    <div className={`mwl-insight ${read.isDisparity ? 'is-disparity' : ''}`}>
      <div className="mwl-insight-head">
        <span className="eyebrow">EQUITY INSIGHT · {stratum.group}</span>
        {read.isDisparity && <span className="mwl-insight-flag mono">WIDEST DISPARITY</span>}
      </div>
      {loading ? (
        <Skeleton height={64} radius={10} />
      ) : (
        <div className="ov2-intel">
          <Stage label="Standing" summary={read.synthesis} tag={`Confidence · ${read.confidence.level}`} defaultOpen>
            <Signals items={read.signals} />
            <p className="ov2-read-why mono">{read.confidence.why}</p>
          </Stage>
          {rec && (
            <Stage label="Recommended action" summary={rec.action} tag="Suggested" tagKind="preview">
              <p className="ov2-stage-lead">Targeted at the {stratum.group} group — {rec.action.toLowerCase()}. Because {rec.rationale}.</p>
              <div className="ov2-rec-chips">
                {rec.chips.map((c, i) => <span key={i} className={`ov2-rec-chip mono ${c.strong ? 'is-strong' : ''}`}>{c.label}</span>)}
              </div>
              <p className="ov2-read-why mono">{rec.basis}</p>
              {onAssign && (
                <button type="button" className="btn btn-tonal btn-sm ov2-rec-assign"
                  onClick={() => onAssign(rec.action)}>
                  Assign this intervention
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              )}
            </Stage>
          )}
        </div>
      )}
    </div>
  );
};

// ── Assign-intervention modal ────────────────────────────────
const AssignModal = ({ member, providerName, current, onClose, onSave }) => {
  const [staff, setStaff] = useState(current || STAFF[0]);
  const [intervention, setIntervention] = useState(INTERVENTIONS[0]);
  const [notes, setNotes] = useState('');

  return (
    <div className="mwl-modal-scrim" onClick={onClose}>
      <div className="mwl-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Assign intervention">
        <div className="mwl-modal-head">
          <h3>Assign intervention</h3>
          <button type="button" className="mwl-modal-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="mwl-modal-member">
          <span className="mwl-name">{member.memberName}</span>
          <span className="mwl-id mono">{member.memberId}</span>
          {providerName && <span className="mwl-modal-prov">{providerName}</span>}
        </div>

        <label className="mwl-field">
          <span>Intervention</span>
          <select value={intervention} onChange={(e) => setIntervention(e.target.value)}>
            {INTERVENTIONS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="mwl-field">
          <span>Assign to</span>
          <select value={staff} onChange={(e) => setStaff(e.target.value)}>
            {STAFF.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="mwl-field">
          <span>Notes <em>(optional)</em></span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context for the assignee…" />
        </label>

        <div className="mwl-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => onSave({ member, staff, intervention, notes })}>Assign</button>
        </div>
      </div>
    </div>
  );
};

export default MemberWorklist;
