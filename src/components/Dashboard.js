import { useState, useEffect, useRef, useCallback } from 'react';
import './Dashboard.css';
import MonthFilter from './MonthFilter';
import StatusBadge from './ui/StatusBadge';
import { Skeleton, SkeletonText, EmptyState, ErrorState } from './ui/Feedback';
import {
  fetchDashboardKPI,
  fetchChartMeasuresMeetingTarget,
  fetchAllMeasuresGrid,
  fetchLowestPerformingMeasures,
  fetchCRSPsNeedingAttention,
  fetchEquityAlerts,
} from '../services/workflowService';

// KPI cards map 1:1 onto the three status buckets returned by fetchDashboardKPI.
// Status is shown by shape + label + color (never color alone).
const KPI_DEFS = [
  { status: 'Above Goal', tone: 'above', glyph: '▲', caption: 'on or above target' },
  { status: 'At Goal', tone: 'at', glyph: '●', caption: 'meeting target' },
  { status: 'Below Goal', tone: 'below', glyph: '▼', caption: 'need attention' },
];

const MATRIX_PAGE_SIZE = 6;

// Severity coloring for insight value pills (Direction A): red < 25, amber < 50, else green.
const sevClass = (v) => {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return 'pill-sev pill-sev-red';
  if (n < 25) return 'pill-sev pill-sev-red';
  if (n < 50) return 'pill-sev pill-sev-amber';
  return 'pill-sev pill-sev-green';
};

