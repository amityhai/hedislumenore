import React, { useCallback, useMemo } from 'react';
import './ProviderHome.css';
import './ProviderShared.css';
import { useAssignments, targetLabel } from '../v2/AssignmentStatus';
import {
  getProviderProfile, getProviderSummary, getProviderInterventions,
  interventionStatusMeta, interventionLabel, interventionMember, isOverdue, statusFor, num,
} from '../../data/providerData';

// Dashboard — the "eyes on everything" landing page: how much work is open,
// what needs attention first, and how the practice's measures are trending.
const ProviderHome = ({ identity, onNavigate, onOpenIntervention }) => {
  const providerName = identity.providerName;
  const profile = useMemo(() => getProviderProfile(providerName), [providerName]);
  const summary = useMemo(() => getProviderSummary(profile), [profile]);

  const interventions = useAssignments(
    useCallback((all) => all.filter((a) => a.crsp === providerName || (a.providers || []).includes(providerName)), [providerName])
  );

  const open = interventions.filter((a) => a.status !== 'closed');
  const overdue = interventions.filter((a) => isOverdue(a));
  const actionTaken = interventions.filter((a) => a.status === 'action_taken' || a.status === 'closed');

  const needsAttention = [...open]
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'))
    .slice(0, 5);

  const belowGoal = [...profile]
    .filter((m) => statusFor(m.rate, m.goal_50th) === 'Below Goal')
    .sort((a, b) => (a.rate - a.goal_50th) - (b.rate - b.goal_50th))
    .slice(0, 5);

  return (
    <div>
      <div className="pv-hero">
        <h1 className="pv-hero-title">Welcome back, {providerName}</h1>
        <p className="pv-hero-sub">NPI {identity.npi || '—'} · {summary.total} measures tracked · {num(summary.members).toLocaleString()} members in panel</p>
      </div>

      <div className="pv-kpi-row">
        <div className="pv-card pv-kpi">
          <div className="pv-kpi-value">{open.length}</div>
          <div className="pv-kpi-label">Open interventions</div>
        </div>
        <div className={`pv-card pv-kpi ${overdue.length ? 'tone-error' : ''}`}>
          <div className="pv-kpi-value">{overdue.length}</div>
          <div className="pv-kpi-label">Overdue</div>
        </div>
        <div className="pv-card pv-kpi tone-success">
          <div className="pv-kpi-value">{actionTaken.length}</div>
          <div className="pv-kpi-label">Action taken</div>
        </div>
        <div className="pv-card pv-kpi">
          <div className="pv-kpi-value">{summary.below}</div>
          <div className="pv-kpi-label">Measures below goal</div>
        </div>
      </div>

      <div className="pv-two-col">
        <div className="pv-card pv-panel">
          <h2 className="pv-section-title">Needs attention</h2>
          {needsAttention.length === 0 ? (
            <div className="pv-empty">Nothing open right now — you're caught up.</div>
          ) : (
            needsAttention.map((a) => {
              const meta = interventionStatusMeta(a);
              const member = interventionMember(a);
              return (
                <button key={a.id} type="button" className="pv-attn-row" onClick={() => onOpenIntervention(a)}>
                  <div className="pv-attn-main">
                    <div className="pv-attn-measure">{member ? member.memberName : targetLabel(a)} — {interventionLabel(a)}</div>
                    <div className="pv-attn-meta">{a.measureName || a.measureId}{member ? ` · ID ${member.memberId}` : ''}</div>
                  </div>
                  <span className={`pv-status-pill is-${meta.tone}`}>{meta.label}</span>
                  <span className="pv-attn-due">{a.due || '—'}</span>
                </button>
              );
            })
          )}
          {interventions.length > 5 && (
            <button type="button" className="pv-panel-link" onClick={() => onNavigate('interventions')}>
              View all {interventions.length} interventions →
            </button>
          )}
        </div>

        <div className="pv-card pv-panel">
          <h2 className="pv-section-title">Measures to watch</h2>
          {belowGoal.length === 0 ? (
            <div className="pv-empty">Every tracked measure is at or above goal.</div>
          ) : (
            belowGoal.map((m) => (
              <div className="pv-snap-row" key={m.measure_id}>
                <span className="pv-snap-name" title={m.display_name}>{m.display_name}</span>
                <div className="pv-snap-bar">
                  <div className="pv-snap-bar-fill" style={{ width: `${Math.max(4, Math.min(100, m.rate))}%` }} />
                </div>
                <span className="pv-snap-rate">{m.rate}%</span>
              </div>
            ))
          )}
          <button type="button" className="pv-panel-link" onClick={() => onNavigate('performance')}>
            View full performance →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProviderHome;
