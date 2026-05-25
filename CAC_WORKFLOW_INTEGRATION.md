# Care Action Center Workflow Integration

## Overview
Successfully integrated the Care Action Center (CAC) grid with workflow data from the Lumenore API. The grid now displays member information (ID, name, measure, and CRSP) with an action modal for each row.

## Changes Made

### 1. Workflow Service (`src/services/workflowService.js`)

#### Added Workflow ID
- **CAC_GRID**: `105691ee-582c-11f1-9e64-33f111c58511`
  - Fetches member_id, member_name, measure_id, and crsp columns
  - Returns up to 21,292 rows of data

#### New Function: `fetchCACGridData`
```javascript
export const fetchCACGridData = async (filters = {}, token) => {
  // Fetches CAC grid data with optional filters
  // Parameters: measureId, crsp, status, assignedStaff
  // Returns: { queryInfo, metaData, resultSet }
}
```

### 2. Care Action Center Component (`src/components/CareActionCenter.js`)

#### State Management
- Added `gridData` state to store workflow results
- Added `loadingGrid` state for loading indicator
- Added `error` state for error handling

#### Data Loading
- Integrated `fetchCACGridData` function
- Filters support:
  - Measure ID filter
  - CRSP filter
  - Reactive updates when filters change

#### Grid Display
- Simplified table to show 5 columns:
  1. Member ID (row[0])
  2. Member Name (row[1])
  3. Measure (row[2])
  4. CRSP (row[3])
  5. Action button

#### Modal Integration
- "View Details" button opens modal with member information
- Modal displays:
  - Member name and ID
  - Measure and CRSP
  - Action type dropdown
  - Notes textarea
  - Save/Cancel buttons

## API Response Format

The workflow returns data in this structure:
```json
{
  "queryInfo": {
    "totalRows": 21292,
    "type": "selected"
  },
  "metaData": [
    { "colIndex": 0, "colName": "member_id", "colType": "Integer" },
    { "colIndex": 1, "colName": "member_name", "colType": "Varchar" },
    { "colIndex": 2, "colName": "measure_id", "colType": "Varchar" },
    { "colIndex": 3, "colName": "crsp", "colType": "Varchar" }
  ],
  "resultSet": [
    [1350796, "Davis, Curtisha", "FUM_30", "TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE"],
    [1576144, "Cole, Lucy", "FUM_30", "NO CRSP"],
    ...
  ]
}
```

## Features

### Filtering
- **Measure Filter**: Filter grid by selected measure
- **CRSP Filter**: Filter grid by selected CRSP group
- Filters work together (AND logic)
- Real-time updates when filters change

### Loading States
- Loading indicator while fetching data
- Empty state message when no data available
- Error handling with console logging

### Modal Actions
- View member details
- Select action type (Schedule Follow-up, Assign Care Coordinator, Send Outreach)
- Add notes
- Save or cancel

## Usage

1. Component loads measures and CRSPs on mount
2. User selects filters (optional)
3. Grid displays filtered member data
4. User clicks "View Details" to open modal
5. User selects action type and adds notes
6. User clicks "Save Action" to complete

## Future Enhancements

- Add pagination for large datasets (21,292 rows)
- Add sorting by column
- Add status filter integration
- Add assigned staff filter integration
- Add export functionality
- Add bulk actions
- Connect modal save to backend API
