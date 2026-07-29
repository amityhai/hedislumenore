import React, { useMemo, useState } from 'react';
import './ProviderPerformance.css';
import './ProviderShared.css';
import { categoriesOf, categoryOf, statusFor, STATUS_TONE, pts } from '../v2/v2utils';
import { getProviderProfile, getProviderSummary } from '../../data/providerData';

// Measure-by-measure standing for this provider — the "how am I actually
// doing" surface, worst-gap first so the highest-leverage measure to work is
// always at the top.
const ProviderPerformance = ({ identity }) => {
  const providerName = identity.providerName;
  const profile = useMemo(() => getProviderProfile(providerName), [providerName]);
  const summary = useMemo(() => getProviderSummary(profile), [profile]);
  const categories = useMemo(() => ['All', ...categoriesOf(profile)], [profile]);
  const [cat, setCat] = useState('All');

  const rows = useMemo(() => {
    const filtered = cat === 'All' ? profile : profile.filter((m) => categoryOf(m) === cat);
    return [...filtered].sort((a, b) => (a.rate - a.goal_50th) - (b.rate - b.goal_50th));
  }, [profile, cat]);

  return (
    <div>
      <div className="pv-hero">
        <h1 className="pv-hero-title">Performance</h1>
        <p className="pv-hero-sub">{providerName} — rate vs. goal across every tracked measure.</p>
      </div>

      <div className="pv-perf-kpis">
        <div className="pv-card pv-perf-kpi tone-below">
          <div className="pv-perf-kpi-value">{summary.below}</div>
          <div className="pv-perf-kpi-label">Below goal</div>
        </div>
        <div className="pv-card pv-perf-kpi tone-at">
          <div className="pv-perf-kpi-value">{summary.at}</div>
          <div className="pv-perf-kpi-label">At goal</div>
        </div>
        <div className="pv-card pv-perf-kpi tone-above">
          <div className="pv-perf-kpi-value">{summary.above}</div>
          <div className="pv-perf-kpi-label">Above goal</div>
        </div>
      </div>

      <div className="pv-cat-tabs">
        {categories.map((c) => (
          <button key={c} type="button" className={`pv-chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="pv-card">
        <table className="pv-table pv-perf-table">
          <thead>
            <tr>
              <th>Measure</th>
              <th>Rate vs. goal</th>
              <th>Gap</th>
              <th>Members</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const status = statusFor(m.rate, m.goal_50th);
              const tone = STATUS_TONE[status] || 'below';
              const gap = Math.round((m.rate - m.goal_50th) * 10) / 10;
              return (
                <tr key={m.measure_id} style={{ cursor: 'default' }}>
                  <td>
                    <div className="pv-perf-name">{m.display_name}</div>
                    <div className="pv-perf-def">{m.measure_definition}</div>
                  </td>
                  <td>
                    <div className="pv-perf-rate-cell">
                      <div className="pv-perf-bar">
                        <div className={`pv-perf-bar-fill is-${tone}`} style={{ width: `${Math.max(4, Math.min(100, m.rate))}%` }} />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{m.rate}% / {m.goal_50th}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`pv-perf-gap ${gap < 0 ? 'is-neg' : gap > 0 ? 'is-pos' : ''}`}>
                      {gap >= 0 ? '+' : '−'}{pts(Math.abs(gap))}
                    </span>
                  </td>
                  <td>{m.numerator}/{m.denominator}</td>
                  <td><span className={`pv-status-pill is-${tone === 'below' ? 'error' : tone === 'above' ? 'success' : 'info'}`}>{status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProviderPerformance;
