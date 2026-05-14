# Workflow Service Integration Examples

This document shows how to integrate the workflow service into each component.

## 1. Dashboard Component ✅ (Already Implemented)

```javascript
import React, { useState, useEffect } from 'react';
import { fetchDashboardKPI } from '../services/workflowService';

const Dashboard = ({ onNavigate, token }) => {
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      fetchKPIData();
    }
  }, [token]);

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      setError(null);
      const kpiData = await fetchDashboardKPI(token);
      setKpis(kpiData);
    } catch (err) {
      console.error('Error fetching KPI data:', err);
      setError(err.message);
      // Fallback to mock data
      setKpis([
        { label: 'Above goal / target', value: 35, total: 88, type: 'above' },
        { label: 'At goal / target', value: 7, total: 88, type: 'at' },
        { label: 'Below benchmark / critical', value: 46, total: 88, type: 'below' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* KPI rendering with loading/error states */}
    </div>
  );
};

export default Dashboard;
```

---

## 2. Measure Detail Component (Ready to Implement)

```javascript
import React, { useState, useEffect } from 'react';
import { fetchMeasureDetail } from '../services/workflowService';
import './MeasureDetail.css';

const MeasureDetail = ({ measureId, token, onBack }) => {
  const [measureData, setMeasureData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token && measureId) {
      fetchData();
    }
  }, [token, measureId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMeasureDetail(measureId, token);
      setMeasureData(data);
    } catch (err) {
      console.error('Error fetching measure detail:', err);
      setError(err.message);
      // Use mock data as fallback
      setMeasureData({
        name: 'Breast Cancer Screening',
        rate: 66,
        goal: 72,
        gaps: 538
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading measure details...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="measure-detail-container">
      <button onClick={onBack}>← Back</button>
      {measureData && (
        <div>
          <h1>{measureData.name}</h1>
          <p>Rate: {measureData.rate}%</p>
          <p>Goal: {measureData.goal}%</p>
          <p>Gaps: {measureData.gaps}</p>
        </div>
      )}
    </div>
  );
};

export default MeasureDetail;
```

---

## 3. Care Action Center Component (Ready to Implement)

```javascript
import React, { useState, useEffect } from 'react';
import { fetchCareActionData } from '../services/workflowService';
import './CareActionCenter.css';

const CareActionCenter = ({ token, onBack }) => {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    measure: 'all',
    crsp: 'all'
  });

  useEffect(() => {
    if (token) {
      fetchActions();
    }
  }, [token, filters]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCareActionData(filters, token);
      setActions(data.resultSet || []);
    } catch (err) {
      console.error('Error fetching care actions:', err);
      setError(err.message);
      // Use mock data as fallback
      setActions([
        {
          memberId: '0094184633',
          name: 'Adams, Daisha',
          measure: 'FUH',
          status: 'Urgent',
          daysLeft: '2 days'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  if (loading) return <div className="loading">Loading care actions...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="cac-container">
      <button onClick={onBack}>← Back</button>
      
      <div className="filters">
        <select 
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="urgent">Urgent</option>
          <option value="actionable">Actionable</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Member ID</th>
            <th>Name</th>
            <th>Measure</th>
            <th>Status</th>
            <th>Days Left</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action, idx) => (
            <tr key={idx}>
              <td>{action.memberId}</td>
              <td>{action.name}</td>
              <td>{action.measure}</td>
              <td>{action.status}</td>
              <td>{action.daysLeft}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CareActionCenter;
```

---

## 4. Rate Simulator Component (Ready to Implement)

```javascript
import React, { useState, useEffect } from 'react';
import { fetchRateSimulatorData } from '../services/workflowService';
import './RateSimulator.css';

const RateSimulator = ({ token, onBack }) => {
  const [simData, setSimData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMeasure, setSelectedMeasure] = useState('BCS-E');
  const [gapsToClose, setGapsToClose] = useState(0);

  useEffect(() => {
    if (token && selectedMeasure) {
      fetchSimData();
    }
  }, [token, selectedMeasure]);

  const fetchSimData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRateSimulatorData(selectedMeasure, token);
      setSimData(data);
    } catch (err) {
      console.error('Error fetching simulator data:', err);
      setError(err.message);
      // Use mock data as fallback
      setSimData({
        rate: 66,
        goal: 72,
        gaps: 538,
        denom: 1582
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateProjectedRate = () => {
    if (!simData) return 0;
    const newNum = (simData.denom * (simData.rate / 100)) + gapsToClose;
    return ((newNum / simData.denom) * 100).toFixed(2);
  };

  if (loading) return <div className="loading">Loading simulator...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="simulator-container">
      <button onClick={onBack}>← Back</button>
      
      <div className="measure-selector">
        <label>Select Measure:</label>
        <select 
          value={selectedMeasure}
          onChange={(e) => setSelectedMeasure(e.target.value)}
        >
          <option value="BCS-E">BCS-E - Breast Cancer Screening</option>
          <option value="CBP">CBP - Controlling High BP</option>
          <option value="CHL">CHL - Chlamydia Screening</option>
        </select>
      </div>

      {simData && (
        <div className="simulator-content">
          <div className="metrics">
            <div>Current Rate: {simData.rate}%</div>
            <div>Goal: {simData.goal}%</div>
            <div>Open Gaps: {simData.gaps}</div>
          </div>

          <div className="slider-section">
            <label>Gaps to Close:</label>
            <input 
              type="range" 
              min="0" 
              max={simData.gaps}
              value={gapsToClose}
              onChange={(e) => setGapsToClose(parseInt(e.target.value))}
            />
            <span>{gapsToClose}</span>
          </div>

          <div className="result">
            <div>Projected Rate: {calculateProjectedRate()}%</div>
            <div>Gap to Goal: {(calculateProjectedRate() - simData.goal).toFixed(2)}%</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RateSimulator;
```

