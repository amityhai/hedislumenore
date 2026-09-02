import { useEffect, useState, useCallback } from 'react';
import './AssignmentStatus.css';
import { listAssignments, ASSIGNMENTS_EVENT, ASSIGN_STATUS_LABEL } from './v2utils';

// A live view of the local assignment store. Re-reads whenever the store
// changes (same-tab synthetic event + cross-tab storage event), so a chip
// reflects an assign made moments ago without any prop plumbing.
export const useAssignments = (selector) => {
  const read = useCallback(() => (selector ? selector(listAssignments()) : listAssignments()), [selector]);
  const [value, setValue] = useState(read);
  useEffect(() => {
    const refresh = () => setValue(read());
    refresh();
    window.addEventListener(ASSIGNMENTS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ASSIGNMENTS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [read]);
  return value;
};

// A one-line summary of what a stored assignment targets, for chips and rows.
export const targetLabel = (a) => {
  const t = a.target || {};
  if (t.kind === 'members') return t.label || `${(t.memberIds || []).length} selected members`;
  if (t.kind === 'stratum') return (t.strata || []).map((s) => s.group).join(', ') || 'group';
  return a.crsp ? a.crsp : 'All eligible';
};

// Scenario 1 made concrete: where a measure already carries an active play, the
// bare "Assign intervention" button becomes a status chip that names the action
// taken, who owns it, and how many it covers — with a Manage affordance that
// still opens the assign flow (to reassign, or extend to newly-eligible members).
//
// `onAssign` opens the assign panel (unseeded). When there's no active play it
// IS the assign button; otherwise it hangs off the chip as "Manage".
const AssignmentStatus = ({ measureId, onAssign, className = '' }) => {
  const active = useAssignments(
    useCallback((all) => all.filter((a) => a.measureId === measureId && a.status !== 'closed'), [measureId])
  );

  if (!onAssign) return null;

  if (active.length === 0) {
    return (
      <div className={`asx ${className}`}>
        <button type="button" className="btn btn-assign btn-sm asx-assign" onClick={() => onAssign()}>
          Assign intervention
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    );
  }

  const latest = active[0]; // listAssignments is newest-first
  const covered = active.reduce((s, a) => s + (a.coverEstimate || 0), 0);
  const done = active.some((a) => a.status === 'action_taken');

  return (
    <div className={`asx asx-taken ${className}`}>
      <div className={`asx-chip ${done ? 'is-done' : ''}`}>
        <span className="asx-chip-mark" aria-hidden="true">{done ? '✓' : '●'}</span>
        <span className="asx-chip-body">
          <span className="asx-chip-lead">
            {ASSIGN_STATUS_LABEL[latest.status] || 'Assigned'} · {latest.intervention}
          </span>
          <span className="asx-chip-meta mono">
            {targetLabel(latest)} · {latest.assignedTo}
            {covered > 0 && <> · {covered.toLocaleString()} covered</>}
            {active.length > 1 && <> · {active.length} plays</>}
          </span>
        </span>
      </div>
      <button type="button" className="btn btn-secondary btn-sm asx-manage" onClick={() => onAssign()}>
        Reassign or add
      </button>
    </div>
  );
};

export default AssignmentStatus;
