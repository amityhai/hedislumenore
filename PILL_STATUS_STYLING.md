# Pill Status-Based Styling

## Overview
Updated the measure pill styling to reflect performance status with color-coded indicators.

## Pill Status Colors

### Inactive Pills (Outline Style)
- **Above Goal** - Green border and text (#22c55e)
  - Indicates measure is performing above target
  - Light green hover background (#f0fdf4)

- **Below Goal** - Red border and text (#ef4444)
  - Indicates measure is performing below target
  - Light red hover background (#fef2f2)

- **At Goal** - Blue border and text (#3b82f6)
  - Indicates measure is at target
  - Light blue hover background (#eff6ff)

### Active Pill (Filled Style)
- **Above Goal** - Green filled background (#22c55e) with white text
- **Below Goal** - Red filled background (#ef4444) with white text
- **At Goal** - Blue filled background (#3b82f6) with white text

## Visual Examples

```
Inactive Pills:
┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
│ CBP │  │ GSD │  │ CHL │  │ SSD │
└─────┘  └─────┘  └─────┘  └─────┘
  red      red      red     green

Active Pill (GSD - Below Goal):
┌─────────────────┐
│ GSD (filled red)│
└─────────────────┘
```

## Implementation Details

### CSS Classes
- `.pill` - Base pill styling
- `.pill.active` - Active state (filled background)
- `.pill.outline-green` - Inactive above-goal pill
- `.pill.outline-red` - Inactive below-goal pill
- `.pill.outline-blue` - Inactive at-goal pill
- `.pill.active.above-goal` - Active above-goal pill
- `.pill.active.below-goal` - Active below-goal pill
- `.pill.active.at-goal` - Active at-goal pill

### Component Logic
The component now:
1. Calculates status for each measure:
   - `rate > goal` → above-goal (green)
   - `rate === goal` → at-goal (blue)
   - `rate < goal` → below-goal (red)

2. Applies appropriate classes:
   - Inactive: `outline-{status}` class
   - Active: `active {status}` classes

3. Updates on selection:
   - When pill is clicked, it becomes active
   - Active pill shows filled background with status color
   - Other pills show outline style with status color

## User Experience

### Visual Feedback
- Users can quickly see measure performance at a glance
- Color coding is consistent across all pills
- Active pill is clearly distinguished with filled background
- Status is visible both when active and inactive

### Color Meaning
- 🟢 **Green** = Above Goal (performing well)
- 🔴 **Red** = Below Goal (needs attention)
- 🔵 **Blue** = At Goal (on target)

## Styling Details

### Border
- Inactive pills: 2px border with status color
- Active pills: 2px border with status color (filled)
- Hover: Subtle background color change

### Text
- Inactive pills: Status color text
- Active pills: White text on colored background
- Font weight: 600 (inactive), 700 (active)

### Spacing
- Height: 36px
- Padding: 0 16px
- Border radius: 999px (fully rounded)
- Gap between pills: 6px

### Transitions
- All changes use 0.18s ease transition
- Smooth color and background changes
- Hover effects are subtle and responsive

## Accessibility
- Color is not the only indicator (text labels are present)
- Sufficient contrast ratios for readability
- Clear visual distinction between states
- Keyboard navigation supported

## Testing Checklist
- ✓ Inactive pills show correct outline color based on status
- ✓ Active pill shows filled background with status color
- ✓ Clicking pill changes it to active
- ✓ Clicking another pill deactivates previous and activates new
- ✓ Hover effects work on both active and inactive pills
- ✓ Colors match the design specification
- ✓ Text is readable on all backgrounds
- ✓ No console errors when switching pills
