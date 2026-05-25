# Care Action Center Integration Flow

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  CareActionCenter Component                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  State:                                                      │
│  ├─ gridData: []              (workflow results)            │
│  ├─ loadingGrid: boolean      (loading state)               │
│  ├─ selectedMeasure: string   (filter)                      │
│  ├─ selectedCrsp: string      (filter)                      │
│  └─ selectedAction: object    (modal data)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ KPI Cards (4 cards)                                  │   │
│  │ - Total non-compliant: 8234                          │   │
│  │ - Unassigned: 2392                                   │   │
│  │ - Actionable now: 5842                               │   │
│  │ - Expiring this week: 127                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Filters                                              │   │
│  │ ├─ Measure Dropdown (from fetchCACMeasures)         │   │
│  │ ├─ Status Dropdown (All Status, Actionable, Expired)│   │
│  │ ├─ CRSP Dropdown (from fetchCACCRSPs)               │   │
│  │ └─ Assigned Staff Dropdown                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Grid Table (5 columns)                               │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ Member ID │ Name │ Measure │ CRSP │ Action    │   │   │
│  │ ├────────────────────────────────────────────────┤   │   │
│  │ │ 1350796   │ Davis, Curtisha │ FUM_30 │ TEAM... │   │   │
│  │ │ 1576144   │ Cole, Lucy      │ FUM_30 │ NO CRSP │   │   │
│  │ │ 1328308   │ Gibney, Brian   │ AAP    │ NO CRSP │   │   │
│  │ │ ...       │ ...             │ ...    │ ...     │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  │ Each row has \"View Details\" button                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Modal (when selectedAction is set)                   │   │
│  │ ┌────────────────────────────────────────────────┐   │   │
│  │ │ Member Details: Davis, Curtisha               │   │   │
│  │ ├────────────────────────────────────────────────┤   │   │
│  │ │ Member: Davis, Curtisha · ID: 1350796         │   │   │
│  │ │ Measure: FUM_30                                │   │   │
│  │ │ CRSP: TEAM MENTAL HEALTH SERVICES, INC        │   │   │
│  │ │                                                │   │   │
│  │ │ Action Type: [Schedule Follow-up ▼]           │   │   │
│  │ │ Notes: [textarea]                              │   │   │
│  │ │                                                │   │   │
│  │ │ [Cancel] [Save Action]                         │   │   │
│  │ └────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Component Mount                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌──────────┐
   │ Fetch   │  │ Fetch   │  │ Fetch    │
   │ Measures│  │ CRSPs   │  │ Grid Data│
   └────┬────┘  └────┬────┘  └────┬─────┘
        │            │            │
        ▼            ▼            ▼
   ┌─────────────────────────────────────┐
   │ workflowService.js                  │
   │ ├─ fetchCACMeasures()               │
   │ ├─ fetchCACCRSPs()                  │
   │ └─ fetchCACGridData()               │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Lumenore API                        │
   │ POST /appsapi/appbuilder/workflow   │
   │                                     │
   │ Workflow IDs:                       │
   │ ├─ CAC_MEASURES                     │
   │ ├─ CAC_CRSPS                        │
   │ └─ CAC_GRID (105691ee-582c...)      │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Response Data                       │
   │ ├─ measures: []                     │
   │ ├─ crsps: []                        │
   │ └─ gridData: {                      │
   │     queryInfo: {...},               │
   │     metaData: [...],                │
   │     resultSet: [                    │
   │       [1350796, \"Davis...\", ...],  │
   │       [1576144, \"Cole...\", ...],   │
   │       ...                           │
   │     ]                               │
   │   }                                 │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Update Component State              │
   │ ├─ setMeasures(data)                │
   │ ├─ setCrsps(data)                   │
   │ └─ setGridData(data.resultSet)      │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────┐
   │ Render Grid with Data               │
   │ gridData.map(row => <tr>...)        │
   └─────────────────────────────────────┘
```

## Filter Flow

```
User selects Measure
        │
        ▼
setSelectedMeasure(value)
        │
        ▼
useEffect dependency: [selectedMeasure]
        │
        ▼
loadGridData() called with filters:
{
  measureId: selectedMeasure,
  crsp: selectedCrsp
}
        │
        ▼
fetchCACGridData(filters, token)
        │
        ▼
API call with filters
        │
        ▼
Filtered resultSet returned
        │
        ▼
setGridData(resultSet)
        │
        ▼
Grid re-renders with filtered data
```

## Modal Flow

```
User clicks \"View Details\" button
        │
        ▼
onClick handler triggered
        │
        ▼
setSelectedAction({
  memberId: row[0],
  name: row[1],
  measure: row[2],
  crsp: row[3]
})
        │
        ▼
Modal renders with selectedAction data
        │
        ▼
User selects action type and adds notes
        │
        ▼
User clicks \"Save Action\"
        │
        ▼
setSelectedAction(null) - closes modal
        │
        ▼
(Future: Send data to backend API)
```

## File Structure

```
src/
├── components/
│   ├── CareActionCenter.js          ← Main component
│   ├── CareActionCenter.css         ← Styling
│   ├── CustomSelect.js              ← Filter dropdowns
│   └── ...
├── services/
│   ├── workflowService.js           ← API calls
│   │   ├── fetchCACMeasures()
│   │   ├── fetchCACCRSPs()
│   │   └── fetchCACGridData()       ← NEW
│   └── tokenService.js
└── ...
```

## Key Integration Points

1. **Workflow Service** - Handles all API communication
2. **CareActionCenter Component** - Manages UI and state
3. **CustomSelect Component** - Provides filter dropdowns
4. **Modal** - Displays member details and action form

## Data Transformation

```
API Response resultSet:
[
  [1350796, "Davis, Curtisha", "FUM_30", "TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE"],
  [1576144, "Cole, Lucy", "FUM_30", "NO CRSP"],
  ...
]
        │
        ▼
Component State (gridData):
[
  [1350796, "Davis, Curtisha", "FUM_30", "TEAM MENTAL HEALTH SERVICES, INC - MAIN OFFICE"],
  [1576144, "Cole, Lucy", "FUM_30", "NO CRSP"],
  ...
]
        │
        ▼
Table Rendering:
gridData.map((row, idx) => (
  <tr key={idx}>
    <td>{row[0]}</td>  ← Member ID
    <td>{row[1]}</td>  ← Member Name
    <td>{row[2]}</td>  ← Measure
    <td>{row[3]}</td>  ← CRSP
    <td><button>View Details</button></td>
  </tr>
))
```
