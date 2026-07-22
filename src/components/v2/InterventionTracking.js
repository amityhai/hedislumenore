import { useState } from 'react';
import './InterventionTracking.css';
import { EmptyState } from '../ui/Feedback';
import { useToast } from '../ui/Toast';
import {
  shortId, ASSIGN_STATUSES, ASSIGN_STATUS_LABEL, updateAssignment, removeAssignment,
} from './v2utils';
import { useAssignments, targetLabel } from './AssignmentStatus';

// A stratum/population target keeps matching members who enter the pool later —
// so a new arrival in that band is swept into an existing play (scenario 2). An
// explicit member set is fixed and never grows. The badge says which, so the
// reader knows whether a play self-extends or was hand-scoped.
const TARGET_KIND = {
  stratum: { label: 'Group predicate', hint: 'Auto-covers members who enter this group later' },
  population: { label: 'Whole population', hint: 'Auto-covers new non-compliant members' },
  members: { label: 'Fixed member set', hint: 'A hand-picked set — never grows' },
};

const fmtDate = (ms) => {
  try { return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};

const FILTERS = [['all', 'All'], ...ASSIGN_STATUSES.map((s) => [s, ASSIGN_STATUS_LABEL[s]])];

const InterventionTracking = () => {
  const assignments = useAssignments();
  const [filter, setFilter] = useState('all');
  const toast = useToast();

  const counts = ASSIGN_STATUSES.reduce((acc, s) => {
    acc[s] = assignments.filter((a) => a.status === s).length; return acc;
  }, {});
  const rows = filter === 'all' ? assignments : assignments.filter((a) => a.status === filter);

  const setStatus = (a, status) => {
    updateAssignment(a.id, { status });
    toast({ type: 'success', message: `${a.intervention} → ${ASSIGN_STATUS_LABEL[status]}` });
  };
  const drop = (a) => {
    removeAssignment(a.id);
    toast({ type: 'success', message: 'Assignment removed' });
  };

  return (
    <div className="itk">
      <header className="itk-head">
        <div>
          <div className="eyebrow">TRACKING</div>
          <h1 className="itk-title">Intervention Tracking</h1>
          <p className="itk-sub">Every intervention assigned across measures — who owns it, what it covers, and where it stands.</p>
        </div>
        <div className="itk-kpis">
          <div className="itk-kpi"><span className="itk-kpi-k">Total plays</span><span className="itk-kpi-v num">{assignments.length}</span></div>
          <div className="itk-kpi"><span className="itk-kpi-k">Open</span><span className="itk-kpi-v num">{assignments.filter((a) => a.status !== 'closed').length}</span></div>
          <div className="itk-kpi"><span className="itk-kpi-k">Action taken</span><span className="itk-kpi-v num is-pos">{counts.action_taken || 0}</span></div>
        </div>
      </header>

      <div className="itk-card">
        <div className="itk-filters" role="tablist" aria-label="Filter by status">
          {FILTERS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={filter === k}
              className={`itk-filter ${filter === k ? 'is-active' : ''}`} onClick={() => setFilter(k)}>
              {label}
              {k !== 'all' && <span className="itk-filter-n num">{counts[k] || 0}</span>}
            </button>
          ))}
        </div>

        {assignments.length === 0 ? (
          <EmptyState icon="—" title="No interventions assigned yet"
            hint="Assign one from a measure, provider, or the member worklist and it will track here." />
        ) : rows.length === 0 ? (
          <EmptyState icon="—" title={`Nothing ${ASSIGN_STATUS_LABEL[filter]?.toLowerCase() || ''}`}
            hint="Try another status." />
        ) : (
          <div className="itk-list">
            {rows.map((a) => {
              const kind = TARGET_KIND[a.target?.kind] || TARGET_KIND.population;
              return (
                <div key={a.id} className="itk-row">
                  <div className="itk-row-main">
                    <div className="itk-row-top">
                      <span className="itk-mid mono">{shortId(a.measureId)}</span>
                      <span className="itk-measure">{a.measureName || a.measureId}</span>
                      <span className={`itk-status itk-status-${a.status}`}>{ASSIGN_STATUS_LABEL[a.status]}</span>
                    </div>
                    <div className="itk-row-meta">
                      <span className="itk-intervention">{a.intervention}</span>
                      <span className="itk-sep" aria-hidden="true">·</span>
                      <span className="itk-target" title={kind.hint}>
                        {targetLabel(a)} <em className="itk-kind">{kind.label}</em>
                      </span>
                    </div>
                    <div className="itk-row-facts mono">
                      <span>Owner · {a.assignedTo}</span>
                      {a.crsp && <span>Provider · {a.crsp}</span>}
                      {a.coverEstimate > 0 && <span>{a.coverEstimate.toLocaleString()} covered</span>}
                      <span>Assigned {fmtDate(a.createdAt)}</span>
                      {a.due && <span>Due {a.due}</span>}
                    </div>
                    {a.why && <p className="itk-why">{a.why}</p>}
                  </div>
                  <div className="itk-row-actions">
                    <label className="itk-set">
                      <span className="itk-set-k">Status</span>
                      <select value={a.status} onChange={(e) => setStatus(a, e.target.value)}>
                        {ASSIGN_STATUSES.map((s) => <option key={s} value={s}>{ASSIGN_STATUS_LABEL[s]}</option>)}
                      </select>
                    </label>
                    {a.status !== 'action_taken' && a.status !== 'closed' && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStatus(a, 'action_taken')}>
                        Mark action taken
                      </button>
                    )}
                    <button type="button" className="itk-remove" onClick={() => drop(a)} aria-label="Remove assignment">Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterventionTracking;