---

## 5. Provider Scores Component (Ready to Implement)

```javascript
import React, { useState, useEffect } from 'react';
import { fetchProviderScores } from '../services/workflowService';
import './ProviderScores.css';

const ProviderScores = ({ token, onBack }) => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCrsp, setExpandedCrsp] = useState(null);

  useEffect(() => {
    if (token) {
      fetchProviderData();
    }
  }, [token]);

  const fetchProviderData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProviderScores({ search: searchTerm }, token);
      setProviders(data.resultSet || []);
    } catch (err) {
      console.error('Error fetching provider scores:', err);
      setError(err.message);
      // Use mock data as fallback
      setProviders([
        {
          id: 'CRSP-001',
          name: 'North East Medical Group',
          panel: 4502,
          providers: 12,
          avg: 74.2
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  if (loading) return <div className="loading">Loading provider scores...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="provider-container">
      <button onClick={onBack}>← Back</button>
      
      <div className="search-box">
        <input 
          type="text"
          placeholder="Search CRSP groups..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      <div className="provider-list">
        {providers.map((provider) => (
          <div key={provider.id} className="crsp-card">
            <div 
              className="crsp-head"
              onClick={() => setExpandedCrsp(
                expandedCrsp === provider.id ? null : provider.id
              )}
            >
              <div>
                <div className="crsp-name">{provider.name}</div>
                <div className="crsp-meta">
                  Panel: {provider.panel} | Providers: {provider.providers} | Avg: {provider.avg}%
                </div>
              </div>
            </div>

            {expandedCrsp === provider.id && (
              <div className="crsp-body">
                {/* Provider details table */}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProviderScores;
```

---

## Integration Checklist

For each component, follow these steps:

- [ ] Import the service function
- [ ] Add state for data, loading, error
- [ ] Add useEffect to fetch data when token changes
- [ ] Handle loading state
- [ ] Handle error state with fallback data
- [ ] Transform API response if needed
- [ ] Render the data
- [ ] Add filters/search if needed
- [ ] Test with real API
- [ ] Test error handling

## Common Patterns

### Pattern 1: Simple Data Fetch
```javascript
useEffect(() => {
  if (token) {
    fetchData();
  }
}, [token]);

const fetchData = async () => {
  try {
    setLoading(true);
    const data = await fetchServiceFunction(token);
    setData(data);
  } catch (err) {
    setError(err.message);
    setData(mockData);
  } finally {
    setLoading(false);
  }
};
```

### Pattern 2: Fetch with Filters
```javascript
useEffect(() => {
  if (token) {
    fetchData();
  }
}, [token, filters]);

const fetchData = async () => {
  try {
    setLoading(true);
    const data = await fetchServiceFunction(filters, token);
    setData(data);
  } catch (err) {
    setError(err.message);
    setData(mockData);
  } finally {
    setLoading(false);
  }
};
```

### Pattern 3: Fetch with Parameters
```javascript
useEffect(() => {
  if (token && selectedId) {
    fetchData();
  }
}, [token, selectedId]);

const fetchData = async () => {
  try {
    setLoading(true);
    const data = await fetchServiceFunction(selectedId, token);
    setData(data);
  } catch (err) {
    setError(err.message);
    setData(mockData);
  } finally {
    setLoading(false);
  }
};
```

## Testing

### Test with Real API
1. Ensure token is valid
2. Check network tab for API response
3. Verify data displays correctly

### Test Error Handling
1. Use invalid token
2. Verify fallback data displays
3. Check error message shows

### Test Loading State
1. Add network throttling
2. Verify loading indicator shows
3. Verify data displays after loading

## Troubleshooting

### Issue: Data not loading
- Check token is valid
- Check network tab for API errors
- Check console for error messages

### Issue: Wrong data displaying
- Check API response format
- Check data transformation logic
- Check component state updates

### Issue: Error not showing
- Check error state is set
- Check error message is not empty
- Check error UI is rendered

## Next Steps

1. Update each component with service integration
2. Test with real API
3. Add error handling UI
4. Add loading indicators
5. Add data caching if needed
6. Add analytics/logging
