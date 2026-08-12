import React, { useCallback, useMemo } from 'react';
import './ProviderHome.css';
import './ProviderShared.css';
import { useAssignments } from '../v2/AssignmentStatus';
import {
  getProviderProfile, getProviderSummary,
  interventionMember, isOverdue, statusFor, num,
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

  // How far this practice sits from goal on each measure. Used ONLY to rank the
  // queue — never rendered. A provider works members, not rates: goals are a
  // plan-side construct, so nothing goal-shaped reaches this panel's pixels.
  const shortfallByMeasure = useMemo(() => {
    const map = new Map();
    profile.forEach((m) => map.set(m.measure_id, Math.max(0, m.goal_50th - m.rate)));
    return map;
  }, [profile]);

  // The queue is strictly "members you still have to act on": already-actioned
  // and closed work drops out, and so does anything past due — a past-due item
  // is a plan-side follow-up conversation, not today's outreach list.
  const actionable = useMemo(
    () => interventions.filter((a) => a.status !== 'closed' && a.status !== 'action_taken' && !isOverdue(a)),
    [interventions]
  );

  // One row per *member*, not per intervention. Someone with three open gaps is
  // one phone call that can close three, so they belong at the top — ranked by
  // the total movement closing their gaps would produce.
  const needsAttention = useMemo(() => {
    const byMember = new Map();
    actionable.forEach((a) => {
      const member = interventionMember(a);
      if (!member) return;
      const entry = byMember.get(member.memberId) || { member, items: [] };
      entry.items.push(a);
      byMember.set(member.memberId, entry);
    });
    return [...byMember.values()]
      .map(({ member, items }) => {
        const ranked = [...items].sort(
          (a, b) => (shortfallByMeasure.get(b.measureId) || 0) - (shortfallByMeasure.get(a.measureId) || 0)
        );
        const measures = [...new Set(ranked.map((a) => a.measureName || a.measureId))];
        const impact = ranked.reduce((sum, a) => sum + (shortfallByMeasure.get(a.measureId) || 0), 0);
        return { member, measures, impact, lead: ranked[0] };
      })
      .sort((a, b) => b.impact - a.impact || b.measures.length - a.measures.length)
      .slice(0, 5);
  }, [actionable, shortfallByMeasure]);

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
          <p className="pv-section-sub">Members where your outreach makes the biggest difference.</p>
          {needsAttention.length === 0 ? (
            <div className="pv-empty">Nothing open right now — you're caught up.</div>
          ) : (
            needsAttention.map((g) => (
              <div key={g.member.memberId} className="pv-attn-row">
                <div className="pv-attn-main">
                  <div className="pv-attn-measure">{g.member.memberName}</div>
                  <div className="pv-attn-meta">
                    {/* The measure name is the only part allowed to ellipsize —
                        "+N more" must survive truncation or the row understates
                        how much one call would close. */}
                    <span className="pv-attn-meta-fixed">ID {g.member.memberId} ·&nbsp;</span>
                    <span className="pv-attn-meta-clip">{g.measures[0]}</span>
                    {g.measures.length > 1 && (
                      <span className="pv-attn-meta-fixed">&nbsp;· +{g.measures.length - 1} more</span>
                    )}
                  </div>
                </div>
                <span className="pv-attn-count">
                  {g.measures.length} {g.measures.length === 1 ? 'measure' : 'measures'}
                </span>
                <button
                  type="button"
                  className="pv-btn pv-btn-primary pv-attn-action"
                  onClick={() => onOpenIntervention(g.lead)}
                >
                  Take action
                </button>
              </div>
            ))
          )}
          {interventions.length > needsAttention.length && (
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
