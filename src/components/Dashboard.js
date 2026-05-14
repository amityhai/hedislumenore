import { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import { fetchDashboardKPI, fetchChartMeasuresMeetingTarget, fetchAllMeasuresGrid } from '../services/workflowService';

const Dashboard = ({ onNavigate, token }) => {
  const [kpis, setKpis] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [measuresGrid, setMeasuresGrid] = useState([]);
  const [currentMatrixPage, setCurrentMatrixPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Below Goal');
  const [tableVisible, setTableVisible] = useState(true);
  const matrixPageSize = 6;
  const matrixRef = useRef(null);

  // Fetch KPI data from workflow
  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      console.log('Dashboard - fetchDashboardData called with token:', token ? `${token.substring(0, 50)}...` : 'NO TOKEN');

      // Fetch KPI, Chart, and Measures Grid data in parallel
      const [kpiData, chartDataResult, measuresGridData] = await Promise.all([
        fetchDashboardKPI(token),
        fetchChartMeasuresMeetingTarget(token),
        fetchAllMeasuresGrid(token)
      ]);

      console.log('KPI Data:', kpiData);
      console.log('Chart Data:', chartDataResult);
      console.log('Measures Grid Data:', measuresGridData);

      setKpis(kpiData);
      setChartData(chartDataResult);
      setMeasuresGrid(measuresGridData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      // Fallback to mock data
      console.log('Using fallback mock data');
      setKpis([
        { label: 'Above goal / target', value: 35, total: 88, trend: '+5 vs MY 2025', type: 'above' },
        { label: 'At goal / target', value: 7, total: 88, trend: 'Stable vs MY 2025', type: 'at' },
        { label: 'Below benchmark / critical', value: 46, total: 88, trend: '7 critical, 39 below target', type: 'below' },
      ]);
      setChartData([
        { month: 'Jan-2026', value: 19 },
        { month: 'Feb-2026', value: 15 }
      ]);
      setMeasuresGrid([]);
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
      <div className="dashboard-header">
        <h1>Quality Management Command Center</h1>
        <p>Real-time performance snapshot, trends, and equity alerts. Data as of: March 30, 2026</p>
      </div>

      {/* KPI Section - 4 Cards in One Row */}
      <div className="kpi-grid">
        {kpis.length >= 3 && (
          <>
            <div className={`kpi-card kpi-card-green`} onClick={() => {
              if (statusFilter === 'Above Goal' && tableVisible) {
                setTableVisible(false);
              } else {
                setStatusFilter('Above Goal');
                setTableVisible(true);
                setCurrentMatrixPage(1);
                setTimeout(() => matrixRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
              }
            }}>
              <div className="kpi-header">
                <span className="kpi-label">{kpis[0]?.label}</span>
                <span className="kpi-status-dot kpi-status-green"></span>
              </div>
              <div className="kpi-main">
                <span className="kpi-value">{kpis[0]?.value}</span>
                <span className="kpi-total">/ {kpis[0]?.total}</span>
              </div>
              <p className="kpi-trend">{kpis[0]?.trend}</p>
            </div>

            <div className={`kpi-card kpi-card-blue`} onClick={() => {
              if (statusFilter === 'At Goal' && tableVisible) {
                setTableVisible(false);
              } else {
                setStatusFilter('At Goal');
                setTableVisible(true);
                setCurrentMatrixPage(1);
                setTimeout(() => matrixRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
              }
            }}>
              <div className="kpi-header">
                <span className="kpi-label">{kpis[1]?.label}</span>
                <span className="kpi-status-dot kpi-status-blue"></span>
              </div>
              <div className="kpi-main">
                <span className="kpi-value">{kpis[1]?.value}</span>
                <span className="kpi-total">/ {kpis[1]?.total}</span>
              </div>
              <p className="kpi-trend">{kpis[1]?.trend}</p>
            </div>

            <div className={`kpi-card kpi-card-red`} onClick={() => {
              if (statusFilter === 'Below Goal' && tableVisible) {
                setTableVisible(false);
              } else {
                setStatusFilter('Below Goal');
                setTableVisible(true);
                setCurrentMatrixPage(1);
                setTimeout(() => matrixRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
              }
            }}>
              <div className="kpi-header">
                <span className="kpi-label">{kpis[2]?.label}</span>
                <span className="kpi-status-dot kpi-status-red"></span>
              </div>
              <div className="kpi-main">
                <span className="kpi-value">{kpis[2]?.value}</span>
                <span className="kpi-total">need attention</span>
              </div>
              <p className="kpi-trend">{kpis[2]?.trend}</p>
            </div>

            <div className={`kpi-card kpi-card-teal`}>
              <div className="kpi-header">
                <span className="kpi-label">Gaps Closed (MTD)</span>
                <span className="kpi-status-dot kpi-status-teal"></span>
              </div>
              <div className="kpi-main">
                <span className="kpi-value">{chartData.length > 0 ? chartData[chartData.length - 1]?.value : '—'}</span>
              </div>
              <p className="kpi-trend">+18% vs Feb</p>
            </div>
          </>
        )}
      </div>

      {/* Measure Health Matrix Section - Right after KPI cards */}
      {tableVisible && (
      <div className="measure-health-matrix-section" ref={matrixRef}>
        <div style={{ marginBottom: '16px', padding: '12px 20px', backgroundColor: '#d1ebe5', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '16px', width: 'fit-content' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f7a5a' }}>
            Showing: {filteredMeasures.length} measure{filteredMeasures.length !== 1 ? 's' : ''} {statusFilter}
          </div>
          <button 
            onClick={() => setTableVisible(false)}
            style={{ padding: '0', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: '600', color: '#0f7a5a', lineHeight: '1' }}
          >
            ×
          </button>
        </div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b6a66' }}>
            Loading measures...
          </div>
        ) : filteredMeasures.length > 0 ? (
          <div className="measure-table-wrapper">
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

              <div className="measure-grid-body">
                {paginatedMeasures.map((measure, idx) => {
                  const statusClass = measure.kpi_status === 'Above Goal' ? 'above' : measure.kpi_status === 'At Goal' ? 'at' : 'below';
                  const measureId = measure.measure_id || 'N/A';

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
                          onClick={() => onNavigate && onNavigate('detail', measureId)}
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
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b6a66' }}>
            No measures available
          </div>
        )}
      </div>
      )}

      {/* Chart Section - Full Width */}
      <div className="chart-card-modern">
        <div className="chart-header-modern">
          <div className="chart-title-section">
            <h3 className="chart-title">📊 Measures Meeting Target</h3>
            <p className="chart-subtitle">Monthly trend of measures meeting target</p>
          </div>
          <div className="chart-legend-modern">
            <div className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: '#27500a' }}></span>
              <span className="legend-label">Current Year</span>
            </div>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="chart-container-modern">
            <svg viewBox="0 0 800 180" style={{ width: '100%', height: 'auto', minHeight: '140px' }}>
              <defs>
                <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#27500a" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#27500a" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Subtle grid lines */}
              <line x1="70" y1="160" x2="750" y2="160" stroke="#e8e6e1" strokeWidth="1" />
              <line x1="70" y1="110" x2="750" y2="110" stroke="#f0efe8" strokeWidth="1" />
              <line x1="70" y1="60" x2="750" y2="60" stroke="#f0efe8" strokeWidth="1" />

              {/* Y-axis labels */}
              <text x="45" y="165" fontSize="11" fill="#9c9a92" textAnchor="end">0</text>
              <text x="45" y="115" fontSize="11" fill="#9c9a92" textAnchor="end">10</text>
              <text x="45" y="65" fontSize="11" fill="#9c9a92" textAnchor="end">20</text>
              <text x="45" y="15" fontSize="11" fill="#9c9a92" textAnchor="end">30</text>

              {/* Calculate points for current year line */}
              {(() => {
                const maxValue = Math.max(...chartData.map(d => d.value), 20);
                const points = chartData.map((d, idx) => {
                  const x = 100 + (idx * 650 / (chartData.length - 1 || 1));
                  const y = 160 - ((d.value / maxValue) * 120);
                  return `${x},${y}`;
                }).join(' ');

                // Create gradient fill path
                const fillPoints = `${points} 750,160 70,160`;

                return (
                  <>
                    {/* Gradient fill under line */}
                    <polyline
                      points={fillPoints}
                      fill="url(#chartGradient)"
                    />
                    {/* Main line - smooth and thicker */}
                    <polyline
                      points={points}
                      fill="none"
                      stroke="#27500a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Data point circles and values */}
                    {chartData.map((d, idx) => {
                      const x = 100 + (idx * 650 / (chartData.length - 1 || 1));
                      const y = 160 - ((d.value / maxValue) * 120);
                      return (
                        <g key={idx} className="chart-point">
                          {/* Outer circle for hover effect */}
                          <circle cx={x} cy={y} r="7" fill="#27500a" opacity="0.1" />
                          {/* Main point */}
                          <circle cx={x} cy={y} r="5" fill="#fff" stroke="#27500a" strokeWidth="2.5" />
                          {/* Value label */}
                          <text x={x} y={y - 12} fontSize="12" fontWeight="600" fill="#27500a" textAnchor="middle">
                            {d.value}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}

              {/* X-axis labels */}
              {chartData.map((d, idx) => {
                const x = 100 + (idx * 650 / (chartData.length - 1 || 1));
                return (
                  <text key={idx} x={x} y="175" fontSize="11" fill="#9c9a92" textAnchor="middle">
                    {d.month}
                  </text>
                );
              })}
            </svg>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b6a66' }}>
            Loading chart data...
          </div>
        )}
      </div>

      {/* Insights Section - 3 Cards */}
      <div className="three-col-grid">
        <div className="card">
          <h3>Lowest Performing Measures</h3>
          <div className="measure-list">
            {['AIS-E', 'IET', 'CHL', 'CBP', 'COL-E'].map((id, idx) => (
              <div key={idx} className="measure-item" onClick={() => onNavigate('detail', id)}>
                <span>{id} — {['Adult Immunization', 'Initiation SUD Treatment', 'Chlamydia Screening', 'Controlling High BP', 'Colorectal Screening'][idx]}</span>
                <span className="rate-bad">{[38.4, 45.0, 52.1, 58.0, 62.4][idx]}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>CRSPs Needing Attention</h3>
          <div className="measure-list">
            {[
              { name: 'CRSP-004 Metro Health', rate: -9.8 },
              { name: 'CRSP-007 South Valley', rate: -5.9 },
              { name: 'CRSP-012 East Side Medical', rate: 3.2 },
              { name: 'CRSP-002 North East', rate: '+6.4' },
            ].map((item, idx) => (
              <div key={idx} className="measure-item" onClick={() => onNavigate('prov')}>
                <span>{item.name}</span>
                <span className={item.rate < 0 ? 'rate-bad' : 'rate-ok'}>{item.rate}%</span>
              </div>
            ))}
            <div style={{ fontSize: '12px', color: '#0f6e56', marginTop: '12px', cursor: 'pointer', fontWeight: 600 }}>
              View all CRSPs →
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Equity Alerts <span className="badge-alert">4 active</span></h3>
          <div className="equity-list">
            <div className="equity-item">
              <span>CHL: AI/AN 42%</span>
              <span className="equity-gap">-10.1 pts</span>
            </div>
            <div className="equity-item">
              <span>CBP: Hispanic 52%</span>
              <span className="equity-gap">-13 pts</span>
            </div>
            <div className="equity-item">
              <span>BCS-E: Black 58%</span>
              <span className="equity-gap">-17 pts</span>
            </div>
            <div className="equity-item">
              <span>GSD: Black 64%</span>
              <span className="equity-gap">-9 pts</span>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#0f6e56', marginTop: '12px', cursor: 'pointer', fontWeight: 600 }}>
            View all alerts →
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
