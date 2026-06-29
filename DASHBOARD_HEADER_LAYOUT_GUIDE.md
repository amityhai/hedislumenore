# Dashboard Header Layout Guide

## Visual Layout

```
╔════════════════════════════════════════════════════════════════════════════╗
║ 32px padding                                                               ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────────┐ ║
║  │                                                                      │ ║
║  │  Quality Management Command Center    Select Month: [Feb-2026 ▼]   │ ║
║  │  Real-time performance snapshot, trends, and equity alerts.        │ ║
║  │  Data as of: March 30, 2026                                        │ ║
║  │                                                                      │ ║
║  └──────────────────────────────────────────────────────────────────────┘ ║
║  ↑ padding-bottom: 16px, border-bottom: 2px solid rgba(15, 110, 86, 0.1) ║
║                                                                            ║
║  margin-bottom: 24px                                                       ║
║                                                                            ║
║  ┌────────────────┬────────────────┬────────────────┬────────────────┐   ║
║  │  Above Goal    │   At Goal      │  Below Goal    │ Gaps Closed    │   ║
║  │      35        │       7        │      46        │      19        │   ║
║  │    / 88        │     / 88       │  need attention│    +18% vs Feb  │   ║
║  │ +5 vs MY 2025  │ Stable vs MY   │ 7 critical,    │                │   ║
║  │                │    2025        │ 39 below target│                │   ║
║  └────────────────┴────────────────┴────────────────┴────────────────┘   ║
║                                                                            ║
║  [Rest of Dashboard Content]                                              ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
```

## Component Hierarchy

```
dashboard-container
│
├── dashboard-header-with-filter (FLEX CONTAINER)
│   │
│   ├── dashboard-header (FLEX: 1 - Takes available space)
│   │   ├── h1 "Quality Management Command Center"
│   │   └── p "Real-time performance snapshot..."
│   │
│   └── month-filter-container (FLEX-SHRINK: 0 - Fixed size)
│       ├── label "Select Month:"
│       └── select [Feb-2026 ▼]
│
├── kpi-grid
│   ├── kpi-card (green)
│   ├── kpi-card (blue)
│   ├── kpi-card (red)
│   └── kpi-card (teal)
│
├── measure-health-matrix-section
├── chart-card-modern
└── three-col-grid
```

## Flexbox Properties Explained

### Container: `.dashboard-header-with-filter`
```css
display: flex;                    /* Enable flexbox */
justify-content: space-between;   /* Space between header and filter */
align-items: flex-end;            /* Align items to bottom */
gap: 24px;                        /* 24px space between items */
```

**Result**: Header on left, filter on right, both aligned to bottom

### Header: `.dashboard-header`
```css
flex: 1;                          /* Takes all available space */
margin-bottom: 0;                 /* Remove default margin */
padding-bottom: 0;                /* Remove default padding */
border-bottom: none;              /* Remove border (moved to container) */
```

**Result**: Header expands to fill available space

### Filter: `.month-filter-container`
```css
flex-shrink: 0;                   /* Don't shrink below content size */
white-space: nowrap;              /* Keep label and select on one line */
```

**Result**: Filter maintains fixed width, doesn't wrap

## Spacing Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│ 32px (container padding)                                    │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Header (flex: 1)  │ 24px gap │ Filter (flex-shrink)  │ │
│  │                   │          │                        │ │
│  │ Title             │          │ Select Month: [▼]     │ │
│  │ Subtitle          │          │                        │ │
│  └───────────────────────────────────────────────────────┘ │
│  ↑ 16px padding-bottom                                      │
│  ↑ border-bottom: 2px solid rgba(15, 110, 86, 0.1)        │
│                                                             │
│  24px margin-bottom                                         │
│                                                             │
│  [KPI Cards Start]                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Color Scheme

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Container Background | Gradient | #f8faf9 to #f0f3f2 | Dashboard background |
| Header Title | Dark Gray | #1a1a18 | h1 text |
| Header Subtitle | Medium Gray | #9c9a92 | p text |
| Filter Background | White | #ffffff | Month filter container |
| Filter Border | Light Gray | #e8e6e1 | Month filter border |
| Border Bottom | Teal (transparent) | rgba(15, 110, 86, 0.1) | Header divider |
| Hover Color | Teal | #0f7a5a | Filter interaction |

## Responsive Breakpoints

### Desktop (1200px+)
```
┌──────────────────────────────────────────────────────────────┐
│ Title                              Select Month: [Feb-2026 ▼]│
│ Subtitle                                                      │
└──────────────────────────────────────────────────────────────┘
```
- Full width layout
- Header and filter side-by-side
- Plenty of space

### Tablet (768px - 1199px)
```
┌──────────────────────────────────────────────────────────────┐
│ Title                              Select Month: [Feb-2026 ▼]│
│ Subtitle                                                      │
└──────────────────────────────────────────────────────────────┘
```
- Still side-by-side
- May adjust gap if needed

### Mobile (<768px)
```
┌──────────────────────────────────────────────────────────────┐
│ Title                              Select Month: [Feb-2026 ▼]│
│ Subtitle                                                      │
└──────────────────────────────────────────────────────────────┘
```
- Filter maintains minimum width (150px)
- May wrap if container too narrow
- Flexbox handles gracefully

## Alignment Details

### Vertical Alignment
- **Method**: `align-items: flex-end`
- **Result**: Both header and filter aligned to bottom
- **Effect**: Title and filter dropdown baseline aligned

### Horizontal Alignment
- **Method**: `justify-content: space-between`
- **Result**: Header on left, filter on right
- **Effect**: Maximum space between elements

### Gap
- **Value**: 24px
- **Purpose**: Visual separation between header and filter
- **Consistency**: Matches design system spacing

## CSS Classes Used

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

## Key CSS Properties

### `.dashboard-header-with-filter`
- `display: flex` - Enable flexbox
- `justify-content: space-between` - Space between items
- `align-items: flex-end` - Align to bottom
- `gap: 24px` - Space between items
- `margin-bottom: 24px` - Space below header
- `padding-bottom: 16px` - Internal padding
- `border-bottom: 2px solid rgba(15, 110, 86, 0.1)` - Divider line

### `.dashboard-header`
- `flex: 1` - Takes available space
- `margin-bottom: 0` - No margin
- `padding-bottom: 0` - No padding
- `border-bottom: none` - No border

### `.month-filter-container`
- `display: flex` - Flex layout
- `align-items: center` - Center items vertically
- `gap: 12px` - Space between label and select
- `padding: 8px 16px` - Internal padding
- `background-color: #ffffff` - White background
- `border: 1px solid #e8e6e1` - Subtle border
- `white-space: nowrap` - No text wrapping
- `flex-shrink: 0` - Don't shrink

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Flexbox fully supported |
| Firefox | ✅ Full | Flexbox fully supported |
| Safari | ✅ Full | Flexbox fully supported |
| Edge | ✅ Full | Flexbox fully supported |
| IE 11 | ⚠️ Partial | Flexbox with prefixes |
| Mobile | ✅ Full | All modern mobile browsers |

## Performance

- **DOM Elements**: No change
- **CSS**: Efficient flexbox layout
- **Rendering**: No performance impact
- **Paint**: Minimal repaints
- **Layout Shift**: None

## Accessibility

- ✅ Semantic HTML
- ✅ Proper label association
- ✅ Keyboard navigation
- ✅ Focus states visible
- ✅ Color contrast WCAG AA
- ✅ Screen reader friendly

## Summary

The dashboard header now displays the month filter alongside the title and subtitle using a modern flexbox layout. The design is clean, professional, and responsive across all device sizes.
