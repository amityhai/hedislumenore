import React, { useCallback, useMemo, useState } from 'react';
import './ProviderInterventions.css';
import './ProviderShared.css';
import { useAssignments, targetLabel } from '../v2/AssignmentStatus';
import { interventionStatusMeta, interventionLabel, interventionMember, isOverdue, ASSIGN_STATUS_LABEL } from '../../data/providerData';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'assigned', label: ASSIGN_STATUS_LABEL.assigned },
  { key: 'in_progress', label: ASSIGN_STATUS_LABEL.in_progress },
  { key: 'action_taken', label: ASSIGN_STATUS_LABEL.action_taken },
  { key: 'closed', label: ASSIGN_STATUS_LABEL.closed },
];

// Full worklist of everything assigned to this provider — the "everything I
// need to act on" surface. Filter by status/overdue, search by measure, sort
// soonest-due first so the top of the list is always what to do next.
const ProviderInterventions = ({ identity, onOpenIntervention }) => {
  const providerName = identity.providerName;
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const all = useAssignments(
    useCallback((list) => list.filter((a) => a.crsp === providerName || (a.providers || []).includes(providerName)), [providerName])
  );

  const filtered = useMemo(() => {
    let rows = all;
    if (filter === 'overdue') rows = rows.filter(isOverdue);
    else if (filter !== 'all') rows = rows.filter((a) => a.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((a) =>
        (a.measureName || a.measureId || '').toLowerCase().includes(q) ||
        interventionLabel(a).toLowerCase().includes(q) ||
        (interventionMember(a)?.memberName || targetLabel(a) || '').toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  }, [all, filter, search]);

  return (
    <div>
      <div className="pv-hero">
        <h1 className="pv-hero-title">Interventions</h1>
        <p className="pv-hero-sub">{providerName} — every intervention assigned to your members, across every measure.</p>
      </div>

      <div className="pv-list-header">
        <div className="pv-filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`pv-chip ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="pv-search"
          placeholder="Search by member or measure…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="pv-card">
        {filtered.length === 0 ? (
          <div className="pv-empty">No interventions match this filter.</div>
        ) : (
          <table className="pv-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Measure</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const meta = interventionStatusMeta(a);
                const overdue = isOverdue(a);
                const member = interventionMember(a);
                return (
                  <tr key={a.id} onClick={() => onOpenIntervention(a)}>
                    <td>
                      <div className="pv-td-measure">{member ? member.memberName : targetLabel(a)}</div>
                      <div className="pv-td-meta">
                        {member ? <>ID {member.memberId} · {interventionLabel(a)}</> : interventionLabel(a)}
                      </div>
                    </td>
                    <td>{a.measureName || a.measureId}</td>
                    <td><span className={`pv-status-pill is-${meta.tone}`}>{meta.label}</span></td>
                    <td className={`pv-td-due ${overdue ? 'is-overdue' : ''}`}>{a.due || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ProviderInterventions;
