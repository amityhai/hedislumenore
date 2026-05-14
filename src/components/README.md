# QualityPulse Components

This directory contains 5 separate React components extracted from the original HTML file, each with its own CSS styling.

## Components Overview

### 1. Dashboard (`Dashboard.js` + `Dashboard.css`)
The main landing page showing:
- KPI cards (Above goal, At goal, Below benchmark, Gaps closed)
- Lowest performing measures
- Performance by product line (Medicaid, Commercial, Medicare)
- Measure performance pills with filtering

**Key Features:**
- Real-time performance snapshot
- Equity alerts
- Measure quick view with tabs (EOC, ECDS, AAC, URU)

### 2. Measure Detail (`MeasureDetail.js` + `MeasureDetail.css`)
Detailed view for individual measures showing:
- Measure metadata (name, description, actionable status)
- Calculation flow (Init Pop → Exclusions → Denominator → Numerator → Rate)
- Stratification by age, race, ethnicity
- AI insights for each measure
- Member-level details with expandable rows

**Key Features:**
- Multiple detail tabs (By age, By race, By ethnicity, Episodes, etc.)
- Equity disparity tracking
- Member drill-down capability

### 3. Care Action Center (`CareActionCenter.js` + `CareActionCenter.css`)
Action-oriented interface for managing care gaps:
- KPI cards (Total non-compliant, Unassigned, Actionable now, Expiring)
- Filterable table of member actions
- Status tracking (Urgent, Actionable, Expired)
- Modal for scheduling follow-ups and assigning interventions

**Key Features:**
- Priority-based action management
- Days-left countdown
- Assignment tracking
- Modal workflows for different action types

### 4. Rate Simulator (`RateSimulator.js` + `RateSimulator.css`)
Scenario modeling tool with two tabs:

**Single Measure Tab:**
- Measure selection dropdown
- Interactive slider to model gap closures
- Real-time rate projection
- Gap-to-goal calculation
- Insight line showing effort needed

**Cross-Measure Tab:**
- Comparison table of all measures
- Effort level classification (EASY, MODERATE, HARD, LIMITED)
- Multi-measure combination analysis
- Estimated unique member impact

**Key Features:**
- Visual feedback on rate changes
- Color-coded effort levels
- Checkbox-based measure combination planning

### 5. Provider Scores (`ProviderScores.js` + `ProviderScores.css`)
Provider group and clinician performance view:
- CRSP (Clinically Responsible Service Provider) group cards
- Expandable provider details
- Individual clinician rates for key measures
- Gap tracking by provider group

**Key Features:**
- Collapsible provider group details
- Color-coded performance rates
- Panel size and provider count display
- Specialty-based organization

## Component Structure

Each component follows this pattern:
```
ComponentName.js       - React component with state management
ComponentName.css      - Scoped styling for the component
```

## Styling System

All components use a consistent design system with CSS variables:
- **Colors:** Teal (#0f6e56), Red (#a32d2d), Green (#27500a), Amber (#854f0b), Blue (#185fa5)
- **Spacing:** 8px, 12px, 14px, 16px, 18px, 24px increments
- **Border Radius:** 6px, 8px, 10px, 12px
- **Typography:** 10px-20px font sizes with 500-700 weights

## Integration

All components are integrated in `App.js` with:
- Navigation between tabs via sidebar
- State management for current page and selected measure
- Back button functionality
- Breadcrumb navigation

## Usage

```jsx
import Dashboard from './components/Dashboard';
import MeasureDetail from './components/MeasureDetail';
import CareActionCenter from './components/CareActionCenter';
import RateSimulator from './components/RateSimulator';
import ProviderScores from './components/ProviderScores';
```

Each component accepts props for navigation and data passing:
- `onNavigate(page, measure)` - Navigate to different pages
- `onBack()` - Return to dashboard
- `measureId` - Selected measure for detail view

## Data Structure

Components use mock data structures:
- **Measures:** Array of measure objects with rate, goal, gaps, denom, num
- **Actions:** Array of member action items with status and assignment
- **CRSPs:** Provider group data with individual clinician rates
- **Stratification Data:** Age, race, ethnicity breakdowns with disparities

## Future Enhancements

- Connect to real API endpoints
- Add data export functionality
- Implement real-time updates
- Add user preferences/settings
- Enhance accessibility features
- Add print-friendly views