const Dashboard = ({ onNavigate, token, selectedMonth, onMonthChange, availableMonths }) => {
  const [kpis, setKpis] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [measuresGrid, setMeasuresGrid] = useState([]);
  const [lowestPerformingMeasures, setLowestPerformingMeasures] = useState([]);
  const [crspNeedingAttention, setCRSPNeedingAttention] = useState([]);
  const [equityAlerts, setEquityAlerts] = useState([]);
  const [currentMatrixPage, setCurrentMatrixPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Below Goal');
  const matrixRef = useRef(null);

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [kpiData, chart, grid, lowest, crsp, equity] = await Promise.all([
        fetchDashboardKPI(token),
        fetchChartMeasuresMeetingTarget(token),
        fetchAllMeasuresGrid(token),
        fetchLowestPerformingMeasures(token),
        fetchCRSPsNeedingAttention(token),
        fetchEquityAlerts(token),
      ]);
      setKpis(kpiData);
      setChartData(chart);
      setMeasuresGrid(grid);
      setLowestPerformingMeasures(lowest);
      setCRSPNeedingAttention(crsp);
      setEquityAlerts(equity);
      setUsingFallback(false);
    } catch (err) {
      // Keep the page demonstrable, but be honest that it isn't live data.
      setKpis([
        { label: 'Above Goal', value: 35, total: 88 },
        { label: 'At Goal', value: 7, total: 88 },
        { label: 'Below Goal', value: 46, total: 88 },
      ]);
      setChartData([
        { month: 'Jan-2026', value: 19 }, { month: 'Feb-2026', value: 22 },
        { month: 'Mar-2026', value: 20 }, { month: 'Apr-2026', value: 26 },
        { month: 'May-2026', value: 31 }, { month: 'Jun-2026', value: 35 },
      ]);
      setMeasuresGrid([]);
      setLowestPerformingMeasures([]);
      setCRSPNeedingAttention([]);
      setEquityAlerts([]);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Refetch on token / month change.
  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedMonth]);

  const filteredMeasures = measuresGrid.filter((m) => m.kpi_status === statusFilter);
  const totalMatrixPages = Math.max(1, Math.ceil(filteredMeasures.length / MATRIX_PAGE_SIZE));
  const paginatedMeasures = filteredMeasures.slice(
    (currentMatrixPage - 1) * MATRIX_PAGE_SIZE,
    currentMatrixPage * MATRIX_PAGE_SIZE
  );

  useEffect(() => {
    if (currentMatrixPage > totalMatrixPages) setCurrentMatrixPage(totalMatrixPages);
  }, [currentMatrixPage, totalMatrixPages]);

  const selectStatus = (status, index) => {
    setStatusFilter(status);
    setCurrentMatrixPage(1);
    setTimeout(() => matrixRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const onKpiKeyDown = (e, index) => {
    const cards = Array.from(document.querySelectorAll('.kpi2'));
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      cards[(index + 1) % cards.length]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      cards[(index - 1 + cards.length) % cards.length]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectStatus(KPI_DEFS[index].status, index);
    }
  };

  return (
    <div className="dash">
      {/* Header */}
      <header className="dash-head">
        <div>
          <div className="eyebrow dash-eyebrow">OVERVIEW</div>
          <h1 className="dash-title">Quality Management Command Center</h1>
          <p className="dash-sub">Measure performance — find the gaps worth closing.</p>
        </div>
        <MonthFilter selectedMonth={selectedMonth} onMonthChange={onMonthChange} availableMonths={availableMonths} />
      </header>

      {usingFallback && !loading && (
        <div className="dash-notice" role="status">
          <span>Live data unavailable — showing sample data.</span>
          <button type="button" className="dash-notice-retry" onClick={fetchDashboardData}>↻ Retry</button>
        </div>
      )}

      {/* KPI tabs */}
      <div className="kpi2-grid" role="tablist" aria-label="Filter measures by status">
        {KPI_DEFS.map((def, i) => {
          const data = kpis[i] || {};
          const active = statusFilter === def.status;
          return (
            <button
              key={def.status}
              className={`kpi2 kpi2-${def.tone} ${active ? 'is-active' : ''}`}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => selectStatus(def.status, i)}
              onKeyDown={(e) => onKpiKeyDown(e, i)}
            >
              <span className="kpi2-top">
                <span className="kpi2-label">{def.status}</span>
                <span className="kpi2-dot" aria-hidden="true" />
              </span>
              {loading ? (
                <Skeleton width={120} height={30} radius={6} style={{ marginTop: 6 }} />
              ) : (
                <>
                  <span className="kpi2-main">
                    <span className="kpi2-value num">{data.value ?? '—'}</span>
                    <span className="kpi2-total num">/ {data.total ?? '—'} {def.tone === 'below' ? '' : 'measures'}</span>
                    {def.tone === 'below' && <span className="kpi2-cap-inline">need attention</span>}
                  </span>
                  <span className="kpi2-bar" aria-hidden="true">
                    <span
                      className="kpi2-bar-fill"
                      style={{ width: data.total ? `${Math.round((data.value / data.total) * 100)}%` : '0%' }}
                    />
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Measure table */}
      <section className="panel" ref={matrixRef} role="tabpanel" aria-label={`${statusFilter} measures`}>
        <div className="panel-head">
          <div className="panel-head-left">
            <h2 className="panel-title">Measure Health</h2>
            <StatusBadge status={statusFilter} size="sm" />
          </div>
          <span className="panel-count num">{loading ? '—' : `${filteredMeasures.length} measures`}</span>
        </div>

        {loading ? (
          <div className="mtable">
            {Array.from({ length: 5 }).map((_, i) => (
              <div className="mtable-row" key={i}><Skeleton height={16} /></div>
            ))}
          </div>
        ) : filteredMeasures.length === 0 ? (
          <EmptyState
            icon={statusFilter === 'Below Goal' ? '✅' : '🔍'}
            title={`No measures ${statusFilter.toLowerCase()}`}
            hint={statusFilter === 'Below Goal' ? 'Nothing needs attention in this view for the selected month.' : 'Try another status tab above.'}
          />
        ) : (
          <>
            <div className="mtable" key={statusFilter}>
              <div className="mtable-head">
                <span>Measure</span>
                <span className="ta-r">Num</span>
                <span className="ta-r">Denom</span>
                <span className="rvg-head">Rate vs goal</span>
                <span>Status</span>
                <span className="ta-r"></span>
              </div>
              {paginatedMeasures.map((m, idx) => {
                const rate = Number(m.rate) || 0;
                const goal = Number(m.goal_50th) || 0;
                const gap = Math.round((rate - goal) * 10) / 10;
                const tone = m.kpi_status === 'Above Goal' ? 'above' : m.kpi_status === 'At Goal' ? 'at' : 'below';
                return (
                  <div className="mtable-row mtable-data" key={idx}>
                    <span className="m-name">
                      <span className="m-id mono">{(m.measure_id || 'N/A').replace(/_/g, ' ')}</span>
                      <span className="m-full">{m.display_name}</span>
                    </span>
                    <span className="ta-r num m-soft">{parseInt(m.numerator, 10).toLocaleString()}</span>
                    <span className="ta-r num m-soft">{parseInt(m.denominator, 10).toLocaleString()}</span>
                    <span className="rvg">
                      <span className="rvg-top">
                        <span className="rvg-rate num">{rate}%</span>
                        {goal > 0 && (
                          <span className={`rvg-gap num ${gap >= 0 ? 'pos' : 'neg'}`}>{gap >= 0 ? '+' : ''}{gap} pts</span>
                        )}
                      </span>
                      <span className="rvg-track">
                        <span className={`rvg-fill rvg-${tone}`} style={{ width: `${Math.min(100, rate)}%` }} />
                        {goal > 0 && <span className="rvg-goal" style={{ left: `${Math.min(100, goal)}%` }} />}
                      </span>
                    </span>
                    <span><StatusBadge status={m.kpi_status} size="sm" /></span>
                    <span className="ta-r">
                      <button type="button" className="deepdive-link" onClick={() => onNavigate && onNavigate('detail', m.measure_id)}>
                        Deep Dive <span aria-hidden="true">→</span>
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>

            {totalMatrixPages > 1 && (
              <div className="pager">
                <button type="button" className="pager-nav" disabled={currentMatrixPage === 1} onClick={() => setCurrentMatrixPage((p) => Math.max(1, p - 1))}>‹</button>
                {Array.from({ length: totalMatrixPages }, (_, i) => i + 1).map((page) => (
                  <button key={page} type="button" className={`pager-btn ${currentMatrixPage === page ? 'active' : ''}`} onClick={() => setCurrentMatrixPage(page)}>{page}</button>
                ))}
                <button type="button" className="pager-nav" disabled={currentMatrixPage === totalMatrixPages} onClick={() => setCurrentMatrixPage((p) => Math.min(totalMatrixPages, p + 1))}>›</button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Insights */}
      <div className="eyebrow insights-eyebrow">WHERE TO FOCUS</div>
      <div className="insights-grid">
        <InsightCard
          title="Lowest Performing Measures"
          loading={loading}
          items={lowestPerformingMeasures}
          emptyHint="No underperforming measures."
          renderItem={(m, i) => (
            <button key={i} className="insight-row" onClick={() => onNavigate('detail', m.measure_id)}>
              <span className="insight-label">{m.display_name}</span>
              <span className={`${sevClass(m.rate)} num`}>{m.rate}%</span>
            </button>
          )}
        />
        <InsightCard
          title="CRSPs Needing Attention"
          loading={loading}
          items={crspNeedingAttention}
          emptyHint="No CRSPs flagged."
          renderItem={(c, i) => (
            <button key={i} className="insight-row" onClick={() => onNavigate('detail', c.measure_id)}>
              <span className="insight-label small">{c.measure_id.replace(/_/g, ' ')}: {c.crsp_name}</span>
              <span className={`${sevClass(c.rate)} num`}>{c.rate}%</span>
            </button>
          )}
        />
        <InsightCard
          title="Equity Alerts"
          badge={!loading && equityAlerts.length > 0 ? `${equityAlerts.length} active` : null}
          loading={loading}
          items={equityAlerts}
          emptyHint="No equity disparities detected."
          renderItem={(a, i) => (
            <button key={i} className="insight-row" onClick={() => onNavigate('detail', a.measure_id)}>
              <span className="insight-label small">{a.measure_id.replace(/_/g, ' ')}: {a.race_strat}</span>
              <span className={`${sevClass(a.rate)} num`}>{a.rate}%</span>
            </button>
          )}
        />
      </div>
    </div>
  );
};

// Consistent insight card with loading / empty handling.
const InsightCard = ({ title, badge, loading, items, renderItem, emptyHint }) => (
  <div className="insight-card">
    <h3 className="insight-title">
      {title}
      {badge && <span className="insight-badge">{badge}</span>}
    </h3>
    <div className="insight-list">
      {loading ? (
        <SkeletonText lines={4} />
      ) : items && items.length > 0 ? (
        items.map(renderItem)
      ) : (
        <EmptyState icon="—" hint={emptyHint} />
      )}
    </div>
  </div>
);

export default Dashboard;
