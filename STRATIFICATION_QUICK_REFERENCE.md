# Stratification Workflow - Quick Reference

## Workflow ID
`b0a05c44-3283-11f1-bc78-d11c052590ae`

## Function
```javascript
import { fetchMeasureStratification } from '../services/workflowService';

const stratData = await fetchMeasureStratification(token);
// Returns: { 'BCS-E': { age: [...] }, 'CBP': { age: [...] }, ... }
```

## Data Structure
```javascript
{
  'BCS-E': {
    age: [
      {
        group: '0-17',        // Age group
        rate: 65,             // Performance rate (%)
        denom: 133170,        // Total eligible
        nonCompliant: 46550   // Not meeting measure
      },
      {
        group: '18-64',
        rate: 64,
        denom: 120800,
        nonCompliant: 43488
      },
      {
        group: '65+',
        rate: 65,
        denom: 127893,
        nonCompliant: 44762
      }
    ]
  },
  'CBP': { age: [...] },
  // ... more measures
}
```

## Age Groups
- **0-17**: Children and young adults
- **18-64**: Working age adults
- **65+**: Seniors

## Measures with Stratification
All 20 measures have age stratification:
- ADD-E_CONT, ADD-E_INIT, BCS-E, CBP, CCS-E, CHL, COL-E, EED
- FUA_30, FUA_7, FUH_30, FUH_7, FUM_30, FUM_7, GSD
- IET_ENG, IET_INIT, POD, SAA, WCC

## Usage in Dashboard
```javascript
// Fetch stratification
const stratData = await fetchMeasureStratification(token);
setStratificationData(stratData);

// Get stratification for selected measure
const measureStrat = stratificationData[selectedMeasure];

// Display age groups
measureStrat?.age.map(item => (
  <div key={item.group}>
    {item.group}: {item.rate}% ({item.nonCompliant} non-compliant)
  </div>
))
```

## Error Handling
```javascript
try {
  const strat = await fetchMeasureStratification(token);
  setStratificationData(strat);
} catch (err) {
  console.error('Error:', err);
  setStratificationData(mockStratData); // Fallback
}
```

## API Response Columns
1. measure_id → measure key
2. age_strat → group
3. numerator → used to calculate nonCompliant
4. denominator → denom
5. rate → rate

## Key Points
- Fetches 60 rows (20 measures × 3 age groups)
- Automatically organized by measure
- Real-time data from API
- Fallback to mock data on error
- Token-based authentication required
- Parallel fetch with KPI and Measures data

## Status
✅ Fully integrated
✅ No errors
✅ Ready to use
