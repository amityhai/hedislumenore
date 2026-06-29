import React, { useState, useEffect } from 'react';
import './MeasurePerformanceSection.css';
import StatusBadge from './ui/StatusBadge';
import { Skeleton, ErrorState } from './ui/Feedback';
import { fetchDashboardMeasures, fetchMiniChartData } from '../services/workflowService';

const MeasurePerformanceSection = ({
  token,
  onMeasureSelect,
  onDeepDive,
  onSimulate,
  initialMeasureId,
  // Controlled month props. If omitted, the component falls back to its own
  // internal state so it still works when rendered without a parent that
  // cares about the month.
  selectedMonth: selectedMonthProp,
  onMonthChange: onMonthChangeProp,
  availableMonths
}) => {
  const [activePill, setActivePill] = useState(null);
  const [activeDom, setActiveDom] = useState('eoc');
  const [domMeasures, setDomMeasures] = useState({
    eoc: [],
    ecds: [],
    aac: [],
    uru: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [miniChartData, setMiniChartData] = useState([]);
  const [internalSelectedMonth, setInternalSelectedMonth] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const isMonthControlled = selectedMonthProp !== undefined;
  const selectedMonth = isMonthControlled ? selectedMonthProp : internalSelectedMonth;
  const handleMonthChange = (value) => {
    if (onMonthChangeProp) onMonthChangeProp(value);
    if (!isMonthControlled) setInternalSelectedMonth(value);
  };

  // Fetch measures data on component mount and when initialMeasureId changes
  useEffect(() => {
    const loadMeasures = async () => {
      try {
        setLoading(true);
        const data = await fetchDashboardMeasures(token);
        setDomMeasures(data);
        
        // If initialMeasureId is provided, find and select it
        if (initialMeasureId) {
          for (const domKey in data) {
            const found = data[domKey].find(m => m.id === initialMeasureId);
            if (found) {
              setActivePill(initialMeasureId);
              setActiveDom(domKey);
              onMeasureSelect && onMeasureSelect(initialMeasureId);
              return;
            }
          }
        }
        
        // Otherwise, set initial active pill to first measure in EOC
        if (data.eoc && data.eoc.length > 0) {
          setActivePill(data.eoc[0].id);
          setActiveDom('eoc');
          // Notify parent of selected measure
          onMeasureSelect && onMeasureSelect(data.eoc[0].id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadMeasures();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, initialMeasureId, reloadKey]);

  // Refetch measures data when month changes (to keep data current)
  // but preserve the currently selected pill
  useEffect(() => {
    const refetchMeasures = async () => {
      try {
        const data = await fetchDashboardMeasures(token);
        setDomMeasures(data);
      } catch (err) {
        // Silent fail - keep existing data
      }
    };

    if (token && selectedMonth) {
      refetchMeasures();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedMonth]);

  // Notify parent when selected measure changes
  useEffect(() => {
    if (activePill && onMeasureSelect) {
      onMeasureSelect(activePill);
    }
  }, [activePill, onMeasureSelect]);

  // Fetch mini chart data when active pill or selected month changes
  useEffect(() => {
    const loadMiniChartData = async () => {
      if (activePill && token) {
        try {
          const data = await fetchMiniChartData(activePill, token);
          setMiniChartData(data);
        } catch (err) {
          setMiniChartData([]);
        }
      }
    };

    loadMiniChartData();
  }, [activePill, token, selectedMonth]);

  const domLabels = {
    eoc: 'EOC',
    ecds: 'ECDS',
    aac: 'AAC',
    uru: 'URU'
  };

  const currentMeasures = domMeasures[activeDom] || [];
  const selectedMeasure = currentMeasures.find(m => m.id === activePill) || currentMeasures[0];

  if (loading) {
    return (
      <section className="measure-performance">
        <div className="mp-header">
          <Skeleton width={160} height={14} />
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Skeleton width={220} height={32} radius={8} />
          <Skeleton width="100%" height={120} radius={12} />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="measure-performance">
        <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      </section>
    );
  }

  const gapToGoal = selectedMeasure ? selectedMeasure.rate - selectedMeasure.goal : 0;
  const openGaps = selectedMeasure ? selectedMeasure.denom - selectedMeasure.num : 0;

  // Generate mini chart SVG based on data
  const generateMiniChart = () => {
    if (!miniChartData || miniChartData.length === 0) {
      return null;
    }

    const width = 200;
    const height = 100;
    const padding = 20;
    const chartWidth = width - padding - 50;
    const chartHeight = 50;
    const maxRate = 100;

    // Calculate points
    const points = miniChartData.map((d, idx) => {
      const x = padding + (idx / (miniChartData.length - 1 || 1)) * chartWidth;
      const y = height - 35 - (d.rate / maxRate) * chartHeight;
      return { x, y, rate: d.rate, month: d.month };
    });

    // Create line path
    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ overflow: 'visible' }}>
        {/* Line */}
        <path d={linePath} stroke="var(--c-primary)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        
        {/* Points */}
        {points.map((p, idx) => (
          <circle
            key={`point-${idx}`}
            cx={p.x}
            cy={p.y}
            r={idx === points.length - 1 ? 5.5 : 2.5}
            fill={idx === points.length - 1 ? 'var(--c-primary)' : 'var(--c-border)'}
          />
        ))}

        {/* Current rate label with % sign */}
        {points.length > 0 && (
          <g>
            <text 
              x={points[points.length - 1].x + 15} 
              y={points[points.length - 1].y - 2} 
              fontSize="14" 
              fontWeight="700" 
              fill="var(--c-primary)"
              textAnchor="start"
            >
              {points[points.length - 1].rate}%
            </text>
          </g>
        )}

        {/* Month labels */}
        {points.map((p, idx) => (
          <text 
            key={`label-${idx}`} 
            x={p.x} 
            y={height - 8} 
            fontSize="11" 
            fill="var(--c-text-4)"
            textAnchor="middle"
            fontWeight="500"
          >
            {p.month.split('-')[0]}
          </text>
        ))}
      </svg>
    );
  };

  const st = selectedMeasure
    ? (selectedMeasure.rate > selectedMeasure.goal ? 'above' : selectedMeasure.rate === selectedMeasure.goal ? 'at' : 'below')
    : 'below';
  const STATUS_LABEL = { above: 'Above Goal', at: 'At Goal', below: 'Below Goal' };

  return (
    <section className="measure-performance">
      <div className="mp-tabs">
        {Object.keys(domLabels).map((domKey) => (
          <button
            key={domKey}
            className={`tab ${activeDom === domKey ? 'active' : ''}`}
            onClick={() => {
              setActiveDom(domKey);
              if (domMeasures[domKey] && domMeasures[domKey].length > 0) {
                setActivePill(domMeasures[domKey][0].id);
                onMeasureSelect && onMeasureSelect(domMeasures[domKey][0].id);
              } else {
                setActivePill(null);
              }
            }}
          >
            {domLabels[domKey]}
          </button>
        ))}
      </div>

      <div className="mp-pills">
        {currentMeasures.length > 0 ? (
          currentMeasures.map((m) => {
            let statusClass = 'outline-red'; // default below goal
            if (m.rate > m.goal) {
              statusClass = 'outline-green'; // above goal
            } else if (m.rate === m.goal) {
              statusClass = 'outline-blue'; // at goal
            }

            let activeStatusClass = '';
            if (activePill === m.id) {
              if (m.rate > m.goal) {
                activeStatusClass = 'above-goal';
              } else if (m.rate === m.goal) {
                activeStatusClass = 'at-goal';
              } else {
                activeStatusClass = 'below-goal';
              }
            }

            return (
              <button
                key={m.id}
                className={`pill ${activePill === m.id ? 'active' : ''} ${statusClass} ${activeStatusClass}`}
                onClick={() => {
                  setActivePill(m.id);
                  onMeasureSelect && onMeasureSelect(m.id);
                }}
              >
                {m.id.replace(/_/g, ' ')}
              </button>
            );
          })
        ) : (
          <div style={{ fontSize: '13px', color: '#9ca3af', padding: '8px 0' }}>
            No measures available in this category
          </div>
        )}
      </div>

      {selectedMeasure && (
        <div className="mp-card">
          <div className="mp-card-head">
            <span className="mp-code mono">{selectedMeasure.id.replace(/_/g, ' ')}</span>
            <span className="mp-name">{selectedMeasure.name}</span>
            <StatusBadge status={STATUS_LABEL[st]} size="sm" />
          </div>

          <div className="mp-card-body">
            <div className="mp-content">
              <div className="mini-chart">
                {miniChartData && miniChartData.length > 0 ? (
                  generateMiniChart()
                ) : (
                  <svg viewBox="0 0 170 92" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <line x1="24" y1="52" x2="140" y2="36" stroke="var(--c-primary)" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="24" cy="52" r="2.5" fill="var(--c-border)" />
                    <circle cx="56" cy="46" r="2.5" fill="var(--c-border)" />
                    <circle cx="88" cy="39" r="2.5" fill="var(--c-border)" />
                    <circle cx="120" cy="35" r="2.5" fill="var(--c-border)" />
                    <circle cx="150" cy="34" r="5.5" fill="var(--c-primary)" />
                    <text x="162" y="38" fontSize="11" fontWeight="700" fill="var(--c-primary)">
                      {selectedMeasure.rate}%
                    </text>
                    <text x="14" y="88" fontSize="10" fill="var(--c-text-4)">
                      MY23
                    </text>
                    <text x="46" y="88" fontSize="10" fill="var(--c-text-4)">
                      MY24
                    </text>
                    <text x="78" y="88" fontSize="10" fill="var(--c-text-4)">
                      MY25
                    </text>
                    <text x="110" y="88" fontSize="10" fill="var(--c-text-4)">
                      MY26
                    </text>
                  </svg>
                )}
              </div>

              <div className="kpis">
                <div className="kpi">
                  <span className="kpi-label">Numerator</span>
                  <span className="kpi-value">{selectedMeasure.num.toLocaleString()}</span>
                </div>
                <div className="kpi">
                  <span className="kpi-label">Denominator</span>
                  <span className="kpi-value">{selectedMeasure.denom.toLocaleString()}</span>
                </div>
                <div className="kpi">
                  <span className="kpi-label">Non-Compliant</span>
                  <span className="kpi-value">{openGaps.toLocaleString()}</span>
                </div>
                <div className="kpi">
                  <span className="kpi-label">Rate</span>
                  <span className="kpi-value rate">{selectedMeasure.rate}%</span>
                </div>
                <div className="kpi">
                  <span className="kpi-label">Goal</span>
                  <span className="kpi-value">{selectedMeasure.goal}%</span>
                </div>
                <div className="kpi">
                  <span className="kpi-label">Gap to Goal</span>
                  <span className={`kpi-value ${gapToGoal >= 0 ? 'positive' : 'gap-negative'}`}>
                    {gapToGoal >= 0 ? '↑' : ''} {gapToGoal.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mp-ratebar">
            <div className="mp-ratebar-track">
              <div className={`mp-ratebar-fill mp-fill-${st}`} style={{ width: `${Math.min(100, selectedMeasure.rate)}%` }} />
              <div className="mp-ratebar-goal" style={{ left: `${Math.min(100, selectedMeasure.goal)}%` }} />
            </div>
            <div className="mp-ratebar-labels">
              <span>Current rate</span>
              <span>Vertical line marks the {selectedMeasure.goal}% goal</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default MeasurePerformanceSection;
