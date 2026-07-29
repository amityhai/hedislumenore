import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './ProviderInterventionDrawer.css';
import './ProviderShared.css';
import { targetLabel } from '../v2/AssignmentStatus';
import {
  ASSIGN_STATUSES, ASSIGN_STATUS_LABEL, interventionLabel, interventionMember, isOverdue, logProviderOutreach,
} from '../../data/providerData';

// The actual modal body. Keyed by assignment.id from the wrapper below so a
// fresh instance mounts per intervention — pendingStatus/note start correct
// on the very first render instead of an effect correcting a stale value a
// render later (which would let Save read as enabled for one frame).
const InterventionModal = ({ assignment, onClose, onChange }) => {
  const [note, setNote] = useState('');
  const [pendingStatus, setPendingStatus] = useState(assignment.status);
  const [logOpen, setLogOpen] = useState(false);

  const overdue = isOverdue(assignment);
  const pendingIndex = ASSIGN_STATUSES.indexOf(pendingStatus);
  const hasChanges = pendingStatus !== assignment.status || note.trim().length > 0;

  const handleSave = () => {
    if (!hasChanges) return;
    const updated = logProviderOutreach(assignment, { status: pendingStatus, note: note.trim() });
    setNote('');
    if (updated) onChange(updated);
  };

  const log = [...(assignment.outreachLog || [])].reverse();
  const member = interventionMember(assignment);

  return (
    <div className="pv-drawer-scrim" onClick={onClose}>
      <div className="pv-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="pv-drawer-head" style={{ position: 'relative' }}>
          <div className="pv-drawer-eyebrow">{assignment.measureId} · {assignment.measureName}</div>
          <h2 className="pv-drawer-title">{member ? member.memberName : targetLabel(assignment)}</h2>
          <button type="button" className="pv-drawer-close" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </div>

        <div className="pv-drawer-body">
          {member && (
            <div className="pv-drawer-row">
              <span className="pv-drawer-row-label">Member ID</span>
              <span className="pv-drawer-row-value mono">{member.memberId}</span>
            </div>
          )}
          {member?.age != null && (
            <div className="pv-drawer-row">
              <span className="pv-drawer-row-label">Age</span>
              <span className="pv-drawer-row-value">{member.age}</span>
            </div>
          )}
          {!member && (
            <div className="pv-drawer-row">
              <span className="pv-drawer-row-label">Scope</span>
              <span className="pv-drawer-row-value">{targetLabel(assignment)}</span>
            </div>
          )}
          <div className="pv-drawer-row">
            <span className="pv-drawer-row-label">Intervention</span>
            <span className="pv-drawer-row-value">{interventionLabel(assignment)}</span>
          </div>
          <div className="pv-drawer-row">
            <span className="pv-drawer-row-label">Due</span>
            <span className={`pv-drawer-row-value ${overdue ? 'is-overdue' : ''}`}>{assignment.due || '—'}{overdue ? ' · overdue' : ''}</span>
          </div>

          {assignment.why && <p className="pv-drawer-why">{assignment.why}</p>}

          <div className="pv-stepper">
            {ASSIGN_STATUSES.map((s, i) => (
              <button
                key={s}
                type="button"
                className={`pv-step-btn ${i === pendingIndex ? 'is-current' : i < pendingIndex ? 'is-done' : ''}`}
                onClick={() => setPendingStatus(s)}
                title={`Set ${ASSIGN_STATUS_LABEL[s]}`}
              >
                {ASSIGN_STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="pv-log-toggle"
            onClick={() => setLogOpen((v) => !v)}
            aria-expanded={logOpen}
          >
            <svg className={`pv-log-toggle-chevron ${logOpen ? 'is-open' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 4.5 6 7.5 9 4.5" />
            </svg>
            <span>Outreach log{log.length ? ` (${log.length})` : ''}</span>
          </button>
          {logOpen && (
            log.length === 0 ? (
              <div className="pv-empty" style={{ padding: '16px 0' }}>No outreach documented yet.</div>
            ) : (
              <div className="pv-log">
                {log.map((entry) => (
                  <div className="pv-log-entry" key={entry.at}>
                    <div className="pv-log-entry-meta">{new Date(entry.at).toLocaleString()} · marked {ASSIGN_STATUS_LABEL[entry.status] || entry.status}</div>
                    {entry.note && <div className="pv-log-entry-note">{entry.note}</div>}
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div className="pv-drawer-foot">
          <textarea
            className="pv-note-input"
            placeholder="Document outreach — call notes, appointment booked, member contacted…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="pv-drawer-foot-actions">
            <button type="button" className="pv-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="pv-btn pv-btn-primary" disabled={!hasChanges} onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Portal wrapper — stays mounted with `assignment` possibly null; the modal
// body itself only exists (keyed by id) once an intervention is selected.
const ProviderInterventionDrawer = ({ assignment, onClose, onChange }) => {
  if (!assignment) return null;
  return createPortal(
    <InterventionModal key={assignment.id} assignment={assignment} onClose={onClose} onChange={onChange} />,
    document.body
  );
};

export default ProviderInterventionDrawer;
