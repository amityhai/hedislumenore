import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './MemberWorklist.css';
import { Skeleton, EmptyState, ErrorState } from '../ui/Feedback';
import { useToast } from '../ui/Toast';
import useAsync from '../../hooks/useAsync';
import {
  fetchMemberDetails,
  fetchRaceMemberDetails,
  fetchEthnicityMemberDetails,
  fetchCRSPMemberDetails,
  saveCareAction,
} from '../../services/workflowService';
import { num, statusFor, STATUS_TONE, sampleMembers, STAFF, INTERVENTIONS } from './v2utils';

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

const MemberWorklist = ({ token, selectedMonth, measure, provider, strat }) => {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [ncOnly, setNcOnly] = useState(false);     // show only non-compliant
  const [assigned, setAssigned] = useState({});   // memberId -> staff name
  const [modalMember, setModalMember] = useState(null);

  const measureId = measure?.measure_id;
  const providerCrsp = provider && !provider.overall ? provider.crsp : undefined;

  const { data, loading, error, refetch } = useAsync(async () => {
    try {
      let rows = [];
      if (strat?.type === 'age') rows = await fetchMemberDetails({ measureId, ageStrat: strat.group, crsp: providerCrsp }, token);
      else if (strat?.type === 'race') rows = await fetchRaceMemberDetails({ measureId, raceStrat: strat.group, crsp: providerCrsp }, token);
      else if (strat?.type === 'ethnicity') rows = await fetchEthnicityMemberDetails({ measureId, ethnicityStrat: strat.group, crsp: providerCrsp }, token);
      else rows = await fetchCRSPMemberDetails({ measureId, crsp: provider?.crsp }, token);
      if (!rows || rows.length === 0) throw new Error('empty');
      return { rows: rows.map((r) => normalize(r, providerCrsp)), sample: false };
    } catch (e) {
      return { rows: sampleMembers(20, providerCrsp).map((r) => normalize(r, providerCrsp)), sample: true };
    }
  }, [measureId, providerCrsp, strat?.type, strat?.group, selectedMonth], { enabled: !!token && !!measureId });

  const members = data?.rows || [];
  const nonCompliant = members.filter((m) => !m.compliant).length;
  const compliant = members.length - nonCompliant;

  const shown = useMemo(() => (ncOnly ? members.filter((m) => !m.compliant) : members), [members, ncOnly]);
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const pageRows = useMemo(() => shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [shown, page]);
  const setFilter = (v) => { setNcOnly(v); setPage(1); };

  // Context header metrics.
  const rate = num(strat?.rate ?? provider?.rate ?? measure?.rate);
  const goal = num(strat?.goal ?? provider?.goal ?? measure?.goal_50th);
  const delta = Math.round((rate - goal) * 10) / 10;
  const tone = STATUS_TONE[statusFor(rate, goal)] || 'below';
  const title = strat?.group || (provider && !provider.overall ? provider.crsp : null) || measure?.display_name || 'Members';
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
