import React, { useState } from 'react';
import './ProviderScores.css';

const ProviderScores = ({ onBack }) => {
  const [expandedCrsp, setExpandedCrsp] = useState(null);

  const crsps = [
    {
      id: 'CRSP-001',
      name: 'North East Medical Group',
      panel: 4502,
      providers: 12,
      avg: 74.2,
      gaps: { BCSE: 116, CBP: 84, GSD: 92 },
      docs: [
        { name: 'Dr. Sarah Jenkins', spec: 'Internal Medicine', panel: 450, bcs: 78.2, cbp: 68.5, gsd: 58.2 },
        { name: 'Dr. Michael Chen', spec: 'Internal Medicine', panel: 380, bcs: 64.5, cbp: 72.1, gsd: 65.4 },
        { name: 'Dr. Emily Wong', spec: 'Pediatrics', panel: 520, bcs: '-', cbp: 92, gsd: '-' },
      ],
    },
    {
      id: 'CRSP-002',
      name: 'South West Health Alliance',
      panel: 3840,
      providers: 8,
      avg: 68.4,
      gaps: { BCSE: 106, CBP: 112, GSD: 78 },
      docs: [
        { name: 'Dr. Robert Smith', spec: 'Family Practice', panel: 480, bcs: 62.1, cbp: 58.4, gsd: 70.2 },
        { name: 'Dr. Lisa Park', spec: 'Internal Medicine', panel: 360, bcs: 66.8, cbp: 64.2, gsd: 68.9 },
      ],
    },
    {
      id: 'CRSP-004',
      name: 'Metro Health Network',
      panel: 2890,
      providers: 6,
      avg: 58.2,
      gaps: { BCSE: 142, CBP: 98, GSD: 64 },
      docs: [
        { name: 'Dr. James Wilson', spec: 'Family Practice', panel: 520, bcs: 55.4, cbp: 52.8, gsd: 61.2 },
      ],
    },
  ];

  const toggleExpand = (id) => {
    setExpandedCrsp(expandedCrsp === id ? null : id);
  };

  const getRateColor = (rate, threshold = 66) => {
    if (rate === '-') return '#9c9a92';
    return rate >= threshold ? '#27500a' : '#a32d2d';
  };

  return (
    <div className="provider-container">
      <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>

      <div className="provider-header">
        <h1>Provider Scores</h1>
        <p>Performance metrics by provider group and individual clinician.</p>
      </div>

      <div className="search-box">
        <input placeholder="Search CRSP groups..." />
      </div>

      <div className="provider-list">
        {crsps.map((crsp) => (
          <div key={crsp.id} className="crsp-card">
            <div className="crsp-head" onClick={() => toggleExpand(crsp.id)}>
              <div>
                <div className="crsp-name">{crsp.name} ({crsp.id})</div>
                <div className="crsp-meta">
                  Panel: {crsp.panel.toLocaleString()} · Providers: {crsp.providers} · Avg: {crsp.avg}%
                </div>
                <div className="crsp-gaps">
                  Open gaps — BCS-E: {crsp.gaps.BCSE} | CBP: {crsp.gaps.CBP} | GSD: {crsp.gaps.GSD}
                </div>
              </div>
              <span className="expand-icon">View gaps →</span>
            </div>

            {expandedCrsp === crsp.id && (
              <div className="crsp-body">
                <table className="provider-table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Specialty</th>
                      <th>Panel</th>
                      <th>BCS-E Rate</th>
                      <th>CBP Rate</th>
                      <th>GSD Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crsp.docs.map((doc, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{doc.name}</td>
                        <td>{doc.spec}</td>
                        <td>{doc.panel}</td>
                        <td style={{ fontWeight: 600, color: getRateColor(doc.bcs) }}>
                          {doc.bcs === '-' ? '—' : `${doc.bcs}%`}
                        </td>
                        <td style={{ fontWeight: 600, color: getRateColor(doc.cbp, 65) }}>
                          {doc.cbp}%
                        </td>
                        <td style={{ fontWeight: 600, color: getRateColor(doc.gsd, 73) }}>
                          {doc.gsd === '-' ? '—' : `${doc.gsd}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {crsp.providers > crsp.docs.length && (
                  <div className="more-providers">
                    + {crsp.providers - crsp.docs.length} more providers in this group
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProviderScores;
