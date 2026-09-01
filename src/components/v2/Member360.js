import { useState } from 'react';
import { createPortal } from 'react-dom';
import './Member360.css';
import { num, shortId } from './v2utils';
import AssignPanel, { UNASSIGNED } from './AssignPanel';
import { useToast } from '../ui/Toast';
import PageAnalysis from '../ui/PageAnalysis';

const Icon = ({ type }) => {
  const p = type === 'user' ? <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></> : type === 'heart' ? <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5a5.5 5.5 0 0 0 1.1-8.9Z"/> : type === 'calendar' ? <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></> : <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>;
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p}</svg>;
};

const Member360 = ({ member, measure, provider, token, selectedMonth }) => {
  const [assignOpen, setAssignOpen] = useState(false);
  const toast = useToast();
  const resolvedProvider = provider || {
    crsp: member?.crsp || 'Network provider', rate: num(measure?.rate), goal: num(measure?.goal_50th),
    denominator: 1, numerator: member?.compliant ? 1 : 0, overall: false,
  };
  const name = member?.memberName || 'Member';
  const parts = name.replace(',', '').split(/\s+/);
  const initials = `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase();
  const open = !member?.compliant;
  const events = [
    { date: 'Aug 18', title: 'Care gap identified', detail: `${shortId(measure?.measure_id)} added to active worklist`, tone: 'alert' },
    { date: 'Aug 12', title: 'Eligibility refreshed', detail: 'Member remains eligible for the measurement period', tone: 'info' },
    { date: 'Jul 27', title: 'Provider contact', detail: `Attributed to ${provider?.crsp || member?.crsp || 'network provider'}`, tone: 'purple' },
    { date: 'Jun 04', title: 'Claims activity', detail: 'Most recent clinical activity received', tone: 'success' },
  ];
  return (
    <div className="m360">
      <section className="m360-hero">
        <div className="m360-avatar">{initials}</div>
        <div className="m360-identity">
          <span className="m360-kicker">MEMBER 360</span>
          <h1>{name}</h1>
          <div className="m360-tags"><span>Member ID · {member?.memberId || '—'}</span><span>Age · {member?.age || '—'}</span><span>Race · {member?.race || 'Not available'}</span><span>Living · Community</span></div>
        </div>
        <div className="m360-hero-actions">
          <div className="m360-provider"><small>Assigned CRSP</small><strong>{provider?.crsp || member?.crsp || 'Not assigned'}</strong><span className="m360-live"><i /> Active</span></div>
          <PageAnalysis
            context="MEMBER 360"
            title={name}
            summary={open ? `${name} has an open ${shortId(measure?.measure_id)} care gap and is ready for an intervention.` : `${name} currently meets the selected measure.`}
            signals={[
              { label: 'Care-gap status', value: open ? 'Open · action needed' : 'Closed', detail: measure?.display_name, tone: open ? 'critical' : 'positive' },
              { label: 'Assigned provider', value: provider?.crsp || member?.crsp || 'Not assigned', detail: 'Current attribution for this member.' },
              { label: 'Goal impact', value: open ? '1 possible closure' : 'Already counted', detail: `Measure goal is ${num(measure?.goal_50th)}%.` },
            ]}
          />
        </div>
      </section>

      <div className="m360-stats">
        <article><span className="m360-stat-icon is-purple"><Icon type="heart" /></span><span><small>Active care gaps</small><strong className="num">{open ? 1 : 0}</strong><em>{open ? 'Requires action' : 'Up to date'}</em></span></article>
        <article><span className="m360-stat-icon is-blue"><Icon type="calendar" /></span><span><small>Last service</small><strong>{member?.serviceDate && member.serviceDate !== '-' ? member.serviceDate : 'Not found'}</strong><em>Current measurement year</em></span></article>
        <article><span className="m360-stat-icon is-green"><Icon type="clock" /></span><span><small>Measure rate</small><strong className="num">{num(measure?.rate)}%</strong><em>Goal {num(measure?.goal_50th)}%</em></span></article>
        <article><span className="m360-stat-icon is-rose"><Icon type="user" /></span><span><small>Intervention</small><strong>{open ? 'Unassigned' : 'Not needed'}</strong><em>{open ? 'Ready to queue' : 'Gap closed'}</em></span></article>
      </div>

      <div className="m360-grid">
        <section className="m360-card m360-journey">
          <div className="m360-card-head"><div><span className="m360-kicker">LONGITUDINAL VIEW</span><h2>Member journey</h2></div><span>Last 90 days</span></div>
          <div className="m360-timeline">
            {events.map((e) => <article key={e.title}><time>{e.date}</time><i className={`is-${e.tone}`} /><div><strong>{e.title}</strong><p>{e.detail}</p></div></article>)}
          </div>
        </section>
        <aside className="m360-card m360-context">
          <div className="m360-card-head"><div><span className="m360-kicker">HEDIS CONTEXT</span><h2>Current opportunity</h2></div></div>
          <span className="m360-measure-code">{shortId(measure?.measure_id)}</span>
          <h3>{measure?.display_name || 'Selected measure'}</h3>
          <p>{measure?.measure_definition || 'This member is included in the current HEDIS measurement population.'}</p>
          <dl><div><dt>Status</dt><dd className={open ? 'is-alert' : 'is-good'}>{open ? 'Open care gap' : 'Compliant'}</dd></div><div><dt>Data source</dt><dd>{member?.source || '—'}</dd></div><div><dt>Provider</dt><dd>{provider?.crsp || member?.crsp || '—'}</dd></div><div><dt>Goal impact</dt><dd>1 member closure</dd></div></dl>
          <button type="button" className="btn btn-primary" onClick={() => setAssignOpen(true)}>Create intervention</button>
        </aside>
      </div>
      {assignOpen && createPortal(
        <AssignPanel measure={measure} providers={[resolvedProvider]}
          equity={{ age: [], race: [], ethnicity: [] }} token={token} selectedMonth={selectedMonth}
          scope={{ level: 'provider', provider: resolvedProvider, members: [member] }}
          onClose={() => setAssignOpen(false)}
          onAssign={(payload) => {
            setAssignOpen(false);
            toast({ type: 'success', message: `${payload.preview.created.toLocaleString()} task queued · ${payload.assignedTo === UNASSIGNED ? 'unassigned pool' : payload.assignedTo}` });
          }} />,
        document.body
      )}
    </div>
  );
};

export default Member360;
