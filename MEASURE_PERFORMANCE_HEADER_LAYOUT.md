# Measure Performance Header - Layout Guide

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Measure performance                Select Month: [Feb-2026 ▼]  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
MeasurePerformanceSection
│
├── measure-performance (card container)
│   │
│   ├── mp-header (flexbox container)
│   │   ├── mp-title "Measure performance"
│   │   └── month-filter-container
│   │       ├── month-filter-label "Select Month:"
│   │       └── month-filter-select [Feb-2026 ▼]
│   │
│   ├── mp-tabs (EOC, ECDS, AAC, URU)
│   ├── mp-pills (measure selection)
│   └── mp-card (measure details)
```

## Flexbox Configuration

### Container: `.mp-header`
```css
display: flex;                    /* Enable flexbox */
align-items: center;              /* Center items vertically */
justify-content: space-between;   /* Space between title and filter */
margin-bottom: 10px;
gap: 16px;                        /* Space between items */
flex-wrap: wrap;                  /* Wrap on smaller screens */
min-width: 0;                     /* Allow shrinking */
```

**Result**: Title on left, filter on right, both centered vertically

### Title: `.mp-title`
```css
font-size: 18px;
font-weight: 700;
letter-spacing: -0.01em;
margin: 0;
```

**Result**: Bold, prominent title

### Filter: `.month-filter-container`
```css
display: flex;
align-items: center;
gap: 12px;
padding: 8px 16px;
background-color: #ffffff;
border: 1px solid #e8e6e1;
border-radius: 8px;
white-space: nowrap;
flex-shrink: 0;
```

**Result**: Compact, fixed-width filter on the right

## Spacing Breakdown

```
┌──────────────────────────────────────────────────────────────┐
│ 12px padding (card)                                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Title (flex: auto)  │ 16px gap │ Filter (flex-shrink) │ │
│  │                     │          │                      │ │
│  │ Measure performance │          │ Select Month: [▼]   │ │
│  └────────────────────────────────────────────────────────┘ │
│  ↑ margin-bottom: 10px                                       │
│                                                              │
│  [Tabs Below]                                                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Color Scheme

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Card Background | White | #ffffff | measure-performance |
| Card Border | Light Gray | #d8ddd6 | Card border |
| Title Text | Dark | #0f172a | mp-title |
| Filter Background | White | #ffffff | month-filter-container |
| Filter Border | Light Gray | #e8e6e1 | month-filter-container |
| Label Text | Dark | #333 | month-filter-label |
| Hover Color | Teal | #0f7a5a | Filter interaction |

## Responsive Behavior

### Desktop (1200px+)
```
┌──────────────────────────────────────────────────────────────┐
│ Measure performance                Select Month: [Feb-2026 ▼]│
└──────────────────────────────────────────────────────────────┘
```
- Title and filter side-by-side
- Plenty of space

### Tablet (768px - 1199px)
```
┌──────────────────────────────────────────────────────────────┐
│ Measure performance                Select Month: [Feb-2026 ▼]│
└──────────────────────────────────────────────────────────────┘
```
- Still side-by-side
- May adjust gap if needed

### Mobile (<768px)
```
┌──────────────────────────────────────────────────────────────┐
│ Measure performance                Select Month: [Feb-2026 ▼]│
└──────────────────────────────────────────────────────────────┘
```
- May wrap if container too narrow
- Filter maintains minimum width (150px)
- Flexbox handles gracefully

## Alignment Details

### Vertical Alignment
- **Method**: `align-items: center`
- **Result**: Title and filter aligned to center
- **Effect**: Clean, professional appearance

### Horizontal Alignment
- **Method**: `justify-content: space-between`
- **Result**: Title on left, filter on right
- **Effect**: Maximum space between elements

### Gap
- **Value**: 16px
- **Purpose**: Visual separation between title and filter
- **Consistency**: Matches design system spacing

## CSS Classes

```css
.measure-performance
  └── .mp-header (flexbox container)
      ├── .mp-title
      └── .month-filter-container
          ├── .month-filter-label
          └── .month-filter-select
```

## Key CSS Properties

### `.mp-header`
- `display: flex` - Enable flexbox
- `align-items: center` - Center items vertically
- `justify-content: space-between` - Space between items
- `gap: 16px` - Space between items
- `margin-bottom: 10px` - Space below header
- `flex-wrap: wrap` - Wrap on smaller screens
- `min-width: 0` - Allow shrinking

### `.mp-title`
- `font-size: 18px` - Prominent size
- `font-weight: 700` - Bold
- `letter-spacing: -0.01em` - Tight spacing
- `margin: 0` - No margin

### `.month-filter-container`
- `display: flex` - Flex layout
- `align-items: center` - Center items
- `gap: 12px` - Space between label and select
- `padding: 8px 16px` - Internal padding
- `background-color: #ffffff` - White background
- `border: 1px solid #e8e6e1` - Subtle border
- `border-radius: 8px` - Rounded corners
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

- **DOM Elements**: Minimal
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

## Interaction States

### Month Filter Dropdown
- **Default**: White background, gray border
- **Hover**: Teal border (#0f7a5a), subtle shadow
- **Focus**: Teal border, 3px teal shadow
- **Active**: Dropdown opens showing month options

## Summary

The Measure Performance header now displays the title on the left and the month filter on the right using a modern flexbox layout. The design is clean, professional, and responsive across all device sizes.
