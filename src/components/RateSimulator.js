import React, { useState } from 'react';
import './RateSimulator.css';

const RateSimulator = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('single');
  const [selectedMeasure, setSelectedMeasure] = useState('BCS-E');
  const [gapsToClose, setGapsToClose] = useState(0);

  const measures = [
    { id: 'BCS-E', name: 'Breast Cancer Screening', rate: 66, goal: 72, gaps: 538, denom: 1582 },
    { id: 'CBP', name: 'Controlling High Blood Pressure', rate: 65, goal: 68, gaps: 860, denom: 2456 },
    { id: 'CHL', name: 'Chlamydia Screening', rate: 61.1, goal: 65, gaps: 370, denom: 950 },
  ];

  const currentMeasure = measures.find((m) => m.id === selectedMeasure) || measures[0];
  const newNum = currentMeasure.denom * (currentMeasure.rate / 100) + gapsToClose;
  const newRate = (newNum / currentMeasure.denom) * 100;
  const delta = newRate - currentMeasure.rate;
  const gtg = newRate - currentMeasure.goal;
  const gapsNeeded = Math.max(0, Math.ceil((currentMeasure.goal / 100 * currentMeasure.denom) - (currentMeasure.denom * (currentMeasure.rate / 100))));

  const handleMeasureChange = (e) => {
    setSelectedMeasure(e.target.value);
    setGapsToClose(0);
  };

  const handleSliderChange = (e) => {
    setGapsToClose(parseInt(e.target.value));
  };

  return (
    <div className="simulator-container">
      <button className="back-btn" onClick={onBack}>← Back to Overview</button>

      <div className="simulator-header">
        <h1>Rate Simulator <span className="preview-tag">Preview · sample data</span></h1>
        <p>Model gap closure scenarios for individual measures.</p>
      </div>

      <div className="sim-tabs">
        <button
          className={`tab ${activeTab === 'single' ? 'active' : ''}`}
          onClick={() => setActiveTab('single')}
        >
          Single Measure
        </button>
        <button
          className={`tab ${activeTab === 'cross' ? 'active' : ''}`}
          onClick={() => setActiveTab('cross')}
        >
          Cross-Measure
        </button>
      </div>

      {activeTab === 'single' && (
        <div className="sim-single">
          <div className="form-group">
            <label>Select measure</label>
            <select value={selectedMeasure} onChange={handleMeasureChange}>
              {measures.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} — {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="calc-flow">
            <div className="calc-item">
              <div className="calc-label">Denominator</div>
              <div className="calc-value">{currentMeasure.denom.toLocaleString()}</div>
            </div>
            <div className="calc-arrow">→</div>
            <div className="calc-item">
              <div className="calc-label">Numerator</div>
              <div className="calc-value">{Math.round(currentMeasure.denom * (currentMeasure.rate / 100)).toLocaleString()}</div>
            </div>
            <div className="calc-arrow">→</div>
            <div className="calc-item calc-result">
              <div className="calc-label">Current rate</div>
              <div className="calc-value">{currentMeasure.rate}%</div>
            </div>
            <div className="calc-arrow">|</div>
            <div className="calc-item">
              <div className="calc-label">Goal</div>
              <div className="calc-value">{currentMeasure.goal}%</div>
            </div>
            <div className="calc-item">
              <div className="calc-label">Open gaps</div>
              <div className="calc-value" style={{ color: 'var(--c-error)' }}>{currentMeasure.gaps.toLocaleString()}</div>
            </div>
          </div>

          <div className="slider-section">
            <div className="slider-header">
              <span>Gaps to close</span>
              <span className="slider-count">{gapsToClose}</span>
            </div>
            <input
              type="range"
              min="0"
              max={currentMeasure.gaps}
              value={gapsToClose}
              onChange={handleSliderChange}
              className="slider"
            />
            <div className="slider-labels">
              <span>0%</span>
              <span>Goal: {currentMeasure.goal}%</span>
              <span>100%</span>
            </div>
          </div>

          <div className={`sim-result ${gtg >= 0 ? 'goal-met' : ''}`}>
            <div className="result-main">
              <div className="result-label">Projected rate</div>
              <div className="result-value" style={{ color: gtg >= 0 ? 'var(--c-success-text)' : 'var(--c-text)' }}>
                {newRate.toFixed(2)}%
              </div>
              <div className="result-delta" style={{ color: gtg >= 0 ? 'var(--c-success-text)' : 'var(--c-text-4)' }}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(2)}% from current
              </div>
            </div>
            <div className="result-side">
              <div className="result-label">Gap to goal</div>
              <div className="result-value" style={{ color: gtg >= 0 ? 'var(--c-success-text)' : 'var(--c-error)' }}>
                {gtg >= 0 ? '+' : ''}{gtg.toFixed(2)}%
              </div>
              <div className="result-status" style={{ color: gtg >= 0 ? 'var(--c-success-text)' : 'var(--c-text-4)' }}>
                {gtg >= 0 ? 'At or above goal' : 'Below goal'}
              </div>
            </div>
          </div>

          <div className="insight-line">
            💡 You need to close {gapsNeeded} gaps ({((gapsNeeded / currentMeasure.gaps) * 100).toFixed(1)}% of {currentMeasure.gaps}) to reach your {currentMeasure.goal}% goal.
          </div>
        </div>
      )}

      {activeTab === 'cross' && (
        <div className="sim-cross">
          <h3>Cross-measure comparison</h3>
          <p>Compare gap-to-goal across measures. Click any row to simulate.</p>
          <table className="cross-table">
            <thead>
              <tr>
                <th>Measure</th>
                <th>Current rate</th>
                <th>Goal</th>
                <th>Gap to goal</th>
                <th>Open gaps</th>
                <th>Gaps for goal</th>
                <th>Effort</th>
              </tr>
            </thead>
            <tbody>
              {measures.map((m) => {
                const gn = Math.max(0, Math.ceil((m.goal / 100 * m.denom) - (m.denom * (m.rate / 100))));
                const pct = (gn / m.denom) * 100;
                let effort = 'HARD';
                let effortColor = 'var(--c-error)';
                if (pct < 5) {
                  effort = 'EASY';
                  effortColor = 'var(--c-success-text)';
                } else if (pct < 10) {
                  effort = 'MODERATE';
                  effortColor = 'var(--c-warn-text)';
                }
                return (
                  <tr key={m.id} onClick={() => setSelectedMeasure(m.id)}>
                    <td><strong>{m.id}</strong></td>
                    <td>{m.rate}%</td>
                    <td>{m.goal}%</td>
                    <td style={{ color: 'var(--c-error)' }}>{(m.rate - m.goal).toFixed(1)}%</td>
                    <td>{m.gaps}</td>
                    <td>{gn}</td>
                    <td style={{ color: effortColor, fontWeight: 700, fontSize: '11px' }}>{effort}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RateSimulator;
