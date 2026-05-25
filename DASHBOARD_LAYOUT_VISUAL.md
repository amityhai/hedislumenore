# Dashboard Layout - Visual Reference

## Current Layout (After Update)

```
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║  Quality Management Command Center          Select Month: [Feb-2026 ▼]   ║
║  Real-time performance snapshot, trends,                                  ║
║  and equity alerts. Data as of: March 30, 2026                            ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

┌────────────────┬────────────────┬────────────────┬────────────────┐
│  Above Goal    │   At Goal      │  Below Goal    │ Gaps Closed    │
│      35        │       7        │      46        │      19        │
│    / 88        │     / 88       │  need attention│    +18% vs Feb  │
│ +5 vs MY 2025  │ Stable vs MY   │ 7 critical,    │                │
│                │    2025        │ 39 below target│                │
└────────────────┴────────────────┴────────────────┴────────────────┘

[Measure Health Matrix Section]

[Chart Section - Measures Meeting Target]

[Three Column Grid - Insights]
```

## Component Structure

```
dashboard-container
├── dashboard-header-with-filter (flex container)
│   ├── dashboard-header (flex: 1)
│   │   ├── h1 (title)
│   │   └── p (subtitle)
│   └── month-filter-container (flex-shrink: 0)
│       ├── label
│       └── select
├── kpi-grid
│   ├── kpi-card (green)
│   ├── kpi-card (blue)
│   ├── kpi-card (red)
│   └── kpi-card (teal)
├── measure-health-matrix-section
├── chart-card-modern
└── three-col-grid
```

## Spacing & Alignment

```
┌─────────────────────────────────────────────────────────────┐
│ 32px padding                                                │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Header (flex: 1)    │ gap: 24px │ Filter (flex-shrink) │  │
│  │                     │           │                      │  │
│  │ Title               │           │ Select Month: [▼]    │  │
│  │ Subtitle            │           │                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ↑ padding-bottom: 16px, border-bottom                     │
│                                                             │
│  margin-bottom: 24px                                        │
│                                                             │
│  [KPI Cards Start Here]                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Responsive Behavior

### Desktop (1200px+)
```
┌──────────────────────────────────────────────────────────────┐
│ Title                              Select Month: [Feb-2026 ▼]│
│ Subtitle                                                      │
└──────────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1199px)
```
┌──────────────────────────────────────────────────────────────┐
│ Title                              Select Month: [Feb-2026 ▼]│
│ Subtitle                                                      │
└──────────────────────────────────────────────────────────────┘
```

### Mobile (< 768px)
May stack depending on available width, but filter maintains minimum width.

## Color Scheme

| Element | Color | Usage |
|---------|-------|-------|
| Header Background | Gradient #f8faf9 to #f0f3f2 | Container background |
| Header Text | #1a1a18 | Title (h1) |
| Subtitle Text | #9c9a92 | Description (p) |
| Filter Background | #ffffff | Month filter container |
| Filter Border | #e8e6e1 | Month filter border |
| Border-bottom | rgba(15, 110, 86, 0.1) | Header section divider |
| Hover Color | #0f7a5a | Filter interaction |

## CSS Classes

```css
.dashboard-container
  └── .dashboard-header-with-filter (NEW)
      ├── .dashboard-header
      │   ├── h1
      │   └── p
      └── .month-filter-container
          ├── .month-filter-label
          └── .month-filter-select
```

## Key Properties

### dashboard-header-with-filter
- `display: flex`
- `justify-content: space-between`
- `align-items: flex-end`
- `gap: 24px`
- `margin-bottom: 24px`
- `padding-bottom: 16px`
- `border-bottom: 2px solid rgba(15, 110, 86, 0.1)`

### dashboard-header
- `flex: 1` (takes remaining space)
- `margin-bottom: 0`
- `padding-bottom: 0`
- `border-bottom: none`

### month-filter-container
- `display: flex`
- `align-items: center`
- `gap: 12px`
- `padding: 8px 16px`
- `background-color: #ffffff`
- `border-radius: 8px`
- `border: 1px solid #e8e6e1`
- `white-space: nowrap`
- `flex-shrink: 0`

## Interaction States

### Month Filter Dropdown
- **Default**: White background, gray border
- **Hover**: Teal border (#0f7a5a), subtle shadow
- **Focus**: Teal border, 3px teal shadow
- **Active**: Dropdown opens showing month options

## Accessibility

- ✅ Proper label association with `htmlFor`
- ✅ Semantic HTML structure
- ✅ Keyboard navigation support
- ✅ Focus states visible
- ✅ Color contrast meets WCAG standards
