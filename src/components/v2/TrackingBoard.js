import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './TrackingBoard.css';
import { Skeleton, EmptyState } from '../ui/Feedback';
import { useToast } from '../ui/Toast';
import useAsync from '../../hooks/useAsync';
import {
  TRACK_DONUTS, sampleInpatientMembers, RISK_TONE,
} from './recidivismData';

// Categorical palette for the donuts — status tones stay semantic (High/Med/Low),
// the rest draw from a calm brand-adjacent set.
const TONE_COLOR = {
  below: '#d9544d', warn: '#c98a1a', above: '#1f9d6b',
  v1: '#0e8a8c', v2: '#7c6cf0', v3: '#3f74c9', v4: '#e0973a', v5: '#9aa6ad',
};

const PAGE_SIZE = 8;

// ── Donut chart ──────────────────────────────────────────────────────
const Donut = ({ title, slices }) => {
  const total = Math.max(1, slices.reduce((a, s) => a + s.value, 0));
  const r = 52, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="tb-donut-card">
      <h4 className="tb-donut-title">{title}</h4>
      <div className="tb-donut-body">
        <svg className="tb-donut-svg" viewBox="0 0 140 140" role="img" aria-label={title}>
          <circle cx="70" cy="70" r={r} fill="none" stroke="var(--c-border-light)" strokeWidth="16" />
          {slices.map((s) => {
            const len = (s.value / total) * C;
            const seg = (
              <circle
                key={s.label} cx="70" cy="70" r={r} fill="none"
                stroke={TONE_COLOR[s.tone] || '#9aa6ad'} strokeWidth="16"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-acc}
                transform="rotate(-90 70 70)"
              />
            );
            acc += len;
            return seg;
          })}
          <text x="70" y="66" textAnchor="middle" className="tb-donut-total">{total.toLocaleString()}</text>
          <text x="70" y="82" textAnchor="middle" className="tb-donut-totlabel">members</text>
        </svg>
        <ul className="tb-donut-legend">
          {slices.map((s) => (
            <li key={s.label}>
              <span className="tb-legend-dot" style={{ background: TONE_COLOR[s.tone] }} />
              <span className="tb-legend-label">{s.label}</span>
              <span className="tb-legend-val num">{s.value.toLocaleString()}</span>
              <span className="tb-legend-pct num">{((s.value / total) * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const RiskPill = ({ risk }) => (
  <span className={`tb-risk tb-risk-${RISK_TONE[risk]}`}>
    <span className="tb-risk-dot" aria-hidden="true" />{risk}
  </span>
);

// The three intervention lenses ported from the source flow.
const WL_TABS = [
  { key: 'view', label: 'View Intervention' },
  { key: 'facilitate', label: 'Facilitate Intervention' },
  { key: 'automated', label: 'Automated Interventions' },
];
const WL_SUB = {
  view: 'Full member detail, ranked by AI-predicted risk',
  facilitate: 'Review the recommended intervention and assign it inline',
  automated: 'Auto-assigned interventions for high-risk members',
};
// Deterministic automation state for the Automated Interventions lens.
const AUTO_STATUS = [
  { label: 'Queued', tone: 'warn' },
  { label: 'Scheduled', tone: 'info' },
  { label: 'Sent', tone: 'above' },
];
const autoStatus = (m) => AUTO_STATUS[m.id % AUTO_STATUS.length];

const TrackingBoard = () => {
  const [tab, setTab] = useState('risk'); // risk | insights
  const [wlTab, setWlTab] = useState('view'); // view | facilitate | automated
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(null); // member for the profile drawer
  const toast = useToast();

  const { data, loading } = useAsync(async () => {
    return { donuts: TRACK_DONUTS, members: sampleInpatientMembers(47), sample: true };
  }, []);

  const members = data?.members || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q) || String(m.id).includes(q));
  }, [members, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  const pop = useMemo(() => {
    const total = members.length;
    const high = members.filter((m) => m.risk === 'High').length;
    const assessed = members.filter((m) => m.sud !== 'NOT ASSESSED').length;
    const avgAdm = total ? (members.reduce((a, m) => a + m.admissions12mo, 0) / total) : 0;
    return { total, high, assessedPct: total ? Math.round((assessed / total) * 100) : 0, avgAdm: avgAdm.toFixed(1) };
  }, [members]);

  // Population-wide recommended-intervention rollup for the Insights tab.
  const insights = useMemo(() => {
    const map = new Map();
    members.forEach((m) => map.set(m.recommended, (map.get(m.recommended) || 0) + 1));
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [members]);

  const assign = (m) => {
    toast({ type: 'success', message: `${m.recommended} queued for ${m.name.split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ')}` });
    setActive(null);
  };

  return (
    <div className="tb">
      {/* Header */}
      <header className="tb-head">
        <div>
          <div className="eyebrow">RISK TRACKING</div>
          <h1 className="tb-title">Inpatient Analytics &amp; Intervention Assignment</h1>
          <p className="tb-sub">AI-stratified inpatient population — surface the highest-risk members and assign the right intervention.</p>
        </div>
        <div className="tb-seg" role="tablist" aria-label="View">
          <button role="tab" aria-selected={tab === 'risk'} className={`tb-seg-btn ${tab === 'risk' ? 'is-active' : ''}`} onClick={() => setTab('risk')}>Risk Stratification</button>
          <button role="tab" aria-selected={tab === 'insights'} className={`tb-seg-btn ${tab === 'insights' ? 'is-active' : ''}`} onClick={() => setTab('insights')}>Intervention Insights</button>
        </div>
      </header>

      {data?.sample && !loading && (
        <div className="tb-notice" role="status"><span>Demo data — no live inpatient feed connected.</span></div>
      )}

      {/* Population KPIs */}
      <section className="tb-kpis">
        <div className="tb-kpi"><span className="tb-kpi-k">Inpatient members</span><span className="tb-kpi-v num">{loading ? '—' : pop.total.toLocaleString()}</span></div>
        <div className="tb-kpi"><span className="tb-kpi-k">High risk</span><span className="tb-kpi-v num is-neg">{loading ? '—' : pop.high}</span></div>
        <div className="tb-kpi"><span className="tb-kpi-k">SUD assessed</span><span className="tb-kpi-v num">{loading ? '—' : `${pop.assessedPct}%`}</span></div>
        <div className="tb-kpi"><span className="tb-kpi-k">Avg admissions / 12mo</span><span className="tb-kpi-v num">{loading ? '—' : pop.avgAdm}</span></div>
      </section>

      {tab === 'risk' && (
        <>
          {/* Donut grid */}
          <section className="tb-donuts">
            {loading
              ? [...Array(6)].map((_, i) => <Skeleton key={i} height={200} radius={16} />)
              : Object.entries(data.donuts).map(([key, d]) => <Donut key={key} title={d.title} slices={d.slices} />)}
          </section>

          {/* Member worklist */}
          <section className="tb-card">
            <div className="tb-card-head">
              <div>
                <h2 className="tb-card-title">Inpatient member details</h2>
                <span className="tb-card-sub">{WL_SUB[wlTab]}</span>
              </div>
              <label className="tb-search">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input type="text" placeholder="Search name or member ID" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
              </label>
            </div>

            {/* Intervention lenses */}
            <div className="tb-subtabs" role="tablist" aria-label="Intervention view">
              {WL_TABS.map((t) => (
                <button key={t.key} role="tab" aria-selected={wlTab === t.key}
                  className={`tb-subtab ${wlTab === t.key ? 'is-active' : ''}`}
                  onClick={() => setWlTab(t.key)}>{t.label}</button>
              ))}
            </div>

            {loading ? (
              <div className="tb-tbl-skel">{[...Array(6)].map((_, i) => <Skeleton key={i} height={44} radius={8} />)}</div>
            ) : rows.length === 0 ? (
              <EmptyState icon="—" hint="No members match this search." />
            ) : (
              <div className="tb-tbl-scroll">
                <table className="tb-tbl">
                  <thead>
                    <tr>
                      <th className="tb-col-ai">AI Predicted Risk</th>
                      <th>Member</th>
                      {wlTab === 'view' && <><th>ID</th><th>Age</th><th>Ethnicity</th><th>Gender</th><th>Primary disability</th><th>SUD</th><th>LOCUS</th></>}
                      {wlTab === 'facilitate' && <><th>Age</th><th>Primary disability</th><th>SUD</th><th>Recommended intervention</th></>}
                      {wlTab === 'automated' && <><th>Recommended intervention</th><th>Automation</th><th>Status</th></>}
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => {
                      const st = autoStatus(m);
                      return (
                        <tr key={m.id} onClick={() => setActive(m)} className="tb-row">
                          <td className="tb-col-ai"><RiskPill risk={m.risk} /></td>
                          <td className="tb-cell-name">{m.name}</td>

                          {wlTab === 'view' && (
                            <>
                              <td className="mono tb-muted">{m.id}</td>
                              <td className="num">{m.age}</td>
                              <td className="tb-muted">{m.ethnicity}</td>
                              <td>{m.gender}</td>
                              <td>{m.primaryDisability}</td>
                              <td><span className={`tb-sud ${m.sud === 'NOT ASSESSED' ? 'is-warn' : ''}`}>{m.sud}</span></td>
                              <td className="tb-muted">{m.locus}</td>
                            </>
                          )}
                          {wlTab === 'facilitate' && (
                            <>
                              <td className="num">{m.age}</td>
                              <td>{m.primaryDisability}</td>
                              <td><span className={`tb-sud ${m.sud === 'NOT ASSESSED' ? 'is-warn' : ''}`}>{m.sud}</span></td>
                              <td className="tb-cell-reco">{m.recommended}</td>
                            </>
                          )}
                          {wlTab === 'automated' && (
                            <>
                              <td className="tb-cell-reco">{m.recommended}</td>
                              <td>{m.risk === 'High' ? <span className="tb-auto on">Enabled</span> : <span className="tb-auto off">Manual</span>}</td>
                              <td>{m.risk === 'High' ? <span className={`tb-status tb-status-${st.tone}`}>{st.label}</span> : <span className="tb-muted">—</span>}</td>
                            </>
                          )}

                          <td className="tb-row-actions">
                            {wlTab === 'view' && (
                              <button type="button" className="tb-link" onClick={(e) => { e.stopPropagation(); setActive(m); }}>View profile</button>
                            )}
                            {wlTab === 'facilitate' && (
                              <button type="button" className="btn btn-assign btn-sm" onClick={(e) => { e.stopPropagation(); assign(m); }}>Assign</button>
                            )}
                            {wlTab === 'automated' && (
                              m.risk === 'High'
                                ? <button type="button" className="tb-link" onClick={(e) => { e.stopPropagation(); toast({ type: 'info', message: `Automation paused for ${m.name}` }); }}>Pause</button>
                                : <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); toast({ type: 'success', message: `Automation enabled for ${m.name}` }); }}>Enable</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filtered.length > PAGE_SIZE && (
              <div className="tb-pager">
                <span className="tb-pager-info">
                  {clampedPage * PAGE_SIZE + 1}–{Math.min(filtered.length, (clampedPage + 1) * PAGE_SIZE)} of {filtered.length}
                </span>
                <div className="tb-pager-btns">
                  <button type="button" disabled={clampedPage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>‹</button>
                  {Array.from({ length: pageCount }).map((_, i) => (
                    <button key={i} className={i === clampedPage ? 'is-active' : ''} onClick={() => setPage(i)}>{i + 1}</button>
                  ))}
                  <button type="button" disabled={clampedPage >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>›</button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'insights' && (
        <section className="tb-card">
          <div className="tb-card-head">
            <div>
              <h2 className="tb-card-title">Recommended interventions</h2>
              <span className="tb-card-sub">AI-recommended next action across the inpatient population</span>
            </div>
          </div>
          {loading ? (
            <div className="tb-tbl-skel">{[...Array(6)].map((_, i) => <Skeleton key={i} height={44} radius={8} />)}</div>
          ) : (
            <div className="tb-insights">
              {insights.map((r) => {
                const max = Math.max(1, ...insights.map((x) => x.count));
                return (
                  <div key={r.name} className="tb-insight-row">
                    <span className="tb-insight-name">{r.name}</span>
                    <span className="tb-insight-track"><span className="tb-insight-fill" style={{ width: `${(r.count / max) * 100}%` }} /></span>
                    <span className="tb-insight-count num">{r.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Member profile drawer */}
      {active && createPortal(
        <div className="tb-drawer-scrim" onClick={() => setActive(null)}>
          <aside className="tb-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Profile for ${active.name}`}>
            <header className="tb-drawer-head">
              <div>
                <div className="eyebrow">MEMBER PROFILE</div>
                <h3 className="tb-drawer-name">{active.name}</h3>
                <span className="mono tb-drawer-id">ID {active.id}</span>
              </div>
              <button type="button" className="tb-drawer-close" onClick={() => setActive(null)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </header>
            <div className="tb-drawer-risk"><RiskPill risk={active.risk} /><span className="tb-drawer-risk-note">AI-predicted risk group</span></div>
            <dl className="tb-drawer-grid">
              <Field k="Age" v={active.age} />
              <Field k="Gender" v={active.gender} />
              <Field k="Ethnicity" v={active.ethnicity} />
              <Field k="Primary disability" v={active.primaryDisability} />
              <Field k="Secondary disability" v={active.secondaryDisability} />
              <Field k="SUD" v={active.sud} />
              <Field k="LOCUS level" v={active.locus} />
              <Field k="Admissions (12mo)" v={active.admissions12mo} />
              <Field k="Last admission" v={active.lastAdmission} />
            </dl>
            <div className="tb-drawer-reco">
              <span className="tb-drawer-reco-k">Recommended intervention</span>
              <span className="tb-drawer-reco-v">{active.recommended}</span>
            </div>
            <button type="button" className="btn btn-assign tb-drawer-assign" onClick={() => assign(active)}>
              Assign intervention
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
          </aside>
        </div>,
        document.body
      )}
    </div>
  );
};

const Field = ({ k, v }) => (
  <div className="tb-field"><dt>{k}</dt><dd className="num">{v}</dd></div>
);

export default TrackingBoard;
