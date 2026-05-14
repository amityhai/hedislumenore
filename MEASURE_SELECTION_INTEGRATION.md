# Measure Selection Integration

## Overview
Integrated the MeasurePerformanceSection with MeasureDetail so that the grid/table values change based on the measure selected in the performance section above.

## How It Works

### Data Flow
```
User selects measure in MeasurePerformanceSection
    ↓
onMeasureSelect callback fires with measureId
    ↓
MeasureDetail receives measureId and updates selectedMeasureId state
    ↓
useEffect triggers with new selectedMeasureId
    ↓
Stratification data is fetched for the new measure
    ↓
Grid/table updates with new data
```

### Changes Made

#### 1. MeasurePerformanceSection.js
**Added callback prop:**
- `onMeasureSelect` - Called when user selects a different measure

**Updated event handlers:**
- Initial load: Calls `onMeasureSelect` with first measure in EOC
- Domain tab click: Calls `onMeasureSelect` with first measure in new domain
- Measure pill click: Calls `onMeasureSelect` with selected measure ID

**Updated useEffect dependency:**
- Added `onMeasureSelect` to dependency array to ensure callback is always current

#### 2. MeasureDetail.js
**Updated MeasurePerformanceSection integration:**
- Added `onMeasureSelect` callback handler
- Handler updates `selectedMeasureId` state
- Handler resets `activeTab` to 'By age' for consistency
- Existing useEffect already watches `selectedMeasureId` and fetches new data

### Existing Functionality Preserved
The component already had the infrastructure to handle measure selection:
- `selectedMeasureId` state tracks current measure
- useEffect watches `selectedMeasureId` and fetches stratification data
- Stratification data is filtered by `selectedMeasureId` in API calls
- All three stratification types (age, race, ethnicity) are fetched for new measure
- CRSP drilldown data is fetched on demand when rows are expanded

### User Experience
1. User opens MeasureDetail page
2. MeasurePerformanceSection loads with first measure (EOC domain)
3. Grid below shows stratification data for that measure
4. User clicks different domain tab → First measure in that domain is selected
5. Grid updates with new measure's data
6. User clicks different measure pill → That measure is selected
7. Grid updates with new measure's data
8. User expands rows → CRSP data is fetched for that measure
9. User clicks members → Member details are fetched for that measure

### API Calls Made
When a new measure is selected:
1. `fetchMeasureStratification(measureId, token)` - Age stratification
2. `fetchMeasureStratificationEthnicity(measureId, token)` - Ethnicity stratification
3. `fetchMeasureStratificationRace(measureId, token)` - Race stratification
4. `fetchCRSPLevelData(measureId, token)` - CRSP level data (if CRSP tab is active)

When rows are expanded:
- `fetchAgeCRSPDrilldown(measureId, token)` - Age CRSP details
- `fetchRaceCRSPDrilldown(measureId, token)` - Race CRSP details
- `fetchEthnicityCRSPDrilldown(measureId, token)` - Ethnicity CRSP details

When members are viewed:
- `fetchMemberDetails(filters, token)` - Age group members
- `fetchRaceMemberDetails(filters, token)` - Race group members
- `fetchEthnicityMemberDetails(filters, token)` - Ethnicity group members
- `fetchCRSPMemberDetails(filters, token)` - CRSP level members

### Filter Logic
All API calls include the `measureId` parameter:
```javascript
// Example: Fetching age stratification for selected measure
const ageData = await fetchMeasureStratification(selectedMeasureId, token);
```

The API filters data server-side based on measureId, ensuring only relevant data is returned.

### State Management
- `selectedMeasureId` - Current measure being viewed
- `activeTab` - Current stratification tab (By age, By race, etc.)
- `stratificationData` - Cached stratification data for current measure
- `expandedAgeGroups`, `expandedRaceGroups`, `expandedEthnicityGroups` - Track which rows are expanded
- `ageCRSPData`, `raceCRSPData`, `ethnicityCRSPData` - Cached CRSP drilldown data

### Performance Considerations
- Stratification data is fetched only for the active tab (lazy loading)
- CRSP drilldown data is fetched only when rows are expanded (lazy loading)
- Member data is fetched only when requested (lazy loading)
- Data is cached in state to avoid refetching when switching tabs

### Testing Recommendations
1. Select different measures and verify grid updates
2. Switch between domains and verify first measure is selected
3. Expand rows and verify CRSP data is for correct measure
4. View members and verify they're for correct measure
5. Switch tabs and verify data is correct for each tab
6. Verify no errors in console when switching measures
