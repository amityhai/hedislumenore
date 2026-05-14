# QualityPulse App - Complete Context & Architecture

## 📋 Project Overview
**QualityPulse** is a React-based healthcare quality management dashboard for HEDIS (Healthcare Effectiveness Data and Information Set) measures. It's built for the Behavioral Health organization to track, analyze, and improve quality metrics across multiple dimensions (age, race, ethnicity, CRSP providers).

**Tech Stack:**
- React 19.2.4
- Vanilla CSS (no UI framework)
- Lumenore Workflow API (backend)
- Session Storage for token management

---

## 🏗️ App Architecture

### Main Entry Point: `App.js`
- **Role:** Main router and state manager
- **Key Features:**
  - Multi-page navigation (Dashboard, Measure Detail, Care Action Center, Rate Simulator, Provider Scores)
  - Token management and auto-refresh (15-minute expiry, auto-refresh every 14 minutes)
  - Sidebar navigation with user profile
  - Passes `token` and `onNavigate` to all pages

### Pages/Components:

#### 1. **Dashboard** (`Dashboard.js`)
- **Purpose:** Executive overview of all quality measures
- **Key Sections:**
  - **KPI Cards (4 cards):** Above Goal, At Goal, Below Goal, Gaps Closed (MTD)
    - Compact design (60px height max)
    - Dark green bottom border
    - Clickable to filter measure table
    - Toggle behavior: click same card again to close table
  - **Measure Health Matrix (Table):**
    - Shows all measures or filtered by KPI status
    - Columns: Measure ID, Name, Numerator, Denominator, Rate, Goal, Status, Action
    - "Deep Dive →" button (dark green bg, white text) to navigate to measure detail
    - Pagination (6 rows per page)
    - Only visible when KPI card is clicked
    - Shows filter indicator at top
  - **Chart Section:** Measures Meeting Target (monthly trend)
  - **Insights Section (3 cards):** Lowest Performing Measures, CRSPs Needing Attention, Equity Alerts

#### 2. **Measure Detail** (`MeasureDetail.js`)
- **Purpose:** Deep dive into a specific measure with stratification
- **Key Features:**
  - Measure Performance Section (mini chart with trend data)
  - Stratification by Age, Race, Ethnicity
  - Summary cards for each group
  - Expandable tables showing CRSP-level data
  - Member details drilldown
  - CRSP Level table

#### 3. **Measure Performance Section** (`MeasurePerformanceSection.js`)
- **Purpose:** Reusable component for measure selection and mini chart
- **Features:**
  - DOM tabs (EOC, ECDS, AAC, URU)
  - Measure pills (clickable to select)
  - Mini chart showing rate trends by month
  - KPI metrics (Numerator, Denominator, Non-Compliant, Rate, Goal, Gap to Goal)

#### 4. **Care Action Center** (`CareActionCenter.js`)
- **Purpose:** Action items and care coordination
- **Status:** Placeholder component

#### 5. **Rate Simulator** (`RateSimulator.js`)
- **Purpose:** Simulate rate changes
- **Status:** Placeholder component

#### 6. **Provider Scores** (`ProviderScores.js`)
- **Purpose:** Provider/CRSP performance scores
- **Status:** Placeholder component

---

## 🔌 Services

### `workflowService.js`
**Purpose:** Centralized API communication with Lumenore workflow endpoints

**Key Workflow IDs:**
```javascript
DASHBOARD_KPI: '28d510c9-3284-11f1-bc78-afc84e14c8e9'
DASHBOARD_MEASURES: '0a483e41-3282-11f1-bc78-3b7e37da8ec2'
ALL_MEASURES_GRID: 'adfade0d-3701-11f1-bbd1-4b51cdcc5eeb'
MEASURE_STRATIFICATION_AGE: 'b0a05c44-3283-11f1-bc78-d11c052590ae'
MEASURE_STRATIFICATION_RACE: 'd54528a5-3283-11f1-bc78-81585c103e4d'
MEASURE_STRATIFICATION_ETHNICITY: 'f8b3e606-3283-11f1-bc78-8777b53d8488'
MINI_CHART_MEASURE_TREND: 'ec62d64e-3c95-11f1-bbd1-bdc0a4f0d4d3'
CRSP_LEVEL: '3fc1ac55-3729-11f1-bbd1-e38b1acb336a'
```

