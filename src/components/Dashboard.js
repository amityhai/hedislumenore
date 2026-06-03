import { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import MonthFilter from './MonthFilter';
import { fetchDashboardKPI, fetchChartMeasuresMeetingTarget, fetchAllMeasuresGrid, fetchLowestPerformingMeasures, fetchCRSPsNeedingAttention, fetchEquityAlerts } from '../services/workflowService';

// `selectedMonth` / `onMonthChange` are controlled props from App so the user's
// selection survives page navigation (and so the workflow-service month stays
// in sync from a single source of truth at the top of the tree).
const Dashboard = ({ onNavigate, token, selectedMonth, onMonthChange, availableMonths }) => {
  const [kpis, setKpis] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [measuresGrid, setMeasuresGrid] = useState([]);
  const [lowestPerformingMeasures, setLowestPerformingMeasures] = useState([]);
  const [crspNeedingAttention, setCRSPNeedingAttention] = useState([]);
  const [equityAlerts, setEquityAlerts] = useState([]);
  const [currentMatrixPage, setCurrentMatrixPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Below Goal');
  const [tableVisible, setTableVisible] = useState(true);
  const matrixPageSize = 6;
  const matrixRef = useRef(null);

  // Fetch KPI data from workflow (refetches whenever the selected month changes).
  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedMonth]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);


      // Fetch KPI, Chart, Measures Grid, Lowest Performing Measures, CRSPs Needing Attention, and Equity Alerts data in parallel
      const [kpiData, chartDataResult, measuresGridData, lowestMeasuresData, crspAttentionData, equityAlertsData] = await Promise.all([
        fetchDashboardKPI(token),
        fetchChartMeasuresMeetingTarget(token),
        fetchAllMeasuresGrid(token),
        fetchLowestPerformingMeasures(token),
        fetchCRSPsNeedingAttention(token),
        fetchEquityAlerts(token)
      ]);


      setKpis(kpiData);
      setChartData(chartDataResult);
      setMeasuresGrid(measuresGridData);
      setLowestPerformingMeasures(lowestMeasuresData);
      setCRSPNeedingAttention(crspAttentionData);
      setEquityAlerts(equityAlertsData);
    } catch (err) {
      // Fallback to mock data
      setKpis([
        { label: 'Above goal / target', value: 35, total: 88, trend: '+5 vs MY 2025', type: 'above' },
        { label: 'At goal / target', value: 7, total: 88, trend: 'Stable vs MY 2025', type: 'at' },
        { label: 'Below Goal / Target', value: 46, total: 88, trend: '7 critical, 39 below target', type: 'below' },
      ]);
      setChartData([
        { month: 'Jan-2026', value: 19 },
        { month: 'Feb-2026', value: 15 }
      ]);
      setMeasuresGrid([]);
      setLowestPerformingMeasures([]);
      setCRSPNeedingAttention([]);
      setEquityAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  // Show all measures without filtering
  const filteredMeasures = statusFilter === 'All' 
    ? measuresGrid 
    : measuresGrid.filter(m => m.kpi_status === statusFilter);
  const totalMatrixPages = Math.max(1, Math.ceil(filteredMeasures.length / matrixPageSize));
  const paginatedMeasures = filteredMeasures.slice(
    (currentMatrixPage - 1) * matrixPageSize,
    currentMatrixPage * matrixPageSize
  );

  useEffect(() => {
    if (currentMatrixPage > totalMatrixPages) {
      setCurrentMatrixPage(totalMatrixPages);
    }
  }, [currentMatrixPage, totalMatrixPages]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header-with-filter">
        <div className="dashboard-header">
          <h1>Quality Management Command Center</h1>
        </div>
        <MonthFilter selectedMonth={selectedMonth} onMonthChange={onMonthChange} availableMonths={availableMonths} />
      </div>

      {/* KPI Section - Tab-like Selection */}
      <div className="kpi-grid" role="tablist" aria-label="Measure status filters">
        {kpis.length >= 3 && (
          <>
            <div 
              className={`kpi-card kpi-card-green ${statusFilter === 'Above Goal' ? 'kpi-card-active' : ''}`}
              role="tab"
              aria-selected={statusFilter === 'Above Goal'}
              tabIndex={statusFilter === 'Above Goal' ? 0 : -1}
              onClick={() => {
                setStatusFilter('Above Goal');
                setTableVisible(true);
                setCurrentMatrixPage(1);
                setTimeout(() => matrixRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  document.querySelector('[role="tab"][aria-selected="false"]')?.focus();
                } else if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setStatusFilter('Above Goal');
                  setTableVisible(true);
                  setCurrentMatrixPage(1);
                }
              }}
            >
              <div className="kpi-header">
                <span className="kpi-label">{kpis[0]?.label}</span>
                <span className="kpi-status-dot kpi-status-green"></span>
              </div>
              <div className="kpi-main">
                <span className="kpi-value">{kpis[0]?.value}</span>
                <span className="kpi-total">/ {kpis[0]?.total}</span>
              </div>
            </div>

            <div 
              className={`kpi-card kpi-card-blue ${statusFilter === 'At Goal' ? 'kpi-card-active' : ''}`}
              role="tab"
              aria-selected={statusFilter === 'At Goal'}
              tabIndex={statusFilter === 'At Goal' ? 0 : -1}
              onClick={() => {
                setStatusFilter('At Goal');
                setTableVisible(true);
                setCurrentMatrixPage(1);
                setTimeout(() => matrixRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  document.querySelectorAll('[role="tab"]')[2]?.focus();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  document.querySelectorAll('[role="tab"]')[0]?.focus();
                } else if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setStatusFilter('At Goal');
                  setTableVisible(true);
                  setCurrentMatrixPage(1);
                }
              }}
            >
              <div className="kpi-header">
                <span className="kpi-label">{kpis[1]?.label}</span>
                <span className="kpi-status-dot kpi-status-blue"></span>
              </div>
              <div className="kpi-main">
                <span className="kpi-value">{kpis[1]?.value}</span>
                <span className="kpi-total">/ {kpis[1]?.total}</span>
              </div>
            </div>

            <div 
              className={`kpi-card kpi-card-red ${statusFilter === 'Below Goal' ? 'kpi-card-active' : ''}`}
              role="tab"
              aria-selected={statusFilter === 'Below Goal'}
              tabIndex={statusFilter === 'Below Goal' ? 0 : -1}
              onClick={() => {
                setStatusFilter('Below Goal');
                setTableVisible(true);
                setCurrentMatrixPage(1);
                setTimeout(() => matrixRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  document.querySelectorAll('[role="tab"]')[1]?.focus();
                } else if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setStatusFilter('Below Goal');
                  setTableVisible(true);
                  setCurrentMatrixPage(1);
                }
              }}
            >
              <div className="kpi-header">
                <span className="kpi-label">{kpis[2]?.label}</span>
                <span className="kpi-status-dot kpi-status-red"></span>
              </div>
              <div className="kpi-main">
                <span className="kpi-value">{kpis[2]?.value}</span>
                <span className="kpi-total">need attention</span>
              </div>
            </div>

            </>
        )}
      </div>

      {/* Measure Health Matrix Section - Right after KPI cards */}
      {tableVisible && (
      <div className="measure-health-matrix-section" ref={matrixRef} role="tabpanel">
        {loading ? (
          <div className="matrix-empty-state">Loading measures…</div>
        ) : filteredMeasures.length > 0 ? (
          <div className="measure-table-wrapper" key={statusFilter}>
            <div className="measure-grid-table">
              <div className="measure-grid-header">
                <div className="measure-grid-cell measure-grid-chevron"></div>
                <div className="measure-grid-cell measure-grid-measure">Measure</div>
                <div className="measure-grid-cell measure-grid-numerator">Numerator</div>
                <div className="measure-grid-cell measure-grid-denominator">Denominator</div>
                <div className="measure-grid-cell measure-grid-rate">Rate</div>
                <div className="measure-grid-cell measure-grid-goal">Goal</div>
                <div className="measure-grid-cell measure-grid-status">Status</div>
                <div className="measure-grid-cell measure-grid-action">Action</div>
              </div>

              <div className="measure-grid-body" key={`body-${statusFilter}`}>
                {paginatedMeasures.map((measure, idx) => {
                  const statusClass = measure.kpi_status === 'Above Goal' ? 'above' : measure.kpi_status === 'At Goal' ? 'at' : 'below';
                  const measureId = (measure.measure_id || 'N/A').replace(/_/g, ' ');

                  return (
                    <div key={idx} className={`measure-grid-row measure-row-${statusClass}`}>
                      <div className="measure-grid-cell measure-grid-chevron measure-chevron-cell" aria-hidden="true">
                      </div>
                      <div className="measure-grid-cell measure-grid-measure measure-name-cell">
                        <div className="measure-name-content">
                          <span className="measure-id">{measureId}</span>
                          <span className="measure-full-name">- {measure.display_name}</span>
                        </div>
                      </div>
                      <div className="measure-grid-cell measure-grid-numerator measure-numerator-cell">
                        {parseInt(measure.numerator).toLocaleString()}
                      </div>
                      <div className="measure-grid-cell measure-grid-denominator measure-denominator-cell">
                        {parseInt(measure.denominator).toLocaleString()}
                      </div>
                      <div className="measure-grid-cell measure-grid-rate measure-rate-cell">{measure.rate}%</div>
                      <div className="measure-grid-cell measure-grid-goal measure-goal-cell">
                        {measure.goal_50th ? `${measure.goal_50th}%` : '-'}
                      </div>
                      <div className="measure-grid-cell measure-grid-status measure-status-cell">
                        <span className={`status-badge status-${statusClass}`}>
                          <span className="status-dot" aria-hidden="true"></span>
                          {measure.kpi_status}
                        </span>
                      </div>
                      <div className="measure-grid-cell measure-grid-action measure-action-cell">
                        <button
                          type="button"
                          className="view-details-button"
                          onClick={() => onNavigate && onNavigate('detail', measure.measure_id)}
                        >
                          Deep Dive →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="matrix-pagination">
                <button
                  type="button"
                  className="matrix-page-nav"
                  disabled={currentMatrixPage === 1}
                  onClick={() => setCurrentMatrixPage(prev => Math.max(1, prev - 1))}
                >
                  ‹
                </button>
                {Array.from({ length: totalMatrixPages }, (_, idx) => idx + 1).slice(0, 3).map(page => (
                  <button
                    key={page}
                    type="button"
                    className={`matrix-page-button ${currentMatrixPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentMatrixPage(page)}
                  >
                    {page}
                  </button>
                ))}
                {totalMatrixPages > 4 && <span className="matrix-page-ellipsis">...</span>}
                {totalMatrixPages > 3 && (
                  <button
                    type="button"
                    className={`matrix-page-button ${currentMatrixPage === totalMatrixPages ? 'active' : ''}`}
                    onClick={() => setCurrentMatrixPage(totalMatrixPages)}
                  >
                    {totalMatrixPages}
                  </button>
                )}
                <button
                  type="button"
                  className="matrix-page-nav"
                  disabled={currentMatrixPage === totalMatrixPages}
                  onClick={() => setCurrentMatrixPage(prev => Math.min(totalMatrixPages, prev + 1))}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="matrix-empty-state">No measures available</div>
        )}
      </div>
      )}


      {/* Insights Section - 3 Cards */}
      <div className="three-col-grid">
        <div className="card">
          <h3>Lowest Performing Measures</h3>
          <div className="measure-list">
            {lowestPerformingMeasures.length > 0 ? (
              lowestPerformingMeasures.map((measure, idx) => (
                <div key={idx} className="measure-item" onClick={() => onNavigate('detail', measure.measure_id)}>
                  <span>{measure.display_name}</span>
                  <span className="rate-bad">{measure.rate}%</span>
                </div>
              ))
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: '#9c9a92', fontSize: '13px' }}>
                Loading measures...
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3>CRSPs Needing Attention</h3>
          <div className="measure-list">
            {crspNeedingAttention.length > 0 ? (
              crspNeedingAttention.map((item, idx) => (
                <div key={idx} className="measure-item" onClick={() => onNavigate('detail', item.measure_id)}>
                  <span style={{ fontSize: '12px' }}>{item.measure_id.replace(/_/g, ' ')}: {item.crsp_name}</span>
                  <span className="rate-bad" style={{ fontSize: '11px' }}>{item.rate}%</span>
                </div>
              ))
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: '#9c9a92', fontSize: '12px' }}>
                Loading CRSPs...
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3>Equity Alerts <span className="badge-alert">{equityAlerts.length} active</span></h3>
          <div className="equity-list">
            {equityAlerts.length > 0 ? (
              equityAlerts.map((alert, idx) => (
                <div key={idx} className="equity-item">
                  <span style={{ fontSize: '12px' }}>{alert.measure_id.replace(/_/g, ' ')}: {alert.race_strat}</span>
                  <span className="equity-gap" style={{ fontSize: '11px' }}>{alert.rate}%</span>
                </div>
              ))
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: '#9c9a92', fontSize: '12px' }}>
                Loading alerts...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
