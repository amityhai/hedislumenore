import React, { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './ProviderInterventionDrawer.css';
import './ProviderShared.css';
import { useAssignments, targetLabel } from '../v2/AssignmentStatus';
import {
  ASSIGN_STATUS_LABEL, DISPOSITIONS, assignedDate, cptCodesFor, daysUntilDue, dispositionFor,
  fmtDate, interventionLabel, interventionMember, interventionStatusMeta, isOverdue, logProviderOutreach,
} from '../../data/providerData';

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M3 3l10 10M13 3L3 13" />
  </svg>
);

const isOpenStatus = (a) => a.status !== 'action_taken' && a.status !== 'closed';

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8.5 3L4.5 7l4 4" />
  </svg>
);

// ── Level 2: acting on one intervention ─────────────────────────────────────
// Mirrors how a care-management tool records an intervention: the delivery
// window up top, a disposition, and the codes that make the work billable.
// Rendered *inside* the member modal's frame rather than layered over it —
// same width, same height, so stepping in and back out doesn't resize the
// dialog under the cursor.
const ActionView = ({ assignment, onBack, onClose, onSubmitted }) => {
  const [disposition, setDisposition] = useState(() => dispositionFor(assignment));
  const [cpt, setCpt] = useState(() => assignment.cpt || []);
  const [note, setNote] = useState('');
  const [logOpen, setLogOpen] = useState(false);

  const codes = cptCodesFor(assignment);
  const left = daysUntilDue(assignment);
  const overdue = isOverdue(assignment);
  const log = [...(assignment.outreachLog || [])].reverse();

  // Rejecting doesn't produce a claim, so codes are only required for work the
  // provider is actually taking on — demanding one to decline would be a
  // dead end.
  const needsCpt = disposition === 'accepted' || disposition === 'delivered';
  const canSubmit = Boolean(disposition) && (!needsCpt || cpt.length > 0);

  const toggleCode = (code) =>
    setCpt((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));

  const handleSubmit = () => {
    if (!canSubmit) return;
    const target = DISPOSITIONS.find((d) => d.key === disposition);
    const updated = logProviderOutreach(assignment, {
      status: target.status,
      note: note.trim(),
      disposition,
      cpt,
    });
    if (updated) onSubmitted(updated);
  };

  return (
    <>
      <div className="pv-drawer-head">
        <button type="button" className="pv-drawer-back" onClick={onBack}>
          <BackIcon />
          <span>All interventions</span>
        </button>
        <div className="pv-drawer-eyebrow">{assignment.measureId} · {assignment.measureName}</div>
        <h2 className="pv-drawer-title">{interventionLabel(assignment)}</h2>
        <button type="button" className="pv-drawer-close" aria-label="Close" onClick={onClose}><CloseIcon /></button>
      </div>

      <div className="pv-drawer-body">
          <div className="pv-window">
            <div className="pv-window-cell">
              <div className="pv-window-label">Assigned Date</div>
              <div className="pv-window-value">{fmtDate(assignedDate(assignment))}</div>
            </div>
            <div className="pv-window-cell">
              <div className="pv-window-label">To be delivered within</div>
              <div className={`pv-window-value ${overdue ? 'is-late' : 'is-clock'}`}>
                {left == null ? '—' : overdue ? `${Math.abs(left)} Days overdue` : `${left} Days`}
              </div>
            </div>
            <div className="pv-window-cell">
              <div className="pv-window-label">To be completed by</div>
              <div className="pv-window-value">{fmtDate(assignment.due)}</div>
            </div>
          </div>

          {assignment.why && <p className="pv-drawer-why">{assignment.why}</p>}

          <div className="pv-field-label">Intervention Status <span className="pv-req">*</span></div>
          <div className="pv-radio-row">
            {DISPOSITIONS.map((d) => (
              <label key={d.key} className={`pv-radio ${disposition === d.key ? 'is-on' : ''}`}>
                <input
                  type="radio"
                  name="pv-disposition"
                  checked={disposition === d.key}
                  onChange={() => setDisposition(d.key)}
                />
                <span>{d.label}</span>
              </label>
            ))}
          </div>

          {needsCpt && (
            <>
              <div className="pv-field-label">CPT Code <span className="pv-req">*</span></div>
              <div className="pv-cpt-row">
                {codes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`pv-cpt ${cpt.includes(code) ? 'is-on' : ''}`}
                    aria-pressed={cpt.includes(code)}
                    onClick={() => toggleCode(code)}
                  >
                    {code}
                    {cpt.includes(code) && <span className="pv-cpt-x" aria-hidden="true">×</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          <textarea
            className="pv-note-input"
            placeholder="Document outreach — call notes, appointment booked, member contacted…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <button type="button" className="pv-log-toggle" onClick={() => setLogOpen((v) => !v)} aria-expanded={logOpen}>
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
                    <div className="pv-log-entry-meta">
                      {new Date(entry.at).toLocaleString()} · marked {ASSIGN_STATUS_LABEL[entry.status] || entry.status}
                      {entry.cpt && entry.cpt.length ? ` · CPT ${entry.cpt.join(', ')}` : ''}
                    </div>
                    {entry.note && <div className="pv-log-entry-note">{entry.note}</div>}
                  </div>
                ))}
              </div>
            )
          )}
      </div>

      <div className="pv-drawer-foot">
        <div className="pv-drawer-foot-actions">
          <button type="button" className="pv-btn" onClick={onBack}>Cancel</button>
          <button type="button" className="pv-btn pv-btn-primary" disabled={!canSubmit} onClick={handleSubmit}>
            Save update
          </button>
        </div>
      </div>
    </>
  );
};

