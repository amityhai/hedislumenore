# Measures Workflow Integration

## Overview
Dashboard measures data is now integrated with the Lumenore workflow API. Measures are fetched from the API and organized by category (EOC, ECDS, AAC, URU).

## Workflow Details

**Workflow ID:** `0a483e41-3282-11f1-bc78-3b7e37da8ec2`

**Endpoint:** `https://dwihn-uat.lumenore.com/appsapi/appbuilder/workflow`

## API Response Structure

The workflow returns measure data with the following columns:

| Column | Type | Description |
|--------|------|-------------|
| measure_id | Varchar | Unique measure identifier (e.g., 'BCS-E') |
| category | Varchar | Measure category (EOC, ECDS, AAC, URU) |
| display_name | Varchar | Human-readable measure name |
| numerator | Integer | Number of patients meeting measure |
| denominator | Integer | Total eligible patients |
| rate | Numeric | Performance rate (%) |
| gap_to_goal | Float | Gap between current rate and goal |
| goal_50th | Varchar | 50th percentile goal |
| kpi_status | Varchar | Status (Above Goal, At Goal, Below Goal) |

## Data Transformation

The API response is transformed into the following structure:

```javascript
{
  eoc: [
    {
      id: 'CBP',
      name: 'Controlling High Blood Pressure',
      rate: 65,
      goal: 55,
      gaps: 860,
      actionable: true,
      denom: 377797,
      num: 245636,
      type: 'Screening',
      method: 'EOC',
      gapToGoal: -10
    },
    // ... more measures
  ],
  ecds: [ /* ... */ ],
  aac: [ /* ... */ ],
  uru: [ /* ... */ ]
}
```

## Implementation

### 1. WorkflowService (`src/services/workflowService.js`)

Added `fetchDashboardMeasures()` function:

```javascript
export const fetchDashboardMeasures = async (token) => {
  // Fetches measures from workflow
  // Transforms and organizes by category
  // Returns organized measures object
};
```

### 2. Dashboard Component (`src/components/Dashboard.js`)

Updated to fetch both KPI and measures:

```javascript
const [kpiData, measuresData] = await Promise.all([
  fetchDashboardKPI(token),
  fetchDashboardMeasures(token)
]);
```

## Data Flow

```
App.js (token)
    ↓
Dashboard.js (receives token)
    ↓
fetchDashboardData()
    ├─ fetchDashboardKPI(token)
    │  └─ Returns KPI cards data
    └─ fetchDashboardMeasures(token)
       └─ Returns measures organized by category
           ├─ eoc: []
           ├─ ecds: []
           ├─ aac: []
           └─ uru: []
```

## Category Mapping

| API Category | Display | Measures |
|--------------|---------|----------|
| EOC | EOC | Controlling High BP, Chlamydia Screening, etc. |
| ECDS | ECDS | Breast Cancer Screening, Colorectal Screening, etc. |
| AAC | AAC | Adults Access to Preventive Health, etc. |
| URU | URU | Plan All-Cause Readmissions, ED Utilization, etc. |

## Features

✅ Real-time measures data from workflow API
✅ Automatic category organization (EOC, ECDS, AAC, URU)
✅ Calculated gaps to goal
✅ Performance rate display
✅ Actionable flag based on KPI status
✅ Fallback to mock data on error
✅ Token-based authentication

## Error Handling

If the workflow API fails:
1. Error is logged to console
2. Fallback to mock measures data
3. Error message displayed in UI
4. App continues to function

## Usage in Components

```javascript
// In Dashboard.js
const [measures, setMeasures] = useState({ eoc: [], ecds: [], aac: [], uru: [] });

// Fetch data
const [kpiData, measuresData] = await Promise.all([
  fetchDashboardKPI(token),
  fetchDashboardMeasures(token)
]);

// Use measures
const currentMeasures = measures[currentDom]; // Get measures for current category
```

## Sample Response

The API returns 20 measures across all categories:

- **EOC (8 measures):** CBP, CHL, GSD, SAA, FUH, FUM, FUA, IET, POD, WCC, EED
- **ECDS (6 measures):** BCS-E, COL-E, CCS-E, AIS-E, ADD-E_CONT, ADD-E_INIT
- **AAC (0 measures in response):** Ready for data
- **URU (0 measures in response):** Ready for data

## Next Steps

1. When AAC and URU workflow data becomes available, it will automatically be included
2. Update category mapping if needed
3. Add filtering/sorting capabilities
4. Implement measure detail drill-down

## Testing

To test the integration:

1. Open Dashboard component
2. Check browser console for API calls
3. Verify measures data is fetched and organized by category
4. Switch between DOM tabs (EOC, ECDS, AAC, URU)
5. Verify measures display correctly for each category
