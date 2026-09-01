import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './MeasureOverview.css';
import { Skeleton, EmptyState } from '../ui/Feedback';
import { useToast } from '../ui/Toast';
import useAsync from '../../hooks/useAsync';
import AssignPanel, { UNASSIGNED } from './AssignPanel';
import {
  fetchCRSPLevelData,
  fetchMiniChartData,
  fetchMeasureStratification,
  fetchMeasureStratificationRace,
  fetchMeasureStratificationEthnicity,
  fetchMemberDetails,
  fetchRaceMemberDetails,
  fetchEthnicityMemberDetails,
  fetchCRSPMemberDetails,
} from '../../services/workflowService';
import {
  num, shortId, statusFor, STATUS_TONE, sampleProviders, sampleTrend,
  sampleEquity, sampleMembers, memberInStratum, neededToGoal, openGaps,
} from './v2utils';

const fmt = (v) => Math.round(num(v)).toLocaleString();
const gapOf = (rate, goal) => Math.round((num(rate) - num(goal)) * 10) / 10;
const toneOf = (rate, goal) => STATUS_TONE[statusFor(rate, goal)] || 'below';
const isDisparity = (value) => value === true || value === 1 || /^(yes|true|1|disparity)$/i.test(String(value || '').trim());

const STRATIFICATION_DIMS = [
  { key: 'age', title: 'Age' },
  { key: 'race', title: 'Race' },
  { key: 'ethnicity', title: 'Ethnicity' },
];

const MEMBER_STRATIFICATION_DIMS = [
  { key: 'age', title: 'Age', groupLabel: 'Age group', allLabel: 'All ages' },
  { key: 'race', title: 'Race', groupLabel: 'Race group', allLabel: 'All races' },
  { key: 'ethnicity', title: 'Ethnicity', groupLabel: 'Ethnicity group', allLabel: 'All ethnicities' },
];

const isMemberCompliant = (member) => {
  if (typeof member.compliant === 'boolean') return member.compliant;
  const status = String(member.status ?? member.priority ?? '').toLowerCase();
  if (/non|open|gap|incomplete|^0$|false/.test(status)) return false;
  if (/compl|met|closed|^1$|true/.test(status)) return true;
  return !!member.source && member.source !== '-';
};

const normalizeMember = (member, fallbackCrsp) => ({
  ...member,
  memberId: member.memberId || '—',
  memberName: member.memberName || 'Unnamed member',
  age: member.age ?? '—',
  race: member.race || member.raceStrat || '—',
  ethnicity: member.ethnicity || member.ethnicityStrat || '—',
  crsp: member.crsp && member.crsp !== 'NO CRSP' ? member.crsp : (fallbackCrsp || '—'),
  compliant: isMemberCompliant(member),
});

