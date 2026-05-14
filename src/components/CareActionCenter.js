import React, { useState } from 'react';
import './CareActionCenter.css';

const CareActionCenter = ({ onBack }) => {
  const [selectedAction, setSelectedAction] = useState(null);

  const kpis = [
    { label: 'Total non-compliant', value: 8234 },
    { label: 'Unassigned', value: 2392, color: '#EF9F27' },
    { label: 'Actionable now', value: 5842, color: '#85b7eb' },
    { label: 'Expiring this week', value: 127, color: '#f09595' },
  ];

  const actions = [
    {
      id: 1,
      memberId: '0094184633',
      name: 'Adams, Daisha',
      measure: 'FUH',
      type: 'Follow-up',
      window: '7-day (03/29)',
      daysLeft: '2 days',
      status: 'Urgent',
      assigned: 'Sarah Jenkins',
      statusColor: '#854f0b',
    },
    {
      id: 2,
      memberId: '0071758297',
      name: 'Brown, Lisa',
      measure: 'FUH',
      type: 'Follow-up',
      window: '7-day (03/15)',
      daysLeft: 'Expired',
      status: 'Expired',
      assigned: 'Michael Chen',
      statusColor: '#a32d2d',
    },
    {
      id: 3,
      memberId: '0048291034',
      name: 'Chen, Michael',
      measure: 'FUH',
      type: 'Follow-up',
      window: '30-day (04/27)',
      daysLeft: '28 days',
      status: 'Actionable',
      assigned: 'Unassigned',
      statusColor: '#27500a',
    },
    {
      id: 4,
      memberId: '0082341122',
      name: 'Smith, Sarah',
      measure: 'BCS-E',
      type: 'Screening',
      window: 'Annual (12/31)',
      daysLeft: '276 days',
      status: 'Actionable',
      assigned: 'Sarah Jenkins',
      statusColor: '#27500a',
    },
  ];

  return (
    <div className="cac-container">
      <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>

      <div className="cac-header">
        <h1>Care Action Center</h1>
        <p>Prioritize and act on open care gaps.</p>
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="kpi-card" style={kpi.color ? { borderBottomColor: kpi.color } : {}}>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{kpi.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="filters">
        <select>
          <option>All Measures</option>
          <option>BCS-E</option>
          <option>FUH</option>
          <option>CHL</option>
        </select>
        <select>
          <option>All Status</option>
          <option>Actionable</option>
          <option>Expired</option>
        </select>
        <select>
          <option>All CRSP Groups</option>
        </select>
        <select>
          <option>All Assigned</option>
        </select>
      </div>

      <table className="actions-table">
        <thead>
          <tr>
            <th>Member ID</th>
            <th>Name</th>
            <th>Measure</th>
            <th>Type</th>
            <th>Window</th>
            <th>Days left</th>
            <th>Status</th>
            <th>Assigned</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action) => (
            <tr key={action.id}>
              <td>{action.memberId}</td>
              <td style={{ fontWeight: 600 }}>{action.name}</td>
              <td>{action.measure}</td>
              <td>{action.type}</td>
              <td>{action.window}</td>
              <td style={{ color: action.statusColor, fontWeight: 600 }}>{action.daysLeft}</td>
              <td style={{ color: action.statusColor, fontWeight: 600 }}>{action.status}</td>
              <td>{action.assigned}</td>
              <td>
                {action.status === 'Expired' ? (
                  <button className="btn-monitor">Monitor only</button>
                ) : (
                  <button className="btn-action" onClick={() => setSelectedAction(action)}>
                    {action.type === 'Follow-up' ? 'Schedule visit' : 'Assign action'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedAction && (
        <div className="modal-overlay" onClick={() => setSelectedAction(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Schedule Follow-up: {selectedAction.name}</h2>
              <button className="modal-close" onClick={() => setSelectedAction(null)}>✕</button>
            </div>
            <div className="modal-info">
              <strong>Member:</strong> {selectedAction.name} · ID: {selectedAction.memberId}
            </div>
            <div className="modal-info" style={{ background: '#faeeda', color: '#633806' }}>
              {selectedAction.measure} — {selectedAction.type}
              <br />
              Window: <strong>{selectedAction.window}</strong>
            </div>
            <div className="form-group">
              <label>Follow-up visit type</label>
              <select>
                <option>Behavioral health outpatient visit</option>
                <option>Telehealth MH visit</option>
                <option>Telephone visit with MH provider</option>
              </select>
            </div>
            <div className="form-group">
              <label>Appointment date</label>
              <input type="date" defaultValue="2026-04-05" />
            </div>
            <div className="form-group">
              <label>Provider</label>
              <select>
                <option>Dr. Sarah Jenkins (Assigned PCP)</option>
                <option>Dr. Patel – Behavioral Health</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setSelectedAction(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => setSelectedAction(null)}>Schedule Visit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareActionCenter;
