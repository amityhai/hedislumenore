# Workflow Service Guide

## Overview
The Workflow Service is a centralized service layer for all API calls to the Lumenore workflow endpoints. It provides a clean, reusable interface for integrating different workflows across the application.

## File Location
```
src/services/workflowService.js
```

## Architecture

### Service Structure
```
workflowService.js
├── Constants
│   ├── API_BASE_URL
│   ├── APP_ID
│   └── WORKFLOW_IDS
├── Helper Functions
│   ├── getCommonHeaders()
│   └── callWorkflow()
└── Feature Functions
    ├── fetchDashboardKPI()
    ├── fetchMeasureDetail()
    ├── fetchCareActionData()
    ├── fetchRateSimulatorData()
    └── fetchProviderScores()
```

## Configuration

### Constants
```javascript
const API_BASE_URL = 'https://dwihn-uat.lumenore.com/appsapi/appbuilder/workflow';
const APP_ID = '4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d';

const WORKFLOW_IDS = {
  DASHBOARD_KPI: '28d510c9-3284-11f1-bc78-afc84e14c8e9',
  MEASURE_DETAIL: 'workflow-id-measure-detail',
  CARE_ACTION: 'workflow-id-care-action',
  RATE_SIMULATOR: 'workflow-id-rate-simulator',
  PROVIDER_SCORES: 'workflow-id-provider-scores',
};
```

## API Functions

### 1. fetchDashboardKPI(token)
Fetches KPI data for the dashboard.

**Parameters:**
- `token` (string): Authorization token

**Returns:**
- Promise<Array> - Array of KPI objects

**Example:**
```javascript
import { fetchDashboardKPI } from '../services/workflowService';

const kpiData = await fetchDashboardKPI(token);
// Returns:
// [
//   { label: 'Above goal / target', value: 17, total: 20, type: 'above' },
//   { label: 'At goal / target', value: 2, total: 20, type: 'at' },
//   { label: 'Below benchmark / critical', value: 1, total: 20, type: 'below' }
// ]
```

### 2. fetchMeasureDetail(measureId, token)
Fetches detailed data for a specific measure.

**Parameters:**
- `measureId` (string): Measure ID
- `token` (string): Authorization token

**Returns:**
- Promise<Object> - Measure detail data

**Example:**
```javascript
import { fetchMeasureDetail } from '../services/workflowService';

const measureData = await fetchMeasureDetail('BCS-E', token);
```

### 3. fetchCareActionData(filters, token)
Fetches care action center data with optional filters.

**Parameters:**
- `filters` (object): Filter parameters
- `token` (string): Authorization token

**Returns:**
- Promise<Object> - Care action data

**Example:**
```javascript
import { fetchCareActionData } from '../services/workflowService';

const actionData = await fetchCareActionData({
  status: 'actionable',
  measure: 'FUH'
}, token);
```

### 4. fetchRateSimulatorData(measureId, token)
Fetches rate simulator data for a measure.

**Parameters:**
- `measureId` (string): Measure ID
- `token` (string): Authorization token

**Returns:**
- Promise<Object> - Rate simulator data

**Example:**
```javascript
import { fetchRateSimulatorData } from '../services/workflowService';

const simData = await fetchRateSimulatorData('BCS-E', token);
```

### 5. fetchProviderScores(filters, token)
Fetches provider scores data with optional filters.

**Parameters:**
- `filters` (object): Filter parameters
- `token` (string): Authorization token

**Returns:**
- Promise<Object> - Provider scores data

**Example:**
```javascript
import { fetchProviderScores } from '../services/workflowService';

const providerData = await fetchProviderScores({
  crspId: 'CRSP-001'
}, token);
```

## Utility Functions

### updateWorkflowId(feature, workflowId)
Update a workflow ID for a specific feature.

**Parameters:**
- `feature` (string): Feature name (DASHBOARD_KPI, MEASURE_DETAIL, etc.)
- `workflowId` (string): New workflow ID

**Example:**
```javascript
import { updateWorkflowId } from '../services/workflowService';

updateWorkflowId('DASHBOARD_KPI', 'new-workflow-id-123');
```

### getWorkflowIds()
Get all configured workflow IDs.

**Returns:**
- Object - All workflow IDs

