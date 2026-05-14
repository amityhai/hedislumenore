# Measures Workflow - Quick Reference

## Workflow ID
`0a483e41-3282-11f1-bc78-3b7e37da8ec2`

## Function
```javascript
import { fetchDashboardMeasures } from '../services/workflowService';

const measuresData = await fetchDashboardMeasures(token);
// Returns: { eoc: [], ecds: [], aac: [], uru: [] }
```

## Data Structure
```javascript
{
  id: 'BCS-E',
  name: 'Breast Cancer Screening',
  rate: 65,              // Performance rate (%)
  goal: 65,              // Goal rate (%)
  gaps: 538,             // Gaps to goal
  actionable: true,      // Is Below Goal?
  denom: 381863,         // Total eligible
  num: 247263,           // Numerator (meeting measure)
  type: 'Screening',
  method: 'ECDS',        // Category
  gapToGoal: 0           // Gap to goal value
}
```

## Categories
- **EOC**: 11 measures (Controlling High BP, Chlamydia, etc.)
- **ECDS**: 6 measures (Breast Cancer, Colorectal, etc.)
- **AAC**: Ready for data
- **URU**: Ready for data

## Usage in Dashboard
```javascript
// Fetch measures
const [kpiData, measuresData] = await Promise.all([
  fetchDashboardKPI(token),
  fetchDashboardMeasures(token)
]);

// Get measures for current category
const currentMeasures = measures[currentDom]; // 'eoc', 'ecds', 'aac', 'uru'

// Display measures
currentMeasures.map(m => (
  <div key={m.id}>
    {m.id} - {m.name}: {m.rate}% (Goal: {m.goal}%)
  </div>
))
```

## Error Handling
```javascript
try {
  const measures = await fetchDashboardMeasures(token);
  setMeasures(measures);
} catch (err) {
  console.error('Error:', err);
  setMeasures(mockMeasures); // Fallback
}
```

## API Response Columns
1. measure_id → id
2. category → method
3. display_name → name
4. numerator → num
5. denominator → denom
6. rate → rate
7. gap_to_goal → gapToGoal
8. goal_50th → goal
9. kpi_status → actionable

## Key Points
- Fetches 20 measures across all categories
- Automatically organized by category
- Real-time data from API
- Fallback to mock data on error
- Token-based authentication required
- Parallel fetch with KPI data

## Status
✅ Fully integrated
✅ No errors
✅ Ready to use