const Icon = ({ name, size = 15 }) => {
  const paths = {
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    trend: <><path d="m4 15 4-4 4 3 7-8"/><path d="M15 6h4v4"/></>,
    gaps: <><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
};

const AiIcon = ({ size = 18, id = 'mov-ai-gradient' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={id} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7c5cff" />
        <stop offset=".52" stopColor="#c34fe4" />
        <stop offset="1" stopColor="#2ba7df" />
      </linearGradient>
    </defs>
    <path d="M12 2.8c.7 4.6 2.6 6.5 7.2 7.2-4.6.7-6.5 2.6-7.2 7.2-.7-4.6-2.6-6.5-7.2-7.2 4.6-.7 6.5-2.6 7.2-7.2Z" stroke={`url(#${id})`} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M19 15.5c.25 1.8 1.2 2.75 3 3-1.8.25-2.75 1.2-3 3-.25-1.8-1.2-2.75-3-3 1.8-.25 2.75-1.2 3-3Z" stroke={`url(#${id})`} strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const MeasureAiInsightDrawer = ({ measure, rate, goal, gap, open, need, providers, providerStats, lowestEquity, trend, onClose }) => {
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const rankedProviders = [...(providers || [])].sort((a, b) => num(a.rate) - num(b.rate));
  const largestOpportunity = rankedProviders[0];
  const trendRows = trend || [];
  const latestTrend = trendRows[trendRows.length - 1];
  const previousTrend = trendRows[trendRows.length - 2];
  const momentum = latestTrend && previousTrend
    ? Math.round((num(latestTrend.rate) - num(previousTrend.rate)) * 10) / 10
    : null;
  const standing = gap < 0 ? `${Math.abs(gap)} points below goal` : gap > 0 ? `${gap} points above goal` : 'at goal';

  return (
    <div className="mov-ai-scrim" onClick={onClose}>
      <aside className="mov-ai-drawer" role="dialog" aria-modal="true" aria-labelledby="mov-ai-title" onClick={(event) => event.stopPropagation()}>
        <header className="mov-ai-drawer-head">
          <div className="mov-ai-drawer-brand"><AiIcon size={22} id="mov-ai-drawer-gradient" /><span>AI page analysis</span></div>
          <button type="button" onClick={onClose} aria-label="Close AI analysis">×</button>
        </header>

        <div className="mov-ai-drawer-body">
          <div className="mov-ai-context">
            <span className="mono">{shortId(measure?.measure_id)}</span>
            <h2 id="mov-ai-title">{measure?.display_name}</h2>
            <p>Generated from the performance, provider, equity, and trend data currently shown on this page.</p>
          </div>

          <section className="mov-ai-summary">
            <span className="mov-ai-label">Executive summary</span>
            <p>
              The measure is <strong>{standing}</strong> at <strong className="num">{rate}%</strong>.
              {' '}There are <strong className="num">{fmt(open)}</strong> open member gaps, and approximately <strong className="num">{fmt(need)}</strong> closures are needed to reach the {goal}% goal.
            </p>
          </section>

          <section className="mov-ai-section">
            <span className="mov-ai-label">Key signals</span>
            <div className="mov-ai-signal-grid">
              <article>
                <small>Provider opportunity</small>
                <strong className="num">{providerStats.below} below goal</strong>
                <p>{largestOpportunity ? `${largestOpportunity.crsp} has the lowest achieved rate at ${num(largestOpportunity.rate)}%.` : 'Provider-level data is not available.'}</p>
              </article>
              <article>
                <small>Equity signal</small>
                <strong>{lowestEquity ? lowestEquity.group : 'Not available'}</strong>
                <p>{lowestEquity ? `${num(lowestEquity.rate)}% achieved · ${fmt(lowestEquity.notMeeting)} members not meeting.` : 'No reported demographic group is available to compare.'}</p>
              </article>
              <article>
                <small>Recent momentum</small>
                <strong className={`num ${momentum == null ? '' : momentum >= 0 ? 'is-positive' : 'is-negative'}`}>{momentum == null ? 'Not available' : `${momentum >= 0 ? '+' : ''}${momentum} pts`}</strong>
                <p>{momentum == null ? 'Not enough periods to calculate movement.' : `Change from the previous reported period.`}</p>
              </article>
            </div>
          </section>

        </div>

        <footer className="mov-ai-drawer-foot">
          <AiIcon size={15} id="mov-ai-foot-gradient" />
          <span>AI-generated guidance should be reviewed alongside clinical and operational context.</span>
        </footer>
      </aside>
    </div>
  );
};

const TrendChart = ({ rows, goal }) => {
  if (!rows?.length) return <EmptyState icon="—" title="No trend available" hint="Current performance is still shown above." />;
  const W = 760; const H = 190; const left = 30; const right = 30; const top = 18; const bottom = 35;
  const values = rows.map((r) => num(r.rate));
  const min = Math.max(0, Math.min(...values, goal) - 8); const max = Math.min(100, Math.max(...values, goal) + 8);
  const x = (i) => left + (i / Math.max(1, rows.length - 1)) * (W - left - right);
  const y = (v) => top + ((max - v) / Math.max(1, max - min)) * (H - top - bottom);
  const points = rows.map((r, i) => `${x(i)},${y(num(r.rate))}`).join(' ');
  const area = `${left},${H - bottom} ${points} ${W - right},${H - bottom}`;
  return (
    <svg className="mov-trend" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Measure rate trend compared with goal">
      {[0, .5, 1].map((p) => <line key={p} x1={left} x2={W-right} y1={top + p*(H-top-bottom)} y2={top + p*(H-top-bottom)} className="mov-gridline" />)}
      <line x1={left} x2={W-right} y1={y(goal)} y2={y(goal)} className="mov-goalline" />
      <text x={W-right} y={y(goal)-7} textAnchor="end" className="mov-goallabel">Goal {goal}%</text>
      <polygon points={area} className="mov-area" />
      <polyline points={points} className="mov-line" />
      {rows.map((r, i) => <g key={`${r.month}-${i}`}><circle cx={x(i)} cy={y(num(r.rate))} r={i === rows.length-1 ? 5 : 3} className={i === rows.length-1 ? 'mov-dot is-last' : 'mov-dot'} /><text x={x(i)} y={H-10} textAnchor="middle" className="mov-month">{String(r.month || '').split('-')[0]}</text></g>)}
    </svg>
  );
};

const ProviderMemberWorkspace = ({
  token, selectedMonth, measure, provider, providers, initialStrat, openCount, equity, onProviderChange, onClose, onAssign,
}) => {
  const [dimension, setDimension] = useState(initialStrat?.type || 'age');
  const [group, setGroup] = useState(initialStrat?.group || 'all');
  const [query, setQuery] = useState('');
  const [gapFilter, setGapFilter] = useState('open');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [expanded, setExpanded] = useState(false);

  const dimensionMeta = MEMBER_STRATIFICATION_DIMS.find((item) => item.key === dimension);
  const dimensionGroups = equity?.[dimension] || [];
  const activeGroup = group === 'all' ? null : dimensionGroups.find((item) => item.group === group) || null;
  const measureId = measure?.measure_id;
  const providerCrsp = provider?.crsp;
  const workspaceTitle = providerCrsp || 'Overall';
  const workspaceSubtitle = providerCrsp ? 'open members' : `open members across all providers`;

  const { data, loading, error, refetch } = useAsync(async () => {
    try {
      let rows;
      if (activeGroup && dimension === 'age') {
        rows = await fetchMemberDetails({ measureId, ageStrat: activeGroup.group, crsp: providerCrsp }, token);
      } else if (activeGroup && dimension === 'race') {
        rows = await fetchRaceMemberDetails({ measureId, raceStrat: activeGroup.group, crsp: providerCrsp }, token);
      } else if (activeGroup && dimension === 'ethnicity') {
        rows = await fetchEthnicityMemberDetails({ measureId, ethnicityStrat: activeGroup.group, crsp: providerCrsp }, token);
      } else if (providerCrsp) {
        rows = await fetchCRSPMemberDetails({ measureId, crsp: providerCrsp }, token);
      } else {
        rows = await fetchMemberDetails({ measureId }, token);
      }
      if (!rows?.length) throw new Error('empty');
      return { rows: rows.map((member) => normalizeMember(member, providerCrsp)), sample: false };
    } catch (fetchError) {
      const pool = sampleMembers(36, providerCrsp);
      const rows = activeGroup
        ? pool.filter((member) => memberInStratum(member, { dim: dimension, group: activeGroup.group }))
        : pool;
      return { rows: rows.map((member) => normalizeMember(member, providerCrsp)), sample: true };
    }
  }, [measureId, providerCrsp, dimension, group, token, selectedMonth], {
    enabled: !!token && !!measureId && (!!providerCrsp || !!activeGroup),
  });

  const members = data?.rows || [];
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      const gapMatch = gapFilter === 'all'
        || (gapFilter === 'open' && !member.compliant)
        || (gapFilter === 'closed' && member.compliant);
      if (!gapMatch) return false;
      if (!needle) return true;
      return [member.memberName, member.memberId, member.race, member.ethnicity, member.age]
        .some((value) => String(value ?? '').toLowerCase().includes(needle));
    });
  }, [members, query, gapFilter]);

  useEffect(() => { setSelectedIds(new Set()); }, [dimension, group, gapFilter]);

  const selectableIds = shown.filter((member) => !member.compliant).map((member) => member.memberId);
  const allSelectableSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const selectedMembers = members.filter((member) => selectedIds.has(member.memberId));
  const toggleMember = (id) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelectedIds((current) => {
    if (allSelectableSelected) {
      const next = new Set(current);
      selectableIds.forEach((id) => next.delete(id));
      return next;
    }
    return new Set([...current, ...selectableIds]);
  });

  const resultLabel = `${dimensionMeta.title}: ${activeGroup?.group || dimensionMeta.allLabel}`;

  return (
    <section
      id="mov-provider-member-workspace"
      className={`mov-member-workspace ${expanded ? 'is-expanded' : ''}`}
      aria-label={`Members for ${workspaceTitle}`}
    >
      <div className="mov-member-handle" aria-hidden="true" />
      <header className="mov-member-head">
        <div className="mov-member-context">
          <label className="mov-member-provider-switch">
            <span className="sr-only">Change provider</span>
            <select value={providerCrsp || ''} onChange={(event) => onProviderChange(event.target.value)}>
              <option value="">Overall</option>
              {(providers || []).filter((item) => item?.crsp && item.crsp !== 'Overall').map((item, index) => (
                <option key={`${item.crsp}-${index}`} value={item.crsp}>{item.crsp}</option>
              ))}
            </select>
          </label>
          <span><strong className="num">{fmt(openCount)}</strong> {workspaceSubtitle}</span>
        </div>
        <div className="mov-member-head-actions">
          <button type="button" aria-label={expanded ? 'Restore member panel size' : 'Expand member panel'} onClick={() => setExpanded((value) => !value)}>
            {expanded ? '↙' : '↗'}
          </button>
          <button type="button" aria-label="Close member panel" onClick={onClose}>×</button>
        </div>
      </header>

      <div className="mov-member-filters">
        <div className="mov-member-filter-row">
          <span className="mov-member-filter-label">Stratify by</span>
          <div className="mov-member-dimensions" role="tablist" aria-label="Member stratification dimension">
            {MEMBER_STRATIFICATION_DIMS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={dimension === item.key}
                className={dimension === item.key ? 'is-active' : ''}
                onClick={() => {
                  setDimension(item.key);
                  setGroup('all');
                  setSelectedIds(new Set());
                }}
              >
                {item.title}
              </button>
            ))}
          </div>
          <label className="mov-member-search">
            <Icon name="search" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members" />
          </label>
          <label className="mov-member-gap-filter">
            <span className="sr-only">Care gap status</span>
            <select value={gapFilter} onChange={(event) => setGapFilter(event.target.value)}>
              <option value="open">Open care gaps</option>
              <option value="closed">Compliant</option>
              <option value="all">All members</option>
            </select>
          </label>
        </div>

        <div className="mov-member-filter-row is-groups">
          <span className="mov-member-filter-label">{dimensionMeta.groupLabel}</span>
          <div className="mov-member-groups" role="group" aria-label={dimensionMeta.groupLabel}>
            <button type="button" aria-pressed={group === 'all'} className={group === 'all' ? 'is-active' : ''} onClick={() => setGroup('all')}>
              {dimensionMeta.allLabel}
            </button>
            {dimensionGroups.map((item, index) => (
              <button
                type="button"
                key={`${item.group}-${index}`}
                aria-pressed={group === item.group}
                className={group === item.group ? 'is-active' : ''}
                onClick={() => setGroup(item.group)}
              >
                {item.group || 'Not reported'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mov-member-results">
        <div className="mov-member-results-meta">
          <span>Showing <strong className="num">{shown.length}</strong> members</span>
          <span aria-hidden="true">•</span>
          <strong>{resultLabel}</strong>
          {data?.sample && <span className="mov-member-sample">Sample data</span>}
        </div>

        {error ? (
          <div className="mov-member-state">Members could not be loaded. <button type="button" onClick={refetch}>Try again</button></div>
        ) : loading ? (
          <div className="mov-member-loading">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} height={34} radius={7} />)}</div>
        ) : shown.length === 0 ? (
          <div className="mov-member-state">No members match these filters.</div>
        ) : (
          <div className="mov-member-table-scroll">
            <table className="mov-member-table">
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Select all open members shown" checked={allSelectableSelected} onChange={toggleAll} /></th>
                  <th>Member</th>
                  <th>Age</th>
                  <th>Race</th>
                  <th>Ethnicity</th>
                  <th>Care gap</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((member, index) => (
                  <tr key={`${member.memberId}-${index}`} className={selectedIds.has(member.memberId) ? 'is-selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${member.memberName}`}
                        checked={selectedIds.has(member.memberId)}
                        disabled={member.compliant}
                        onChange={() => toggleMember(member.memberId)}
                      />
                    </td>
                    <td><strong>{member.memberName}</strong><small className="mono">{member.memberId}</small></td>
                    <td className="num">{member.age}</td>
                    <td>{member.race}</td>
                    <td>{member.ethnicity}</td>
                    <td><span className={`mov-member-gap ${member.compliant ? 'is-closed' : 'is-open'}`}><i />{member.compliant ? 'Compliant' : 'Open gap'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer className="mov-member-footer">
        <span><strong className="num">{selectedIds.size}</strong> {selectedIds.size === 1 ? 'member' : 'members'} selected</span>
        <button type="button" className="btn btn-assign" disabled={selectedIds.size === 0} onClick={() => onAssign(selectedMembers)}>
          Assign intervention
        </button>
      </footer>
    </section>
  );
};

const StratificationSection = ({ equity, loading, measure, goal, onOpenMembers }) => (
  <section className="mov-card mov-stratification" aria-labelledby="mov-stratification-title">
    <div className="mov-strat-head">
      <div>
        <span className="mov-kicker">MEASURE STRATIFICATION</span>
        <h2 id="mov-stratification-title">Performance by demographic group</h2>
        <p>All reported groups for the selected period.</p>
      </div>
      <div className="mov-strat-legend" aria-label="Performance status legend">
        <span className="is-below"><i />Below goal</span>
        <span className="is-at"><i />At goal</span>
        <span className="is-above"><i />Above goal</span>
        <span className="is-disparity"><i />Disparity flagged</span>
      </div>
    </div>

    {loading ? (
      <div className="mov-strat-loading">
        {STRATIFICATION_DIMS.map((dimension) => <Skeleton key={dimension.key} height={310} radius={13} />)}
      </div>
    ) : (
      <div className="mov-strat-panels">
        {STRATIFICATION_DIMS.map((dimension) => {
          const groups = equity?.[dimension.key] || [];
          return (
            <section className="mov-strat-panel" key={dimension.key} aria-labelledby={`mov-strat-${dimension.key}`}>
              <div className="mov-strat-panel-head">
                <h3 id={`mov-strat-${dimension.key}`}>By {dimension.title.toLowerCase()}</h3>
                <span>{groups.length} {groups.length === 1 ? 'group' : 'groups'} · Goal {goal}%</span>
              </div>

              {groups.length === 0 ? (
                <div className="mov-strat-empty">No {dimension.key} stratification was reported for this measure.</div>
              ) : (
                <div className="mov-strat-list">
                  <div className="mov-strat-columns" aria-hidden="true">
                    <span>Group</span><span>Rate</span><span>Num / Denom</span><span>Not meeting</span><span />
                  </div>
                  {groups.map((group, index) => {
                    const groupGoal = num(group.goal ?? goal);
                    const groupRate = num(group.rate);
                    const groupTone = toneOf(groupRate, groupGoal);
                    const numerator = num(group.num ?? group.numerator);
                    const denominator = num(group.denom ?? group.denominator);
                    const notMeeting = num(group.notMeeting ?? Math.max(0, denominator - numerator));
                    const disparity = isDisparity(group.disparity);
                    return (
                      <button
                        type="button"
                        className={`mov-strat-row is-${groupTone} ${disparity ? 'has-disparity' : ''}`}
                        key={`${dimension.key}-${group.group}-${index}`}
                        aria-label={`${group.group || 'Not reported'}: ${groupRate}% achieved, ${numerator} numerator, ${denominator} denominator, ${notMeeting} not meeting. View members.`}
                        onClick={() => onOpenMembers({ ...group, type: dimension.key, goal: groupGoal })}
                      >
                        <span className="mov-strat-group">
                          <strong>{group.group || 'Not reported'}</strong>
                          {disparity && <em>Disparity</em>}
                        </span>
                        <span className="mov-strat-rate num"><i />{groupRate}%</span>
                        <span className="mov-strat-ratio num"><b>{fmt(numerator)}</b><i>/</i>{fmt(denominator)}</span>
                        <span className="mov-strat-open num">{fmt(notMeeting)}</span>
                        <span className="mov-strat-arrow"><Icon name="arrow" size={12} /></span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    )}
  </section>
);

const MeasureOverview = ({ token, selectedMonth, measure, breadcrumb }) => {
  const [query, setQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('All');
  const [memberWorkspace, setMemberWorkspace] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [assignScope, setAssignScope] = useState(null);
  const toast = useToast();
  const goal = num(measure?.goal_50th); const rate = num(measure?.rate); const gap = gapOf(rate, goal);
  const tone = toneOf(rate, goal); const eligible = num(measure?.denominator); const compliant = num(measure?.numerator);
  const open = openGaps(measure); const need = neededToGoal(measure);

  const { data, loading } = useAsync(async () => {
    try {
      const [providers, trend, ageRaw, raceRaw, ethRaw] = await Promise.all([
        fetchCRSPLevelData(measure.measure_id, token), fetchMiniChartData(measure.measure_id, token),
        fetchMeasureStratification(measure.measure_id, token), fetchMeasureStratificationRace(measure.measure_id, token),
        fetchMeasureStratificationEthnicity(measure.measure_id, token),
      ]);
      if (!providers?.length) throw new Error('empty');
      return {
        providers: providers.map((p) => ({ ...p, goal, overall: false })),
        trend: trend?.length ? trend : sampleTrend(measure.measure_id, rate),
        equity: {
          age: ageRaw?.[measure.measure_id]?.age || [], race: raceRaw?.[measure.measure_id]?.race || [],
          ethnicity: ethRaw?.[measure.measure_id]?.ethnicity || [],
        }, sample: false,
      };
    } catch (e) {
      return {
        providers: sampleProviders(measure.measure_id).filter((p) => p.crsp !== 'Overall').map((p) => ({ ...p, goal, overall: false })),
        trend: sampleTrend(measure.measure_id, rate), equity: sampleEquity(measure.measure_id), sample: true,
      };
    }
  }, [measure?.measure_id, token, selectedMonth], { enabled: !!measure?.measure_id && !!token });

  const providers = data?.providers || [];
  const providerStats = useMemo(() => {
    const below = providers.filter((p) => toneOf(p.rate, goal) === 'below').length;
    const at = providers.filter((p) => toneOf(p.rate, goal) === 'at').length;
    const above = providers.length - below - at;
    return { below, at, above, meetingGoal: at + above };
  }, [providers, goal]);

  const providerInsights = useMemo(() => {
    const ranked = [...providers].sort((a, b) => num(a.rate) - num(b.rate));
    const priority = ranked[0];
    const success = ranked[ranked.length - 1];
    return {
      priority,
      priorityOpen: priority ? Math.max(0, num(priority.denominator) - num(priority.numerator)) : 0,
      success,
    };
  }, [providers]);

  const equityRows = useMemo(() => ['age', 'race', 'ethnicity'].flatMap((type) => (data?.equity?.[type] || []).map((x) => ({ ...x, type }))), [data?.equity]);
  const lowestEquity = [...equityRows].sort((a, b) => num(a.rate) - num(b.rate))[0];
  const filtered = providers.filter((p) => {
    const matchesQuery = p.crsp?.toLowerCase().includes(query.toLowerCase());
    const pTone = toneOf(p.rate, goal);
    return matchesQuery && (providerFilter === 'All' || providerFilter.toLowerCase() === pTone);
  }).sort((a, b) => num(a.rate) - num(b.rate));

  useEffect(() => { setMemberWorkspace(null); }, [measure?.measure_id, selectedMonth]);

  return (
    <div className={`mov ${memberWorkspace ? 'has-member-workspace' : ''}`}>
      <div className="mov-topnav">
        {breadcrumb}
        {createPortal(
          <button type="button" className="mov-ai-trigger" onClick={() => setAiOpen(true)} aria-haspopup="dialog">
            <AiIcon id="mov-ai-trigger-gradient" />
            <span>Analyze</span>
          </button>,
          document.body
        )}
      </div>

      <section className="mov-hero">
        <div className="mov-hero-copy">
          <div className="mov-identity"><span className={`mov-code is-${tone} mono`}>{shortId(measure?.measure_id)}</span><span className={`mov-status is-${tone}`}><i />{measure?.kpi_status || statusFor(rate, goal)}</span></div>
          <h1>{measure?.display_name}</h1>
        </div>
        <div className="mov-score">
          <div><small>ACHIEVED RATE</small><strong className="num">{rate}%</strong></div>
          <span className={`mov-delta ${gap < 0 ? 'is-negative' : 'is-positive'} num`}>{gap >= 0 ? '↗' : '↘'} {Math.abs(gap)} pts {gap >= 0 ? 'above' : 'below'} goal</span>
          <div className="mov-goaltrack"><i className={`is-${tone}`} style={{ width: `${Math.min(100, rate)}%` }} /><b style={{ left: `${Math.min(100, goal)}%` }} /></div>
          <div className="mov-goalends"><span>0%</span><strong>Goal {goal}%</strong><span>100%</span></div>
        </div>
      </section>

      <div className="mov-stats">
        <article><span className="mov-stat-icon is-purple"><Icon name="users" /></span><div><small>Denominator</small><strong className="num">{fmt(eligible)}</strong><em>Eligible members</em></div></article>
        <article><span className="mov-stat-icon is-green"><Icon name="target" /></span><div><small>Numerator</small><strong className="num">{fmt(compliant)}</strong><em>Members meeting measure</em></div></article>
        <article><span className="mov-stat-icon is-red"><Icon name="gaps" /></span><div><small>Open member gaps</small><strong className="num">{fmt(open)}</strong><em>Available to work</em></div></article>
        <article><span className="mov-stat-icon is-blue"><Icon name="trend" /></span><div><small>Closures to goal</small><strong className="num">{fmt(need)}</strong><em>To reach {goal}%</em></div></article>
      </div>

      <div className="mov-context-grid">
        <section className="mov-card mov-trend-card">
          <div className="mov-card-head"><div><span className="mov-kicker">PERFORMANCE TREND</span><h2>Rate over time</h2></div><span className="mov-period">Selected period</span></div>
          {loading ? <div className="mov-loading"><Skeleton height={190} radius={12} /></div> : <TrendChart rows={data?.trend} goal={goal} />}
        </section>
        <aside className="mov-card mov-opportunity">
          <div className="mov-card-head"><div><span className="mov-kicker">MEASURE OPPORTUNITY</span><h2>Where to focus</h2></div></div>
          {loading ? <div className="mov-loading"><Skeleton height={190} radius={12} /></div> : <div className="mov-opportunity-body">
            <div className="mov-callout">
              <strong>{providerStats.below} providers need attention</strong>
              <span>Close {fmt(need)} of {fmt(open)} open member gaps to reach the {goal}% goal.</span>
            </div>
            <div className="mov-focus-list">
              <article>
                <span className="mov-focus-icon is-provider"><Icon name="users" /></span>
                <div><small>Priority provider</small>{providerInsights.priority
                  ? <p><strong>{providerInsights.priority.crsp}</strong> has the lowest achieved rate at <strong className="num">{num(providerInsights.priority.rate)}%</strong>, with <strong className="num">{fmt(providerInsights.priorityOpen)}</strong> open member gaps.</p>
                  : <p>Provider-level performance is not available for this period.</p>}</div>
              </article>
              <article>
                <span className="mov-focus-icon is-equity"><Icon name="target" /></span>
                <div><small>Equity opportunity</small>{lowestEquity
                  ? <p><strong>{lowestEquity.group}</strong> has the lowest achieved rate at <strong className="num">{num(lowestEquity.rate)}%</strong>{num(lowestEquity.notMeeting) > 0 ? <>, with <strong className="num">{fmt(lowestEquity.notMeeting)}</strong> members not meeting.</> : '.'}</p>
                  : <p>No demographic opportunity is reported for this period.</p>}</div>
              </article>
              <article>
                <span className="mov-focus-icon is-success"><Icon name="trend" /></span>
                <div><small>Provider success</small>{providerInsights.success
                  ? <p><strong>{providerInsights.success.crsp}</strong> leads at <strong className="num">{num(providerInsights.success.rate)}%</strong>. <strong className="num">{providerStats.meetingGoal}</strong> providers are currently at or above goal.</p>
                  : <p>No provider success signal is available for this period.</p>}</div>
              </article>
            </div>
            <button type="button" className="btn btn-assign" onClick={() => setAssignScope({ level: 'measure' })}>Assign measure intervention</button>
          </div>}
        </aside>
      </div>

      <StratificationSection
        equity={data?.equity}
        loading={loading}
        measure={measure}
        goal={goal}
        onOpenMembers={(strat) => setMemberWorkspace({ provider: null, strat })}
      />

      <section className="mov-card mov-providers">
        <div className="mov-provider-head">
          <div><span className="mov-kicker">PROVIDER PERFORMANCE</span><h2>Providers in this measure</h2><p>Sorted by lowest achieved rate so the largest opportunities appear first.</p></div>
          <div className="mov-provider-tools"><label className="mov-search"><Icon name="search"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search providers" /></label></div>
        </div>
        <div className="mov-provider-filters" role="tablist" aria-label="Filter providers by status">
          {[['All', providers.length], ['Below', providerStats.below], ['At', providerStats.at], ['Above', providerStats.above]].map(([name, count]) => <button key={name} role="tab" aria-selected={providerFilter === name} className={providerFilter === name ? 'is-active' : ''} onClick={() => setProviderFilter(name)}>{name}<span className="num">{count}</span></button>)}
        </div>
        <div className="mov-table-scroll-guide" aria-hidden="true">
          <span className="mov-table-scroll-icon">↔</span>
          <span>Scroll horizontally to view every provider column</span>
          <em>Actions stay pinned</em>
        </div>
        <div className="mov-table-scroll">
          {loading ? <div className="mov-provider-loading">{Array.from({length: 7}).map((_,i) => <Skeleton key={i} height={58} radius={8}/>)}</div> : filtered.length === 0 ? <EmptyState icon="—" title="No providers found" hint="Try another filter or search." /> : <table className="mov-table">
            <thead><tr><th>Provider</th><th>Achieved</th><th>Goal</th><th>Gap</th><th>Eligible</th><th>Compliant</th><th>Open members</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{filtered.map((p, i) => { const pGap = gapOf(p.rate, goal); const pTone = toneOf(p.rate, goal); const pOpen = Math.max(0, num(p.denominator)-num(p.numerator)); const selected = memberWorkspace?.provider?.crsp === p.crsp; const openProvider = () => setMemberWorkspace({ provider: p, strat: null }); return <tr
              key={`${p.crsp}-${i}`}
              className={selected ? 'is-selected' : ''}
              tabIndex={0}
              aria-selected={selected}
              aria-controls="mov-provider-member-workspace"
              onClick={openProvider}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openProvider();
                }
              }}
            >
              <td><span className="mov-provider"><i>{p.crsp?.split(/\s+/).map((x) => x[0]).join('').slice(0,2)}</i><span><strong>{p.crsp}</strong><small>CRSP provider</small></span></span></td>
              <td><strong className="num mov-rate">{num(p.rate)}%</strong></td><td className="num">{goal}%</td><td className={`num ${pGap < 0 ? 'is-negative' : 'is-positive'}`}>{pGap >= 0 ? '+' : ''}{pGap} pts</td><td className="num">{fmt(p.denominator)}</td><td className="num">{fmt(p.numerator)}</td><td><strong className="num">{fmt(pOpen)}</strong><small> open</small></td><td><span className={`mov-row-status is-${pTone}`}><i />{statusFor(p.rate, goal)}</span></td>
              <td><span className="mov-actions"><button type="button" className="btn btn-assign btn-sm" onClick={(event) => { event.stopPropagation(); setAssignScope({ level: 'provider', provider: p }); }}>Assign intervention</button></span></td>
            </tr>;})}</tbody>
          </table>}
        </div>
        {data?.sample && !loading && <p className="mov-sample">Showing representative provider data because the live workflow is unavailable.</p>}
      </section>

      {memberWorkspace && (
        <ProviderMemberWorkspace
          key={`${measure?.measure_id}-${memberWorkspace.provider?.crsp || 'all'}-${memberWorkspace.strat?.type || 'all'}-${memberWorkspace.strat?.group || 'all'}`}
          token={token}
          selectedMonth={selectedMonth}
          measure={measure}
          provider={memberWorkspace.provider}
          providers={providers}
          initialStrat={memberWorkspace.strat}
          openCount={memberWorkspace.provider
            ? Math.max(0, num(memberWorkspace.provider.denominator) - num(memberWorkspace.provider.numerator))
            : num(memberWorkspace.strat?.notMeeting ?? open)}
          equity={data?.equity || { age: [], race: [], ethnicity: [] }}
          onProviderChange={(crsp) => setMemberWorkspace((current) => ({
            ...current,
            provider: crsp ? providers.find((item) => item.crsp === crsp) || null : null,
          }))}
          onClose={() => setMemberWorkspace(null)}
          onAssign={(members) => setAssignScope(memberWorkspace.provider
            ? { level: 'provider', provider: memberWorkspace.provider, members }
            : { level: 'measure', members })}
        />
      )}

      {aiOpen && createPortal(
        <MeasureAiInsightDrawer
          measure={measure}
          rate={rate}
          goal={goal}
          gap={gap}
          open={open}
          need={need}
          providers={providers}
          providerStats={providerStats}
          lowestEquity={lowestEquity}
          trend={data?.trend || []}
          onClose={() => setAiOpen(false)}
        />,
        document.body
      )}

      {assignScope && createPortal(<AssignPanel measure={measure} providers={providers} equity={data?.equity || {age:[],race:[],ethnicity:[]}} scope={assignScope} token={token} selectedMonth={selectedMonth} onClose={() => setAssignScope(null)} onAssign={(payload) => { setAssignScope(null); toast({type:'success', message:`${payload.preview.created.toLocaleString()} tasks queued · ${payload.assignedTo === UNASSIGNED ? 'unassigned pool' : payload.assignedTo}`}); }} />, document.body)}
    </div>
  );
};

export default MeasureOverview;
