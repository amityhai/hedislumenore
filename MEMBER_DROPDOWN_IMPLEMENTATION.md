# Member Dropdown Implementation

## Overview
Members are now displayed as scrollable dropdowns directly under CRSP rows in the MeasureDetail page for both Age and Race stratifications. All members are shown in a scrollable container with 5-6 members visible at a time. No "View All Members" button - all members are accessible via scrolling.

## Supported Stratifications

### Age Stratification
- Uses `fetchMemberDetails()` function
- Workflow ID: `fc465731-380b-11f1-bbd1-0fac4df3fbb8`
- Filter: `ageStrat` (e.g., "18-64", "65+")

### Race Stratification
- Uses `fetchRaceMemberDetails()` function
- Workflow ID: `bb5e52d6-380c-11f1-bbd1-03e2e173ad9d`
- Filter: `raceStrat` (e.g., "White", "Asian", "Other")

### Ethnicity Stratification
- Uses `fetchMemberDetails()` function (same as age)
- Workflow ID: `fc465731-380b-11f1-bbd1-0fac4df3fbb8`
- Filter: `ageStrat` (reused for ethnicity)

## User Journey

1. **Select Measure**: Click on a measure pill in Measure Performance
2. **View Stratification**: See "By Age/Race/Ethnicity" tab with stratification groups
3. **Expand Stratification Group**: Click expand arrow to see CRSP breakdown
4. **Expand CRSP Row**: Click on a CRSP row to expand and show scrollable member list
5. **Scroll Members**: Scroll through all members in the dropdown (5-6 visible at a time)

## Component Structure

### MeasureDetail.js
- Main component with member dropdown functionality
- State management:
  - `expandedCRSPRows`: Tracks which CRSP rows are expanded
  - `membersByKey`: Caches loaded member data by key (stratType-group-crsp)
  - `loadingMembers`: Tracks loading state for each CRSP row
- Functions:
  - `handleCRSPClick()`: Loads members and toggles CRSP row expansion
  - `handleViewAllMembers()`: Navigates to Care Action Center with filters

## Member Dropdown Display

### Initial State
- CRSP row shows expand arrow (▶)
- Clicking CRSP row loads all members

### Expanded State
- CRSP row shows collapse arrow (▼)
- Shows all member records in a scrollable container
- 5-6 members visible at a time
- Smooth scrolling with custom scrollbar
- Member columns:
  - Member ID
  - Member Name
  - Age
  - Gender
  - Numerator
  - Denominator

### Loading State
- Shows "Loading members..." message while fetching data

### Empty State
- Shows "No members found" if no members match filters

## Scrollable Container

### Dimensions
- Max height: 280px (approximately 5-6 rows)
- Overflow: Auto scroll on Y-axis
- Custom scrollbar styling

### Styling
- Background: #f5f5f5
- Member rows: 8px blue left border
- Font size: 12px
- Hover effect on member rows
- Smooth scrollbar with hover effects

## Filter Context Preservation

When clicking "View All Members", the following filters are passed to Care Action Center:
```javascript
{
  measureId: selectedMeasureId,
  ageStrat: ageGroup,
  crsp: crspName
}
```

## Styling

### Member Rows
- Background: #f5f5f5
- Left border: 8px solid #0066cc (blue)
- Font size: 12px
- Indented 60px from left
- Hover effect: Light gray background (#efefef)

### Scrollbar
- Width: 6px
- Track: Light gray (#f1f1f1)
- Thumb: Dark gray (#888)
- Thumb hover: Darker gray (#555)
- Border radius: 3px

## API Integration

### Age-based Member Details
- **Workflow ID**: `fc465731-380b-11f1-bbd1-0fac4df3fbb8`
- **Function**: `fetchMemberDetails(filters, token)`
- **Filters**:
  - `measureId`: Selected measure
  - `ageStrat`: Selected age category
  - `crsp`: Selected CRSP organization

### Race-based Member Details
- **Workflow ID**: `bb5e52d6-380c-11f1-bbd1-03e2e173ad9d`
- **Function**: `fetchRaceMemberDetails(filters, token)`
- **Filters**:
  - `measureId`: Selected measure
  - `raceStrat`: Selected race category
  - `crsp`: Selected CRSP organization

### Response Format
Both endpoints return member records with:
- `member_id`: Member ID
- `member_name`: Member name
- `measure_id`: Measure ID
- `age_strat` or `race_strat`: Stratification category
- `crsp`: CRSP organization name

## Performance Considerations

- Members are loaded on-demand when CRSP row is clicked
- Loaded members are cached in `membersByKey` to avoid re-fetching
- All members are displayed in scrollable container
- Scrolling is smooth with custom scrollbar styling
- Max height of 280px shows approximately 5-6 members at a time

## Files Modified

- `src/components/MeasureDetail.js` - Updated to handle race member details
- `src/services/workflowService.js` - Added `fetchRaceMemberDetails()` function and race workflow ID

## New Functions Added

### fetchRaceMemberDetails(filters, token)
- Fetches member details for race stratification
- Uses race-specific workflow ID
- Filters by `raceStrat` instead of `ageStrat`
- Returns array of member objects with race information

### Updated handleCRSPClick()
- Now handles age, race, and ethnicity stratifications
- Routes to appropriate fetch function based on `stratType`
- Supports both age and race member detail workflows

## Future Enhancements

1. **Member Click Action**: Add ability to click member row for individual member details
2. **Sorting**: Make member columns sortable
3. **Search**: Add search/filter within member dropdown
4. **Export**: Add export to CSV/Excel for displayed members
5. **Customizable Height**: Allow users to adjust scrollable container height
6. **Virtual Scrolling**: Implement virtual scrolling for very large member lists (1000+)