**Example:**
```javascript
import { getWorkflowIds } from '../services/workflowService';

const ids = getWorkflowIds();
console.log(ids.DASHBOARD_KPI);
```

### getApiConfig()
Get API configuration.

**Returns:**
- Object - API configuration

**Example:**
```javascript
import { getApiConfig } from '../services/workflowService';

const config = getApiConfig();
// Returns:
// {
//   baseUrl: 'https://dwihn-uat.lumenore.com/appsapi/appbuilder/workflow',
//   appId: '4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d',
//   workflowIds: { ... }
// }
```

## Usage in Components

### Dashboard Component Example
```javascript
import { fetchDashboardKPI } from '../services/workflowService';

const Dashboard = ({ token }) => {
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
      const kpiData = await fetchDashboardKPI(token);
      setKpis(kpiData);
    } catch (err) {
      setError(err.message);
      // Fallback to mock data
    } finally {
      setLoading(false);
    }
  };

  return (
    // Component JSX
  );
};
```

## Error Handling

### Error Types
1. **Network Error** - API endpoint unreachable
2. **Authentication Error** - Invalid or expired token
3. **Response Error** - Invalid response format
4. **API Error** - API returns error status

### Error Handling Pattern
```javascript
try {
  const data = await fetchDashboardKPI(token);
  setData(data);
} catch (err) {
  console.error('Error:', err.message);
  // Use fallback data
  setData(mockData);
}
```

## Adding New Workflows

### Step 1: Add Workflow ID
```javascript
const WORKFLOW_IDS = {
  // ... existing workflows
  NEW_FEATURE: 'new-workflow-id-xyz',
};
```

### Step 2: Create Feature Function
```javascript
export const fetchNewFeatureData = async (params, token) => {
  try {
    const result = await callWorkflow(
      WORKFLOW_IDS.NEW_FEATURE,
      params,
      token
    );
    
    // Transform data as needed
    return result.data?.data || {};
  } catch (error) {
    console.error('Error fetching New Feature Data:', error);
    throw error;
  }
};
```

### Step 3: Use in Component
```javascript
import { fetchNewFeatureData } from '../services/workflowService';

const NewComponent = ({ token }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (token) {
      fetchNewFeatureData({}, token)
        .then(setData)
        .catch(err => console.error(err));
    }
  }, [token]);

  return (
    // Component JSX
  );
};
```

## Common Headers

All API requests include these headers:
```javascript
{
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'application-id': '4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d',
  'authorization': 'Bearer {token}',
  'cache-control': 'no-cache',
  'device-details': {...},
  'geo-location': 'denied',
  'loc-addr': '103.46.196.202',
  'time-zone': 'Asia/Calcutta',
  'x-lumenore-studio': 'true'
}
```

## Best Practices

1. **Always pass token** - Ensure token is valid before making API calls
2. **Handle errors gracefully** - Always provide fallback data
3. **Use loading states** - Show loading indicator while fetching
4. **Cache data when possible** - Reduce API calls
5. **Update workflow IDs** - Use `updateWorkflowId()` for configuration changes
6. **Log errors** - Use console.error for debugging

## Testing

### Test with Mock Data
```javascript
const mockKPIData = [
  { label: 'Above goal / target', value: 35, total: 88, type: 'above' },
  { label: 'At goal / target', value: 7, total: 88, type: 'at' },
  { label: 'Below benchmark / critical', value: 46, total: 88, type: 'below' }
];
```

### Test Error Handling
```javascript
// Use invalid token to trigger error
const invalidToken = 'invalid-token-123';
try {
  await fetchDashboardKPI(invalidToken);
} catch (err) {
  console.log('Error caught:', err.message);
}
```

## Files Using This Service

1. **Dashboard.js** - Uses `fetchDashboardKPI()`
2. **MeasureDetail.js** - Uses `fetchMeasureDetail()` (to be implemented)
3. **CareActionCenter.js** - Uses `fetchCareActionData()` (to be implemented)
4. **RateSimulator.js** - Uses `fetchRateSimulatorData()` (to be implemented)
5. **ProviderScores.js** - Uses `fetchProviderScores()` (to be implemented)

## Future Enhancements

1. Add request caching
2. Add retry logic for failed requests
3. Add request timeout handling
4. Add analytics/logging
5. Add request interceptors
6. Add response validation
7. Add offline support
