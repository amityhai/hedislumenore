import React, { useState, useEffect } from 'react';
import './MeasureDetail.css';
import MeasurePerformanceSection from './MeasurePerformanceSection';
import MonthFilter from './MonthFilter';
import { Skeleton } from './ui/Feedback';
import { fetchDashboardMeasures, fetchMeasureStratification, fetchMeasureStratificationEthnicity, fetchMeasureStratificationRace, fetchCRSPLevelData, fetchAgeCRSPDrilldown, fetchRaceCRSPDrilldown, fetchEthnicityCRSPDrilldown, fetchMemberDetails, fetchRaceMemberDetails, fetchEthnicityMemberDetails, fetchCRSPMemberDetails } from '../services/workflowService';

// `selectedMonth` / `onMonthChange` are controlled props from App so the user's
// MonthFilter selection persists across page navigation (e.g. Dashboard →
// Deep Dive → MeasureDetail). All fetches below depend on `selectedMonth`,
// so they automatically refetch when the user picks a different month.
const MeasureDetail = ({ measureId, onBack, onNavigate, token, selectedMonth, onMonthChange, availableMonths }) => {
  const [measure, setMeasure] = useState(null);
  const [stratificationData, setStratificationData] = useState({});
  const [crspData, setCRSPData] = useState([]);
  const [ageCRSPData, setAgeCRSPData] = useState({});
  const [raceCRSPData, setRaceCRSPData] = useState({});
  const [ethnicityCRSPData, setEthnicityCRSPData] = useState({});
  const [expandedAgeGroups, setExpandedAgeGroups] = useState({});
  const [expandedRaceGroups, setExpandedRaceGroups] = useState({});
  const [expandedEthnicityGroups, setExpandedEthnicityGroups] = useState({});
  const [expandedCRSPRows, setExpandedCRSPRows] = useState({});
  const [membersByKey, setMembersByKey] = useState({});
  const [loadingMembers, setLoadingMembers] = useState({});
  const [expandedCRSPLevelRows, setExpandedCRSPLevelRows] = useState({});
  const [crspLevelMembersByKey, setCRSPLevelMembersByKey] = useState({});
  const [loadingCRSPLevelMembers, setLoadingCRSPLevelMembers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allMeasures, setAllMeasures] = useState({ eoc: [], ecds: [], aac: [], uru: [] });
  const [currentDom, setCurrentDom] = useState('eoc');
  const [selectedMeasureId, setSelectedMeasureId] = useState(measureId);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(null);
  const [selectedRaceGroup, setSelectedRaceGroup] = useState(null);
  const [selectedEthnicityGroup, setSelectedEthnicityGroup] = useState(null);
  const [loadingDrill, setLoadingDrill] = useState({}); // `${stratType}-${group}` → bool

  useEffect(() => {
    if (token && measureId) {
      fetchMeasureDetailData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, measureId]);

  // Load default measure when accessing Measure Detail page directly without a measureId
  useEffect(() => {
    if (token && !measureId && !selectedMeasureId) {
      fetchMeasureDetailData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    setSelectedMeasureId(measureId);
  }, [measureId]);

  useEffect(() => {
    if (selectedMeasureId && token) {
      const fetchStrat = async () => {
        try {
          // Find the measure in allMeasures to set it
          for (const category in allMeasures) {
            const found = allMeasures[category].find(m => m.id === selectedMeasureId);
            if (found) {
              setCurrentDom(category);
              setMeasure(found);
              break;
            }
          }

          // Fetch all stratification data at once
          const [ageData, ethnicityData, raceData, crspLevelData] = await Promise.all([
            fetchMeasureStratification(selectedMeasureId, token),
            fetchMeasureStratificationEthnicity(selectedMeasureId, token),
            fetchMeasureStratificationRace(selectedMeasureId, token),
            fetchCRSPLevelData(selectedMeasureId, token)
          ]);

          const mergedStrat = {
            age: ageData?.[selectedMeasureId]?.age || [],
            ethnicity: ethnicityData?.[selectedMeasureId]?.ethnicity || [],
            race: raceData?.[selectedMeasureId]?.race || []
          };

          setStratificationData(mergedStrat);
          setCRSPData(crspLevelData || []);
          setExpandedAgeGroups({});
          setExpandedRaceGroups({});
          setExpandedEthnicityGroups({});
          setAgeCRSPData({});
          setRaceCRSPData({});
          setEthnicityCRSPData({});
          setSelectedAgeGroup(null);
          setSelectedRaceGroup(null);
          setSelectedEthnicityGroup(null);
        } catch (err) {
          setStratificationData({ age: [], ethnicity: [], race: [] });
          setCRSPData([]);
        }
      };

      fetchStrat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMeasureId, token, selectedMonth]);

  const fetchMeasureDetailData = async () => {
    try {
      setLoading(true);
      setError(null);
      const measuresData = await fetchDashboardMeasures(token);
      setAllMeasures(measuresData);
      const allMeasuresList = Object.values(measuresData).flat();

      let foundMeasure = null;
      for (const category in measuresData) {
        const found = measuresData[category].find(m => m.id === measureId);
        if (found) { foundMeasure = found; setCurrentDom(category); break; }
      }
      if (!foundMeasure && allMeasuresList.length > 0) {
        foundMeasure = allMeasuresList[0];
        const fallbackCategory = Object.keys(measuresData).find(cat =>
          measuresData[cat].some(m => m.id === foundMeasure.id)
        );
        setCurrentDom(fallbackCategory || 'eoc');
      }
      if (!foundMeasure) throw new Error(`No measures available`);

      setMeasure(foundMeasure);
      setSelectedMeasureId(foundMeasure.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Expand/collapse a CRSP row → fetch its members (age/race/ethnicity).
  const handleCRSPClick = async (stratGroup, crspName, stratType = 'age') => {
    const key = `${stratType}-${stratGroup}-${crspName}`;
    if (expandedCRSPRows[key]) {
      setExpandedCRSPRows(prev => ({ ...prev, [key]: false }));
      return;
    }
    if (membersByKey[key]) {
      setExpandedCRSPRows(prev => ({ ...prev, [key]: true }));
      return;
    }
    try {
      setLoadingMembers(prev => ({ ...prev, [key]: true }));
      setExpandedCRSPRows(prev => ({ ...prev, [key]: true }));
      let data;
      if (stratType === 'race') {
        data = await fetchRaceMemberDetails({ measureId: selectedMeasureId, raceStrat: stratGroup, crsp: crspName }, token);
      } else if (stratType === 'ethnicity') {
        data = await fetchEthnicityMemberDetails({ measureId: selectedMeasureId, ethnicityStrat: stratGroup, crsp: crspName }, token);
      } else {
        data = await fetchMemberDetails({ measureId: selectedMeasureId, ageStrat: stratGroup, crsp: crspName }, token);
      }
      setMembersByKey(prev => ({ ...prev, [key]: data }));
    } catch (err) {
      // leave row open with empty state
    } finally {
      setLoadingMembers(prev => ({ ...prev, [key]: false }));
    }
  };

  const filterMembersByAgeGroup = (members, ageGroup) => {
    if (!ageGroup) return members;
    return members.filter(member => {
      const age = member.age;
      if (ageGroup === '0-17') return age >= 0 && age <= 17;
      if (ageGroup === '18-64') return age >= 18 && age <= 64;
      if (ageGroup === '65+') return age >= 65;
      return true;
    });
  };

  // ── Generic stratification drill-down (age / race / ethnicity) ──
  const DRILL = {
    age:       { fetcher: fetchAgeCRSPDrilldown,       data: ageCRSPData,       setData: setAgeCRSPData,       expanded: expandedAgeGroups,       setExpanded: setExpandedAgeGroups },
    race:      { fetcher: fetchRaceCRSPDrilldown,      data: raceCRSPData,      setData: setRaceCRSPData,      expanded: expandedRaceGroups,      setExpanded: setExpandedRaceGroups },
    ethnicity: { fetcher: fetchEthnicityCRSPDrilldown, data: ethnicityCRSPData, setData: setEthnicityCRSPData, expanded: expandedEthnicityGroups, setExpanded: setExpandedEthnicityGroups },
  };

  // Toggle a stratification group row; fetch its CRSP breakdown on first open.
  const toggleGroup = async (stratType, group) => {
    const d = DRILL[stratType];
    const willOpen = !d.expanded[group];
    d.setExpanded(prev => ({ ...prev, [group]: willOpen }));
    if (!willOpen || d.data[group]) return; // already loaded
    const dkey = `${stratType}-${group}`;
    try {
      setLoadingDrill(prev => ({ ...prev, [dkey]: true }));
      const data = await d.fetcher(selectedMeasureId, group, token);
      d.setData(prev => ({ ...prev, ...(data || {}) })); // merge so multiple rows stay open
    } catch (err) {
      // leave row open; empty state shows
    } finally {
      setLoadingDrill(prev => ({ ...prev, [dkey]: false }));
    }
  };

  const slugify = (s) => String(s).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const rowId = (stratType, group) => `drill-${stratType}-${slugify(group)}`;

  // Clicking a summary stat card opens that group in its drill-down table and
  // scrolls it into view.
  const openInDrill = (stratType, group) => {
    if (!DRILL[stratType].expanded[group]) toggleGroup(stratType, group); // open + fetch
    setTimeout(() => {
      const el = document.getElementById(rowId(stratType, group));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 90);
  };

  const downloadMembersAsExcel = (members, fileName = 'members.csv') => {
    if (!members || members.length === 0) { alert('No members to download'); return; }
    const headers = ['Member ID', 'Member Name', 'Age', 'Status'];
    const rows = members.map(member => [member.memberId, member.memberName, member.age || '—', member.status || '—']);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Direction A presentation helpers ─────────────────────────
  const goal = measure?.goal ?? 0;
  const statusOf = (rate) => (rate > goal ? 'above' : rate === goal ? 'at' : 'below');
  const sevPill = (rate) => {
    const n = Number(rate);
    if (Number.isNaN(n) || n < 25) return 'md-pill-red';
    if (n < 50) return 'md-pill-amber';
    return 'md-pill-green';
  };
  const isNoDisparity = (d) => !d || /no disparity|none/i.test(String(d));

  const renderMemberTable = (key, group, stratType) => {
    const raw = membersByKey[key] || [];
    const members = stratType === 'age' ? filterMembersByAgeGroup(raw, group) : raw;
    if (loadingMembers[key]) return <div className="md-members-state">Loading members…</div>;
    if (members.length === 0) return <div className="md-members-state">No members found</div>;
    return (
      <div className="md-members">
        <div className="md-members-head">
          <span>MEMBER ID</span>
          <span>MEMBER NAME</span>
          <span>AGE</span>
          <span className="ta-r">
            <button className="md-dl" title="Download CSV" onClick={() => downloadMembersAsExcel(members, 'members.csv')}>↓</button>
          </span>
        </div>
        {members.map((m, i) => (
          <div className="md-members-row" key={i}>
            <span className="num">{m.memberId}</span>
            <span>{m.memberName}</span>
            <span className="num">{m.age || '—'}</span>
            <span className="ta-r">
              <span className={`md-mstatus ${m.status === 'Compliant' ? 'ok' : 'bad'}`}>{m.status || '—'}</span>
            </span>
          </div>
        ))}
      </div>
    );
  };

  const StatCard = ({ row, size, selected, onClick }) => {
    const st = statusOf(row.rate);
    const notMeeting = row.notMeeting ?? (row.denom - row.num);
    return (
      <div className={`stat-card stat-${size} stat-${st} ${selected ? 'is-selected' : ''}`} onClick={onClick}>
        <div className={`stat-accent stat-accent-${st}`} />
        <div className="stat-pad">
          <div className="stat-top">
            <span className="stat-name">{row.group}</span>
            <span className={`stat-rate num stat-rate-${st}`}>{row.rate}%</span>
          </div>
          {size === 'lg' ? (
            <div className="stat-metrics">
              <div><span className="stat-ml">Numerator</span><span className="stat-mv num">{(row.num ?? 0).toLocaleString()}</span></div>
              <div><span className="stat-ml">Denominator</span><span className="stat-mv num">{(row.denom ?? 0).toLocaleString()}</span></div>
              <div><span className="stat-ml">Not meeting</span><span className="stat-mv num">{(notMeeting ?? 0).toLocaleString()}</span></div>
            </div>
          ) : (
            <div className="stat-sub num">{row.num} / {row.denom} · {notMeeting} not meeting</div>
          )}
          <div className="stat-disp">
            <span className="stat-disp-l">Disparity</span>
            {isNoDisparity(row.disparity)
              ? <span className="md-pill-neutral">None</span>
              : <span className="md-pill-red">{row.disparity}</span>}
          </div>
        </div>
      </div>
    );
  };

  // Generic member drill-down table for a stratification (age / race / ethnicity).
  const renderDrill = (stratType, rows, label, headLabel) => {
    const d = DRILL[stratType];
    return (
      <>
        <div className="md-section-head">
          <span className="md-section-title">Member drill-down by {label}</span>
          <span className="md-section-sub-right">Expand a row to reach the worklist</span>
        </div>
        <div className="md-table">
          <div className="md-table-head">
            <span>{headLabel} / CRSP</span>
            <span className="ta-r">DENOM</span>
            <span className="ta-r">NUMER</span>
            <span className="ta-r">NOT MEETING</span>
            <span className="ta-r">RATE</span>
            <span />
          </div>
          {rows.map((row, ri) => {
            const open = d.expanded[row.group];
            const gStatus = statusOf(row.rate);
            const crspList = d.data[row.group]?.crspList || [];
            const gNot = row.notMeeting ?? (row.denom - row.num);
            const drilling = loadingDrill[`${stratType}-${row.group}`];
            return (
              <React.Fragment key={ri}>
                <div id={rowId(stratType, row.group)} className={`md-row md-row-age ${open ? 'is-open' : ''}`} onClick={() => toggleGroup(stratType, row.group)}>
                  <span className="md-name"><span className={`md-chev ${open ? 'open' : ''}`}>▶</span><strong>{row.group}</strong></span>
                  <span className="ta-r num">{(row.denom ?? 0).toLocaleString()}</span>
                  <span className="ta-r num">{(row.num ?? 0).toLocaleString()}</span>
                  <span className="ta-r num md-notmeet">{(gNot ?? 0).toLocaleString()}</span>
                  <span className={`ta-r num md-rate-${gStatus}`}>{row.rate}%</span>
                  <span />
                </div>
                {open && (
                  <div className="md-children">
                    {drilling ? (
                      <div className="md-row-empty">Loading CRSP breakdown…</div>
                    ) : crspList.length > 0 ? (
                      crspList.map((c, ci) => {
                        const ckey = `${stratType}-${row.group}-${c.crsp}`;
                        const copen = expandedCRSPRows[ckey];
                        const cNot = c.denominator - c.numerator;
                        return (
                          <React.Fragment key={ci}>
                            <div className={`md-row md-row-crsp ${copen ? 'is-open' : ''}`} onClick={() => handleCRSPClick(row.group, c.crsp, stratType)}>
                              <span className="md-name md-name-crsp"><span className={`md-chev sm ${copen ? 'open' : ''}`}>▶</span>{c.crsp}</span>
                              <span className="ta-r num">{(c.denominator ?? 0).toLocaleString()}</span>
                              <span className="ta-r num">{(c.numerator ?? 0).toLocaleString()}</span>
                              <span className="ta-r num md-notmeet">{(cNot ?? 0).toLocaleString()}</span>
                              <span className="ta-r"><span className={`md-rate-pill ${sevPill(c.rate)}`}>{c.rate}%</span></span>
                              <span className="ta-r">
                                <button className="md-cac" onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate('cac', selectedMeasureId); }}>Care Action Center →</button>
                              </span>
                            </div>
                            {copen && <div className="md-member-wrap">{renderMemberTable(ckey, row.group, stratType)}</div>}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <div className="md-row-empty">No CRSP breakdown available for this group.</div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </>
    );
  };

  const age = stratificationData.age || [];
  const race = stratificationData.race || [];
  const ethnicity = stratificationData.ethnicity || [];
  const hasStrat = age.length > 0 || race.length > 0 || ethnicity.length > 0;

  return (
    <div className="md">
      <button className="back-btn" onClick={onBack}>← Back to Overview</button>

      <header className="md-head">
        <div>
          <div className="eyebrow">MEASURE DETAIL</div>
          <h1 className="md-title">Deep Dive</h1>
          <p className="md-sub">Performance and equity breakdown{measure?.name ? ` · ${measure.name}` : ''}.</p>
        </div>
        <MonthFilter selectedMonth={selectedMonth} onMonthChange={onMonthChange} availableMonths={availableMonths} />
      </header>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton width="100%" height={150} radius={14} />
          <Skeleton width="100%" height={180} radius={14} />
        </div>
      )}

      {error && <div className="md-error">Error: {error}. Showing fallback data.</div>}

      {!loading && measure && (
        <MeasurePerformanceSection
          token={token}
          initialMeasureId={measureId}
          selectedMonth={selectedMonth}
          onMeasureSelect={(id) => setSelectedMeasureId(id)}
          onDeepDive={() => {}}
          onSimulate={() => onNavigate && onNavigate('sim', selectedMeasureId)}
        />
      )}

      {!loading && hasStrat && (
        <>
          <div className="md-section-head">
            <span className="md-section-title">Stratification</span>
            <span className="md-section-sub">· {measure?.name} · where the gaps concentrate</span>
          </div>

          {age.length > 0 && (
            <>
              <div className="eyebrow md-eyebrow">BY AGE</div>
              <div className="stat-row">
                {age.map((row, i) => (
                  <StatCard key={i} row={row} size="lg" selected={expandedAgeGroups[row.group]}
                    onClick={() => openInDrill('age', row.group)} />
                ))}
              </div>
            </>
          )}

          {race.length > 0 && (
            <>
              <div className="eyebrow md-eyebrow">BY RACE</div>
              <div className="stat-scroll">
                {race.map((row, i) => (
                  <StatCard key={i} row={row} size="sm" selected={expandedRaceGroups[row.group]}
                    onClick={() => openInDrill('race', row.group)} />
                ))}
              </div>
            </>
          )}

          {ethnicity.length > 0 && (
            <>
              <div className="eyebrow md-eyebrow">BY ETHNICITY</div>
              <div className="stat-scroll">
                {ethnicity.map((row, i) => (
                  <StatCard key={i} row={row} size="sm" selected={expandedEthnicityGroups[row.group]}
                    onClick={() => openInDrill('ethnicity', row.group)} />
                ))}
              </div>
            </>
          )}

          {age.length > 0 && renderDrill('age', age, 'age', 'AGE GROUP')}
          {race.length > 0 && renderDrill('race', race, 'race', 'RACE')}
          {ethnicity.length > 0 && renderDrill('ethnicity', ethnicity, 'ethnicity', 'ETHNICITY')}
        </>
      )}
    </div>
  );
};

export default MeasureDetail;
