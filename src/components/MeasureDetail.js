import React, { useState, useEffect } from 'react';
import './MeasureDetail.css';
import MeasurePerformanceSection from './MeasurePerformanceSection';
import { fetchDashboardMeasures, fetchMeasureStratification, fetchMeasureStratificationEthnicity, fetchMeasureStratificationRace, fetchCRSPLevelData, fetchAgeCRSPDrilldown, fetchRaceCRSPDrilldown, fetchEthnicityCRSPDrilldown, fetchMemberDetails, fetchRaceMemberDetails, fetchEthnicityMemberDetails, fetchCRSPMemberDetails } from '../services/workflowService';

const MeasureDetail = ({ measureId, onBack, onNavigate, token }) => {
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
  const [collapsedSummaryGroups, setCollapsedSummaryGroups] = useState({
    age: false,
    race: false,
    ethnicity: false
  });
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(null);
  const [selectedRaceGroup, setSelectedRaceGroup] = useState(null);
  const [selectedEthnicityGroup, setSelectedEthnicityGroup] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState({
    age: 0,
    race: 0,
    ethnicity: 0
  });

  useEffect(() => {
    if (token && measureId) {
      fetchMeasureDetailData();
    }
  }, [token, measureId]);

  useEffect(() => {
    setSelectedMeasureId(measureId);
  }, [measureId]);

  useEffect(() => {
    if (selectedMeasureId && token) {
      const fetchStrat = async () => {
        try {
          // Find the measure in allMeasures to set it
          let foundMeasure = null;
          for (const category in allMeasures) {
            const found = allMeasures[category].find(m => m.id === selectedMeasureId);
            if (found) {
              foundMeasure = found;
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
          console.error('Error fetching stratification data:', err);
          setStratificationData({ age: [], ethnicity: [], race: [] });
          setCRSPData([]);
        }
      };

      fetchStrat();
    }
  }, [selectedMeasureId, token]);

  // Load CRSP drilldown data only when needed (lazy loading)
  useEffect(() => {
    if (selectedMeasureId && token && (Object.keys(expandedAgeGroups).length > 0 || Object.keys(expandedRaceGroups).length > 0 || Object.keys(expandedEthnicityGroups).length > 0)) {
      const loadCRSPData = async () => {
        try {
          const [ageCrspDrilldownData, raceCrspDrilldownData, ethnicityCrspDrilldownData] = await Promise.all([
            fetchAgeCRSPDrilldown(selectedMeasureId, token),
            fetchRaceCRSPDrilldown(selectedMeasureId, token),
            fetchEthnicityCRSPDrilldown(selectedMeasureId, token)
          ]);

          setAgeCRSPData(ageCrspDrilldownData || {});
          setRaceCRSPData(raceCrspDrilldownData || {});
          setEthnicityCRSPData(ethnicityCrspDrilldownData || {});
        } catch (err) {
          console.error('Error fetching CRSP drilldown data:', err);
        }
      };

      loadCRSPData();
    }
  }, [selectedMeasureId, token, expandedAgeGroups, expandedRaceGroups, expandedEthnicityGroups]);

  const fetchMeasureDetailData = async () => {
    try {
      setLoading(true);
      setError(null);

      const measuresData = await fetchDashboardMeasures(token);
      setAllMeasures(measuresData);
      
      // Collect all measures across all categories
      const allMeasuresList = Object.values(measuresData).flat();

      let foundMeasure = null;
      for (const category in measuresData) {
        const found = measuresData[category].find(m => m.id === measureId);
        if (found) {
          foundMeasure = found;
          setCurrentDom(category);
          break;
        }
      }

      // If the requested measure isn't found, fall back to the first available measure
      if (!foundMeasure && allMeasuresList.length > 0) {
        foundMeasure = allMeasuresList[0];
        const fallbackCategory = Object.keys(measuresData).find(cat =>
          measuresData[cat].some(m => m.id === foundMeasure.id)
        );
        setCurrentDom(fallbackCategory || 'eoc');
        console.warn(`Measure ${measureId} not found. Falling back to ${foundMeasure.id}`);
      }

      if (!foundMeasure) {
        throw new Error(`No measures available`);
      }

      setMeasure(foundMeasure);

      // Use the actual found measure's ID (may differ from the requested measureId if fallback occurred)
      const activeMeasureId = foundMeasure.id;
      setSelectedMeasureId(activeMeasureId);

      const [ageData, ethnicityData, raceData, crspLevelData] = await Promise.all([
        fetchMeasureStratification(activeMeasureId, token),
        fetchMeasureStratificationEthnicity(activeMeasureId, token),
        fetchMeasureStratificationRace(activeMeasureId, token),
        fetchCRSPLevelData(activeMeasureId, token)
      ]);

      const mergedStrat = {
        age: ageData[activeMeasureId]?.age || [],
        ethnicity: ethnicityData[activeMeasureId]?.ethnicity || [],
        race: raceData[activeMeasureId]?.race || []
      };

      setStratificationData(mergedStrat);
      setCRSPData(crspLevelData || []);
    } catch (err) {
      console.error('Error fetching measure detail:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = ['By age', 'By race', 'By ethnicity', 'CRSP level'];

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
      
      let data;
      if (stratType === 'race') {
        const filters = {
          measureId: selectedMeasureId,
          raceStrat: stratGroup,
          crsp: crspName
        };
        data = await fetchRaceMemberDetails(filters, token);
      } else if (stratType === 'ethnicity') {
        const filters = {
          measureId: selectedMeasureId,
          ethnicityStrat: stratGroup,
          crsp: crspName
        };
        data = await fetchEthnicityMemberDetails(filters, token);
      } else {
        const filters = {
          measureId: selectedMeasureId,
          ageStrat: stratGroup,
          crsp: crspName
        };
        data = await fetchMemberDetails(filters, token);
      }
      
      setMembersByKey(prev => ({ ...prev, [key]: data }));
      setExpandedCRSPRows(prev => ({ ...prev, [key]: true }));
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoadingMembers(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleCRSPLevelClick = async (crspName) => {
    const key = `crsp-${crspName}`;
    
    if (expandedCRSPLevelRows[key]) {
      setExpandedCRSPLevelRows(prev => ({ ...prev, [key]: false }));
      return;
    }

    if (crspLevelMembersByKey[key]) {
      setExpandedCRSPLevelRows(prev => ({ ...prev, [key]: true }));
      return;
    }

    try {
      setLoadingCRSPLevelMembers(prev => ({ ...prev, [key]: true }));
      
      const filters = {
        measureId: selectedMeasureId,
        crsp: crspName
      };
      const data = await fetchCRSPMemberDetails(filters, token);
      
      setCRSPLevelMembersByKey(prev => ({ ...prev, [key]: data }));
      setExpandedCRSPLevelRows(prev => ({ ...prev, [key]: true }));
    } catch (err) {
      console.error('Error fetching CRSP level members:', err);
    } finally {
      setLoadingCRSPLevelMembers(prev => ({ ...prev, [key]: false }));
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

  const filterMembersByRace = (members, race) => {
    if (!race) return members;
    return members.filter(member => member.raceStrat === race);
  };

  const filterMembersByEthnicity = (members, ethnicity) => {
    if (!ethnicity) return members;
    return members.filter(member => member.ethnicityStrat === ethnicity);
  };

  const renderMembersDropdown = (members, isLoading, stratGroup, stratType = 'age') => {
    // Filter members based on stratification type
    let filteredMembers = members;
    if (stratType === 'age') {
      filteredMembers = filterMembersByAgeGroup(members, stratGroup);
    } else if (stratType === 'race') {
      filteredMembers = filterMembersByRace(members, stratGroup);
    } else if (stratType === 'ethnicity') {
      filteredMembers = filterMembersByEthnicity(members, stratGroup);
    }
    
    if (isLoading) {
      return (
        <tr style={{ backgroundColor: '#ffffff', borderLeft: '1px solid #d0d0d0' }}>
          <td colSpan="8" style={{ padding: '16px', textAlign: 'center', color: '#666', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', border: '2px solid #0066cc', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
              Loading members...
            </div>
          </td>
        </tr>
      );
    }

    if (filteredMembers.length === 0) {
      return (
        <tr style={{ backgroundColor: '#ffffff', borderLeft: '1px solid #d0d0d0' }}>
          <td colSpan="8" style={{ padding: '16px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
            No members found
          </td>
        </tr>
      );
    }

    return (
      <tr style={{ backgroundColor: 'transparent', borderLeft: '1px solid #d0d0d0' }}>
        <td colSpan="8" style={{ padding: '0' }}>
          <div className="members-scroll-container" style={{ maxHeight: '280px', overflowY: 'auto', backgroundColor: 'transparent' }}>
            <table className="members-inner-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ backgroundColor: '#e8e5dd', borderBottom: '1px solid #e0e0e0' }}>
                  <th style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '16px', fontSize: '12px', fontWeight: 700, color: '#333', textAlign: 'center', letterSpacing: '0.5px' }}>MEMBER ID</th>
                  <th style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '16px', fontSize: '12px', fontWeight: 700, color: '#333', textAlign: 'center', letterSpacing: '0.5px' }}>MEMBER NAME</th>
                  <th style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '16px', fontSize: '12px', fontWeight: 700, color: '#333', textAlign: 'center', letterSpacing: '0.5px' }}>AGE</th>
                  <th style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '16px', fontSize: '12px', fontWeight: 700, color: '#333', textAlign: 'center', letterSpacing: '0.5px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member, mIdx) => (
                  <tr 
                    key={`member-${mIdx}`} 
                    className="member-row"
                    style={{ 
                      borderBottom: '1px solid #f0f0f0',
                      backgroundColor: 'transparent',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px', fontSize: '13px', color: '#0066cc', fontWeight: 600, textAlign: 'center' }}>
                      {member.memberId}
                    </td>
                    <td style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px', fontSize: '13px', color: '#333', textAlign: 'center' }}>
                      {member.memberName}
                    </td>
                    <td style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px', fontSize: '13px', color: '#333', textAlign: 'center' }}>
                      {member.age || '—'}
                    </td>
                    <td style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px', fontSize: '13px', color: member.status === 'Compliant' ? '#27500a' : '#a32d2d', fontWeight: 600, textAlign: 'center' }}>
                      {member.status || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    );
  };

  const renderCRSPRows = (crspList, stratGroup, stratType) => {
    return crspList.map((crspRow, crspIdx) => {
      const crspKey = `${stratType}-${stratGroup}-${crspRow.crsp}`;
      const isExpanded = expandedCRSPRows[crspKey];
      const members = membersByKey[crspKey] || [];
      const isLoading = loadingMembers[crspKey];

      return (
        <React.Fragment key={`crsp-${crspIdx}`}>
          <tr 
            style={{ backgroundColor: 'transparent', borderLeft: 'none', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} 
            onClick={() => handleCRSPClick(stratGroup, crspRow.crsp, stratType)}
          >
            <td style={{ textAlign: 'center', width: '30px', paddingLeft: '40px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: 'inline-block', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                <path d="M3 2L13 8L3 14V2Z" fill="#0f7a5a" />
              </svg>
            </td>
            <td style={{ paddingLeft: '0px', color: '#666', fontWeight: 500 }}>{crspRow.crsp}</td>
            <td>{crspRow.denominator.toLocaleString()}</td>
            <td>{crspRow.numerator.toLocaleString()}</td>
            <td style={{ color: '#a32d2d', fontWeight: 600 }}>{(crspRow.denominator - crspRow.numerator).toLocaleString()}</td>
            <td style={{ fontWeight: 600, color: crspRow.rate >= measure?.goal ? '#27500a' : '#a32d2d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <span>{crspRow.rate}%</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate && onNavigate('cac', selectedMeasureId);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1F9D8B',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(31, 157, 139, 0.08)';
                  e.currentTarget.style.color = '#0f6e56';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = '#1F9D8B';
                }}
              >
                Care Action Center →
              </button>
            </td>
          </tr>
          {isExpanded && renderMembersDropdown(members, isLoading, stratGroup, stratType)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="measure-detail-container">
      <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>

      {!loading && measure && (
        <MeasurePerformanceSection
          token={token}
          initialMeasureId={measureId}
          onMeasureSelect={(measureId) => {
            setSelectedMeasureId(measureId);
          }}
          onDeepDive={() => {
            // Scroll to the detailed section below
            const detailsSection = document.querySelector('.stratification-tables-container');
            if (detailsSection) {
              detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          onSimulate={() => {
            onNavigate && onNavigate('rateSimulator', selectedMeasureId);
          }}
        />
      )}

      {loading && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b6a66', fontSize: '14px' }}>
          <div style={{ marginBottom: '12px' }}>Loading measure details...</div>
        </div>
      )}

      {error && (
        <div style={{ padding: '16px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', border: '1px solid #ffeaa7' }}>
          <strong>Error:</strong> {error}. Showing fallback data.
        </div>
      )}

      {!loading && (
        <>
          <div className="stratification-tables-container">
            {/* AGE: Cards + Table */}
            {stratificationData.age && stratificationData.age.length > 0 && (
              <>
                {/* Age Summary Cards */}
                <div className="summary-group">
                  <h4 
                    className="summary-group-title"
                    onClick={() => setCollapsedSummaryGroups(prev => ({ ...prev, age: !prev.age }))}
                    style={{ cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-block', marginRight: '8px', transition: 'transform 0.2s ease', transform: collapsedSummaryGroups.age ? 'rotate(0deg)' : 'rotate(90deg)' }}>▶</span>
                    Age
                  </h4>
                  {!collapsedSummaryGroups.age && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0px', minHeight: '200px' }}>
                      {stratificationData.age.length > 4 && (
                        <button
                          onClick={() => setCarouselIndex(prev => ({ ...prev, age: Math.max(0, prev.age - 1) }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '8px', flexShrink: 0 }}
                          disabled={carouselIndex.age === 0}
                        >
                          ‹
                        </button>
                      )}
                      {stratificationData.age.length <= 4 && (
                        <div style={{ width: '36px', flexShrink: 0 }}></div>
                      )}
                      <div className="summary-cards-row" style={{ overflowX: 'auto', scrollBehavior: 'smooth', display: 'flex', gap: '12px', paddingBottom: '8px', flex: 1 }}>
                        {stratificationData.age.slice(carouselIndex.age, carouselIndex.age + 4).map((row, idx) => {
                          let borderClass = 'border-below';
                          if (row.rate > measure?.goal) {
                            borderClass = 'border-above';
                          } else if (row.rate === measure?.goal) {
                            borderClass = 'border-at';
                          }
                          return (
                            <div 
                              key={idx} 
                              className={`summary-card ${borderClass}`}
                              onClick={() => {
                                setSelectedAgeGroup(selectedAgeGroup === row.group ? null : row.group);
                                setExpandedAgeGroups(prev => ({ ...prev, [row.group]: !prev[row.group] }));
                              }}
                              style={{ cursor: 'pointer', flexShrink: 0 }}
                            >
                              <div className="card-header-text">
                                <strong>{row.group}</strong>
                              </div>
                              <div className="card-row">
                                <span className="card-label">Rate</span>
                                <span className="card-value">{row.rate}%</span>
                              </div>
                              <div className="card-row">
                                <span className="card-label">Numerator</span>
                                <span className="card-value">{row.num.toLocaleString()}</span>
                              </div>
                              <div className="card-row">
                                <span className="card-label">Denominator</span>
                                <span className="card-value">{row.denom.toLocaleString()}</span>
                              </div>
                              <div className="card-row">
                                <span className="card-label">Not Meeting</span>
                                <span className="card-value">{row.notMeeting?.toLocaleString() || '—'}</span>
                              </div>
                              <div className="card-row">
                                <span className="card-label">Disparity</span>
                                <span className="card-value" style={{ color: row.disparity === 'no disparity' ? '#27500a' : '#a32d2d' }}>
                                  {row.disparity || '—'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {stratificationData.age.length > 4 && (
                        <button
                          onClick={() => setCarouselIndex(prev => ({ ...prev, age: Math.min(stratificationData.age.length - 4, prev.age + 1) }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '8px' }}
                          disabled={carouselIndex.age >= stratificationData.age.length - 4}
                        >
                          ›
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Age Table - Only show when a group is selected */}
                {selectedAgeGroup && (
                  <div className="stratification-table-section">
                    <h3 className="stratification-table-title">By Age</h3>
                    <div className="ai-insight">
                      ✨ <strong>AI Insight:</strong> Age stratification data shows performance variations across age groups. Click on a CRSP to see members.
                    </div>
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th></th>
                          <th>Age Group</th>
                          <th>Denominator</th>
                          <th>Numerator</th>
                          <th>Not Meeting</th>
                          <th>Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stratificationData.age
                          .filter(row => row.group === selectedAgeGroup)
                          .map((row, idx) => (
                          <React.Fragment key={idx}>
                            <tr onClick={() => setExpandedAgeGroups(prev => ({ ...prev, [row.group]: !prev[row.group] }))} style={{ cursor: 'pointer', backgroundColor: 'transparent', borderLeft: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                              <td style={{ textAlign: 'center', width: '30px', paddingLeft: '8px' }}>
                                <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: 'inline-block', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: expandedAgeGroups[row.group] ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                  <path d="M3 2L13 8L3 14V2Z" fill="#0f7a5a" />
                                </svg>
                              </td>
                              <td style={{ paddingLeft: '8px' }}><strong>{row.group}</strong></td>
                              <td>{row.denom.toLocaleString()}</td>
                              <td>{row.num.toLocaleString()}</td>
                              <td style={{ color: '#a32d2d', fontWeight: 600 }}>{row.notMeeting?.toLocaleString() || '—'}</td>
                              <td style={{ fontWeight: 600, color: row.rate >= measure?.goal ? '#27500a' : '#a32d2d' }}>{row.rate}%</td>
                            </tr>
                            {expandedAgeGroups[row.group] && ageCRSPData[row.group]?.crspList?.length > 0 && (
                              <>
                                {renderCRSPRows(ageCRSPData[row.group].crspList, row.group, 'age')}
                              </>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* RACE: Cards + Table */}
            {stratificationData.race && stratificationData.race.length > 0 && (
              <>
                {/* Race Summary Cards */}
                <div className="summary-group">
                  <h4 
                    className="summary-group-title"
                    onClick={() => setCollapsedSummaryGroups(prev => ({ ...prev, race: !prev.race }))}
                    style={{ cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-block', marginRight: '8px', transition: 'transform 0.2s ease', transform: collapsedSummaryGroups.race ? 'rotate(0deg)' : 'rotate(90deg)' }}>▶</span>
                    Race
                  </h4>
                  {!collapsedSummaryGroups.race && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '200px' }}>
                      {stratificationData.race.length > 4 && (
                        <button
                          onClick={() => setCarouselIndex(prev => ({ ...prev, race: Math.max(0, prev.race - 1) }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '8px', flexShrink: 0 }}
                          disabled={carouselIndex.race === 0}
                        >
                          ‹
                        </button>
                      )}
                      {stratificationData.race.length <= 4 && (
                        <div style={{ width: '36px', flexShrink: 0 }}></div>
                      )}
                      <div className="summary-cards-row" style={{ overflowX: 'auto', scrollBehavior: 'smooth', display: 'flex', gap: '12px', paddingBottom: '8px', flex: 1 }}>
                        {stratificationData.race.slice(carouselIndex.race, carouselIndex.race + 4).map((row, idx) => {
                          let borderClass = 'border-below';
                          if (row.rate > measure?.goal) {
                            borderClass = 'border-above';
                          } else if (row.rate === measure?.goal) {
                            borderClass = 'border-at';
                          }
                          return (
                            <div 
                              key={idx} 
                              className={`summary-card ${borderClass}`}
                              onClick={() => {
                                setSelectedRaceGroup(selectedRaceGroup === row.group ? null : row.group);
                                setExpandedRaceGroups(prev => ({ ...prev, [row.group]: !prev[row.group] }));
                              }}
                              style={{ cursor: 'pointer', flexShrink: 0 }}
                            >
                              <div className="card-header-text">
                                <strong>{row.group}</strong>
                              </div>
                              <div className="card-row">
                                <span className="card-label">Rate</span>
                                <span className="card-value">{row.rate}%</span>
                              </div>
                              <div className="card-row">
                                <span className="card-label">Numerator</span>
                                <span className="card-value">{row.num.toLocaleString()}</span>
                              </div>
                              <div className="card-row">
                                <span className="card-label">Denominator</span>
                                <span className="card-value">{row.denom.toLocaleString()}</span>
                              </div>
                              <div className="card-row">
                                <span className="card-label">Not Meeting</span>
                                <span className="card-value">{row.notMeeting?.toLocaleString() || '—'}</span>
                              </div>
                              <div className="card-row">
                                <span className="card-label">Disparity</span>
                                <span className="card-value" style={{ color: row.disparity === 'no disparity' ? '#27500a' : '#a32d2d' }}>
                                  {row.disparity || '—'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {stratificationData.race.length > 4 && (
                        <button
                          onClick={() => setCarouselIndex(prev => ({ ...prev, race: Math.min(stratificationData.race.length - 4, prev.race + 1) }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '8px' }}
                          disabled={carouselIndex.race >= stratificationData.race.length - 4}
                        >
                          ›
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Race Table - Only show when a group is selected */}
                {selectedRaceGroup && (
                  <div className="stratification-table-section">
                    <h3 className="stratification-table-title">By Race</h3>
                    <div className="ai-insight">
                      ✨ <strong>AI Insight:</strong> Race stratification data shows performance variations across racial groups. Click on a CRSP to see members.
                    </div>
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th></th>
                          <th>Race</th>
                          <th>Denominator</th>
                          <th>Numerator</th>
                          <th>Not Meeting</th>
                          <th>Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stratificationData.race
                          .filter(row => row.group === selectedRaceGroup)
                          .map((row, idx) => (
                          <React.Fragment key={idx}>
                            <tr onClick={() => setExpandedRaceGroups(prev => ({ ...prev, [row.group]: !prev[row.group] }))} style={{ cursor: 'pointer', backgroundColor: 'transparent', borderLeft: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                              <td style={{ textAlign: 'center', width: '30px', paddingLeft: '8px' }}>
                                <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: 'inline-block', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: expandedRaceGroups[row.group] ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                  <path d="M3 2L13 8L3 14V2Z" fill="#0f7a5a" />
                                </svg>
                              </td>
                              <td style={{ paddingLeft: '8px' }}><strong>{row.group}</strong></td>
                              <td>{row.denom.toLocaleString()}</td>
                              <td>{row.num.toLocaleString()}</td>
                              <td style={{ color: '#a32d2d', fontWeight: 600 }}>{row.notMeeting?.toLocaleString() || '—'}</td>
                              <td style={{ fontWeight: 600, color: row.rate >= measure?.goal ? '#27500a' : '#a32d2d' }}>{row.rate}%</td>
                            </tr>
                            {expandedRaceGroups[row.group] && raceCRSPData[row.group]?.crspList?.length > 0 && (
                              <>
                                {renderCRSPRows(raceCRSPData[row.group].crspList, row.group, 'race')}
                              </>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ETHNICITY: Cards + Table */}
            {stratificationData.ethnicity && stratificationData.ethnicity.length > 0 && (
              <>
                {/* Ethnicity Summary Cards */}
                <div className="summary-group">
                  <h4 
                    className="summary-group-title"
                    onClick={() => setCollapsedSummaryGroups(prev => ({ ...prev, ethnicity: !prev.ethnicity }))}
                    style={{ cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-block', marginRight: '8px', transition: 'transform 0.2s ease', transform: collapsedSummaryGroups.ethnicity ? 'rotate(0deg)' : 'rotate(90deg)' }}>▶</span>
                    Ethnicity
                  </h4>
                  {!collapsedSummaryGroups.ethnicity && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0px', minHeight: '200px' }}>
                      {stratificationData.ethnicity.length > 4 && (
                        <button
                          onClick={() => setCarouselIndex(prev => ({ ...prev, ethnicity: Math.max(0, prev.ethnicity - 1) }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '8px', flexShrink: 0 }}
                          disabled={carouselIndex.ethnicity === 0}
                        >
                          ‹
                        </button>
                      )}
                      {stratificationData.ethnicity.length <= 4 && (
                        <div style={{ width: '36px', flexShrink: 0 }}></div>
                      )}
                      <div className="summary-cards-row" style={{ overflowX: 'auto', scrollBehavior: 'smooth', display: 'flex', gap: '12px', paddingBottom: '8px', flex: 1 }}>
                        {stratificationData.ethnicity.slice(carouselIndex.ethnicity, carouselIndex.ethnicity + 4).map((row, idx) => {
                          let borderClass = 'border-below';
                          if (row.rate > measure?.goal) {
                            borderClass = 'border-above';
                          } else if (row.rate === measure?.goal) {
                            borderClass = 'border-at';
                          }
                          return (
                            <div 
                              key={idx} 
                              className={`summary-card ${borderClass}`}
                              onClick={() => {
                                setSelectedEthnicityGroup(selectedEthnicityGroup === row.group ? null : row.group);
                                setExpandedEthnicityGroups(prev => ({ ...prev, [row.group]: !prev[row.group] }));
                              }}
                              style={{ cursor: 'pointer', flexShrink: 0 }}
                            >
                              <div className="card-header-text">
                                <strong>{row.group}</strong>
                              </div>
                              <div className="card-row">
                                <span className="card-label">Rate</span>
                                <span className="card-value">{row.rate}%</span>
                              </div>
                              <div className="card-row">
                                <span className="card-label">Numerator</span>
                                <span className="card-value">{row.num.toLocaleString()}</span>
                              </div>
                              <div className="card-row">
                                <span className="card-label">Denominator</span>
                                <span className="card-value">{row.denom.toLocaleString()}</span>
                              </div>
                              <div className="card-row">
                                <span className="card-label">Not Meeting</span>
                                <span className="card-value">{row.notMeeting?.toLocaleString() || '—'}</span>
                              </div>
                              <div className="card-row">
                                <span className="card-label">Disparity</span>
                                <span className="card-value" style={{ color: row.disparity === 'no disparity' ? '#27500a' : '#a32d2d' }}>
                                  {row.disparity || '—'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {stratificationData.ethnicity.length > 4 && (
                        <button
                          onClick={() => setCarouselIndex(prev => ({ ...prev, ethnicity: Math.min(stratificationData.ethnicity.length - 4, prev.ethnicity + 1) }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '8px' }}
                          disabled={carouselIndex.ethnicity >= stratificationData.ethnicity.length - 4}
                        >
                          ›
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Ethnicity Table - Only show when a group is selected */}
                {selectedEthnicityGroup && (
                  <div className="stratification-table-section">
                    <h3 className="stratification-table-title">By Ethnicity</h3>
                    <div className="ai-insight">
                      ✨ <strong>AI Insight:</strong> Ethnicity stratification data shows performance variations across ethnic groups. Click on a CRSP to see members.
                    </div>
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th></th>
                          <th>Ethnicity</th>
                          <th>Denominator</th>
                          <th>Numerator</th>
                          <th>Not Meeting</th>
                          <th>Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stratificationData.ethnicity
                          .filter(row => row.group === selectedEthnicityGroup)
                          .map((row, idx) => (
                          <React.Fragment key={idx}>
                            <tr onClick={() => setExpandedEthnicityGroups(prev => ({ ...prev, [row.group]: !prev[row.group] }))} style={{ cursor: 'pointer', backgroundColor: 'transparent', borderLeft: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                              <td style={{ textAlign: 'center', width: '30px', paddingLeft: '8px' }}>
                                <svg width="16" height="16" viewBox="0 0 16 16" style={{ display: 'inline-block', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: expandedEthnicityGroups[row.group] ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                  <path d="M3 2L13 8L3 14V2Z" fill="#0f7a5a" />
                                </svg>
                              </td>
                              <td style={{ paddingLeft: '8px' }}><strong>{row.group}</strong></td>
                              <td>{row.denom.toLocaleString()}</td>
                              <td>{row.num.toLocaleString()}</td>
                              <td style={{ color: '#a32d2d', fontWeight: 600 }}>{row.notMeeting?.toLocaleString() || '—'}</td>
                              <td style={{ fontWeight: 600, color: row.rate >= measure?.goal ? '#27500a' : '#a32d2d' }}>{row.rate}%</td>
                            </tr>
                            {expandedEthnicityGroups[row.group] && ethnicityCRSPData[row.group]?.crspList?.length > 0 && (
                              <>
                                {renderCRSPRows(ethnicityCRSPData[row.group].crspList, row.group, 'ethnicity')}
                              </>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}


          </div>
        </>
      )}
    </div>
  );
};

export default MeasureDetail;