**Key Functions:**
- `fetchDashboardKPI(token)` - Get KPI data (Above Goal, At Goal, Below Goal counts)
- `fetchAllMeasuresGrid(token)` - Get all measures for the grid
- `fetchChartMeasuresMeetingTarget(token)` - Get monthly trend data
- `fetchMeasureStratification(measureId, token)` - Get age stratification
- `fetchMeasureStratificationRace(measureId, token)` - Get race stratification
- `fetchMeasureStratificationEthnicity(measureId, token)` - Get ethnicity stratification
- `fetchMiniChartData(measureId, token)` - Get measure trend by month
- `fetchCRSPLevelData(measureId, token)` - Get CRSP-level data

**API Details:**
- Base URL: `https://dwihn-uat.lumenore.com/appsapi/appbuilder/workflow`
- App ID: `4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d`
- Method: POST with FormData
- Response format: `{ status: { code, value }, data: { data: { resultSet, metaData } } }`

### `tokenService.js`
**Purpose:** Manage JWT token lifecycle

**Key Functions:**
- `setToken(token, expiryMinutes)` - Store token in session storage
- `getToken()` - Retrieve valid token
- `isTokenValid()` - Check if token exists and not expired
- `refreshToken(expiryMinutes)` - Update token expiry
- `setupTokenRefreshInterval(minutes)` - Auto-refresh token every N minutes

**Token Details:**
- Storage: Session Storage (cleared on browser close)
- Default Expiry: 15 minutes
- Auto-refresh: Every 14 minutes
- Contains: JWT with tenant, user, and session info

---

## 📊 Data Flow

### Dashboard Load Flow:
1. App initializes with default token
2. Dashboard component mounts
3. `fetchDashboardData()` called with token
4. Parallel API calls:
   - `fetchDashboardKPI()` → KPI card data
   - `fetchChartMeasuresMeetingTarget()` → Chart data
   - `fetchAllMeasuresGrid()` → All measures
5. Data stored in state
6. Components render with data

### KPI Card Click Flow:
1. User clicks KPI card (e.g., "Above Goal")
2. `setStatusFilter('Above Goal')` + `setTableVisible(true)`
3. Table filters to show only measures with `kpi_status === 'Above Goal'`
4. Table scrolls into view
5. Filter indicator shows at top of table
6. Click same card again → `setTableVisible(false)` → table closes

### Measure Selection Flow:
1. User clicks "Deep Dive →" button in table
2. `onNavigate('detail', measureId)` called
3. App navigates to MeasureDetail page
4. MeasureDetail fetches stratification data for that measure
5. Shows age/race/ethnicity cards and tables

---

## 🎨 Design System

### Colors:
- **Primary Green:** #0f7a5a (dark green, used for active states, buttons)
- **Light Green:** #16a34a (above goal)
- **Blue:** #2563eb (at goal)
- **Red:** #dc2626 (below goal)
- **Teal:** #0f7a5a (gaps closed)
- **Background:** #f8faf9 (light gray)
- **Text:** #1a1a18 (dark gray)
- **Muted:** #6b7280 (medium gray)

### Typography:
- **Headers:** 32px (h1), 18px (h3)
- **KPI Values:** 26px bold
- **Labels:** 10-11px uppercase
- **Body:** 13-14px

### Spacing:
- **KPI Cards:** 8px padding, 2px gap, 60px max height
- **Grid Gap:** 16px
- **Section Margin:** 28px bottom

### Components:
- **KPI Cards:** Compact, 4 in one row, bottom border accent
- **Buttons:** Rounded (999px), dark green bg, white text
- **Tables:** Lightweight, subtle borders, alternating row colors
- **Progress Bars:** Thin (3px), colored by status

---

## 🔄 State Management

