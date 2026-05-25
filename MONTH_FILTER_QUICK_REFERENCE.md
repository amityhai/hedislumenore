# Month Filter - Quick Reference

## What Was Added

✅ **New Component**: `MonthFilter.js` - Reusable month filter dropdown
✅ **New Styling**: `MonthFilter.css` - Styled to match design system
✅ **Dashboard Integration**: Month filter added below header
✅ **MeasureDetail Integration**: Month filter added below back button

## Component Locations

### Dashboard (Home Page)
- **File**: `src/components/Dashboard.js`
- **Location**: Below dashboard header, above KPI cards
- **State**: `selectedMonth` (empty string = all months)

### Measure Detail Page
- **File**: `src/components/MeasureDetail.js`
- **Location**: Below back button, above measure performance section
- **State**: `selectedMonth` (empty string = all months)

## How to Use the Month Filter

### Current State
The month filter is **UI-only** - it displays and allows selection but doesn't yet filter data.

### To Connect to API Calls

1. **In Dashboard.js** - Update `fetchDashboardData()`:
```javascript
const fetchDashboardData = async () => {
  try {
    setLoading(true);
    
    // Add selectedMonth to filters
    const filters = {
      ...(selectedMonth && { month: selectedMonth })
    };
    
    const [kpiData, chartDataResult, ...] = await Promise.all([
      fetchDashboardKPI(filters, token),
      fetchChartMeasuresMeetingTarget(filters, token),
      // ... other calls
    ]);
    // ...
  }
};
```

2. **In MeasureDetail.js** - Update `fetchMeasureDetailData()`:
```javascript
const fetchMeasureDetailData = async () => {
  try {
    setLoading(true);
    
    // Add selectedMonth to filters
    const filters = {
      ...(selectedMonth && { month: selectedMonth })
    };
    
    const [ageData, ethnicityData, ...] = await Promise.all([
      fetchMeasureStratification(selectedMeasureId, filters, token),
      // ... other calls
    ]);
    // ...
  }
};
```

3. **Add to useEffect dependencies**:
```javascript
useEffect(() => {
  if (token) {
    fetchDashboardData();
  }
}, [token, selectedMonth]); // Add selectedMonth here
```

## Month Format

- **Display**: "Mon-YYYY" (e.g., "Jan-2026", "Feb-2026")
- **Value**: "YYYY-MM" (e.g., "2026-01", "2026-02")
- **Empty**: "" (means "All Months")

## Styling

The month filter uses the existing design system:
- **Primary Color**: #0f7a5a (teal)
- **Background**: #f5f3f0 (light)
- **Border**: #e8e6e1 (subtle)
- **Text**: #333 (dark)

## Features

✅ Displays last 12 months
✅ "All Months" option for no filtering
✅ Responsive dropdown
✅ Hover and focus states
✅ Consistent with existing UI
✅ Reusable component

## Testing

To verify the month filter is working:

1. Navigate to Dashboard - should see month filter below header
2. Navigate to a Measure Detail page - should see month filter below back button
3. Click dropdown - should show last 12 months
4. Select a month - state should update (check React DevTools)
5. Select "All Months" - should clear selection

## Files Modified

- `src/components/Dashboard.js` - Added import, state, and component
- `src/components/MeasureDetail.js` - Added import, state, and component

## Files Created

- `src/components/MonthFilter.js` - New component
- `src/components/MonthFilter.css` - New styling