// ── Level 1: everything assigned for one member ─────────────────────────────
// A member rarely carries a single intervention, so acting on one in isolation
// hides the rest of that phone call. This lists every intervention assigned to
// this member across every measure, soonest-due first.
const MemberModal = ({ memberId, memberName, providerName, onClose }) => {
  const [focusId, setFocusId] = useState(null);

  const rows = useAssignments(
    useCallback(
      (all) => all
        .filter((a) => (a.crsp === providerName || (a.providers || []).includes(providerName))
          && interventionMember(a)?.memberId === memberId)
        .sort((a, b) => (a.due || '9999-99-99').localeCompare(b.due || '9999-99-99')),
      [providerName, memberId]
    )
  );

  // The soonest-due item still awaiting action. Highlighted because it's the
  // one thing that has to happen next — everything under it can wait, and
  // saying so is more useful than colouring every open row the same.
  const nextUpId = useMemo(() => (rows.find(isOpenStatus) || {}).id, [rows]);

  const focused = rows.find((a) => a.id === focusId) || null;

  // One frame, two steps. Acting on an intervention swaps the frame's contents
  // rather than stacking a second dialog on top, so both steps are the same
  // size and "All interventions" walks back to where you were.
  if (focused) {
    return (
      <div className="pv-drawer-scrim" onClick={onClose}>
        <div className="pv-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <ActionView
            key={focused.id}
            assignment={focused}
            onBack={() => setFocusId(null)}
            onClose={onClose}
            onSubmitted={() => setFocusId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pv-drawer-scrim" onClick={onClose}>
      <div className="pv-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="pv-drawer-head">
          <div className="pv-drawer-eyebrow">Member ID {memberId}</div>
          <h2 className="pv-drawer-title">{memberName}</h2>
          <button type="button" className="pv-drawer-close" aria-label="Close" onClick={onClose}><CloseIcon /></button>
        </div>

        <div className="pv-drawer-body">
            {rows.length === 0 ? (
              <div className="pv-empty">Nothing assigned for this member.</div>
            ) : (
              <table className="pv-iv-table">
                <thead>
                  <tr>
                    <th>Take action</th>
                    <th>Measure</th>
                    <th>Intervention</th>
                    <th>Status</th>
                    <th className="pv-iv-num">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const meta = interventionStatusMeta(a);
                    const left = daysUntilDue(a);
                    const isNext = a.id === nextUpId;
                    return (
                      <tr key={a.id} className={isNext ? 'is-next' : isOpenStatus(a) ? '' : 'is-done'}>
                        <td>
                          <button
                            type="button"
                            className={`pv-btn pv-iv-act ${isNext ? 'pv-btn-primary' : ''}`}
                            onClick={() => setFocusId(a.id)}
                          >
                            {isOpenStatus(a) ? 'Take action' : 'Review'}
                          </button>
                        </td>
                        <td>
                          <div className="pv-iv-measure">{a.measureName || a.measureId}</div>
                          {isNext && <span className="pv-iv-next">Do this first</span>}
                        </td>
                        <td>{interventionLabel(a)}</td>
                        <td><span className={`pv-status-pill is-${meta.tone}`}>{meta.label}</span></td>
                        <td className={`pv-iv-num ${isOverdue(a) ? 'is-overdue' : ''}`}>
                          <div>{fmtDate(a.due)}</div>
                          {left != null && isOpenStatus(a) && (
                            <div className="pv-iv-left">{left < 0 ? `${Math.abs(left)}d overdue` : `${left}d left`}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
          )}
        </div>
      </div>
    </div>
  );
};

// Portal wrapper — stays mounted with `assignment` possibly null. The clicked
// assignment only identifies *which member* to open; the modal itself is
// member-scoped and re-reads the store, so a submit inside it updates the list
// behind it without any prop plumbing.
const ProviderInterventionDrawer = ({ assignment, providerName, onClose }) => {
  if (!assignment) return null;
  const member = interventionMember(assignment);
  const memberId = member ? member.memberId : assignment.id;
  return createPortal(
    <MemberModal
      key={memberId}
      memberId={memberId}
      memberName={member ? member.memberName : targetLabel(assignment)}
      providerName={providerName}
      onClose={onClose}
    />,
    document.body
  );
};

export default ProviderInterventionDrawer;