### Dashboard State:
```javascript
const [kpis, setKpis] = useState([])                    // KPI data
const [chartData, setChartData] = useState([])          // Chart trend data
const [measuresGrid, setMeasuresGrid] = useState([])    // All measures
const [currentMatrixPage, setCurrentMatrixPage] = useState(1)  // Pagination
const [loading, setLoading] = useState(true)            // Loading state
const [statusFilter, setStatusFilter] = useState('All') // Active filter
const [tableVisible, setTableVisible] = useState(false) // Table visibility
```

### MeasureDetail State:
```javascript
const [measure, setMeasure] = useState(null)
const [stratificationData, setStratificationData] = useState({})
const [selectedAgeGroup, setSelectedAgeGroup] = useState(null)
const [selectedRaceGroup, setSelectedRaceGroup] = useState(null)
const [selectedEthnicityGroup, setSelectedEthnicityGroup] = useState(null)
// ... more states for expanded groups, member details, etc.
```

---

## 📱 Responsive Design

### Breakpoints:
- **Desktop:** Full layout (4 KPI cards in one row)
- **Tablet (≤768px):** 2 KPI cards per row, adjusted spacing
- **Mobile:** Single column layout

---

## 🚀 Key Features Implemented

✅ **Dashboard:**
- 4 KPI cards with status indicators
- Clickable KPI cards to filter measure table
- Toggle behavior (click again to close)
- Filter indicator showing active filter
- Measure grid with pagination
- "Deep Dive →" button for detailed view
- Chart showing monthly trends
- Insights cards (lowest performing, CRSPs, equity alerts)

✅ **Measure Detail:**
- Measure performance section with mini chart
- Age/Race/Ethnicity stratification
- Summary cards for each group
- Expandable tables with CRSP data
- Member details drilldown
- CRSP level table

✅ **Token Management:**
- Auto-refresh every 14 minutes
- 15-minute expiry
- Session storage persistence
- Fallback to default token

✅ **API Integration:**
- Centralized workflow service
- Parallel API calls
- Error handling with fallback data
- Response transformation

---

## 🔧 Recent Changes (Current Session)

1. **KPI Card Redesign:**
   - Reduced height to 60px max
   - Moved border from top to bottom
   - Removed progress bars
   - Compact padding (8px 12px)
   - Reduced gaps (2px)

2. **Dashboard Reorganization:**
   - Moved measure grid right after KPI cards
   - Removed category tabs and status filter UI
   - Added filter visibility toggle
   - Added filter indicator header

3. **Table Filtering:**
   - KPI cards now filter table by status
   - Toggle behavior: click same card to close
   - Filter indicator shows active filter
   - Pagination resets on filter change

4. **Button Styling:**
   - Changed "View Details" to "Deep Dive →"
   - Dark green background (#0f7a5a)
   - White text
   - Rounded pill style

---

## 📝 Notes for Future Development

- **Placeholder Components:** Care Action Center, Rate Simulator, Provider Scores need implementation
- **Workflow IDs:** Some workflow IDs marked as "To be updated" (MEASURE_DETAIL, CARE_ACTION, RATE_SIMULATOR, PROVIDER_SCORES)
- **Error Handling:** Fallback mock data used when API fails
- **Performance:** Consider memoization for large tables
- **Accessibility:** Add ARIA labels and keyboard navigation
- **Testing:** Unit tests for components and services needed

---

## 🎯 Current Focus Areas

1. **Dashboard KPI Cards:** ✅ Complete (compact, filterable, toggle behavior)
2. **Measure Grid:** ✅ Complete (filtered, paginated, with Deep Dive button)
3. **Measure Detail:** ✅ Complete (stratification, cards, tables)
4. **Mini Chart:** ✅ Complete (trend visualization)
5. **Token Management:** ✅ Complete (auto-refresh, session storage)

---

## 📞 Key Contacts & Resources

- **API Base:** https://dwihn-uat.lumenore.com/appsapi/appbuilder/workflow
- **App ID:** 4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d
- **Organization:** Behavioral Health (DWIHN)
- **User Role:** Quality Director (Jennifer Martin)
