# Pagination - Visual Guide

## Complete Grid with Pagination

```
┌─────────────────────────────────────────────────────────────────────┐
│ Care Action Center                                                  │
├─────────────────────────────────────────────────────────────────────┤
│ KPI Cards: [Total] [Unassigned] [Actionable] [Expiring]             │
├─────────────────────────────────────────────────────────────────────┤
│ Filters: [Measure ▼] [Status ▼] [CRSP ▼] [Assigned ▼]              │
├─────────────────────────────────────────────────────────────────────┤
│ Grid Table:                                                         │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │ ID │ Name │ Measure │ CRSP │ Assigned to │ Action           │   │
│ ├──────────────────────────────────────────────────────────────┤   │
│ │1350796│Davis, Curtisha│FUM_30│TEAM...│Sarah Jenkins│[View]│   │
│ │1576144│Cole, Lucy│FUM_30│NO CRSP│Unassigned│[View]│   │
│ │1328308│Gibney, Brian│AAP│NO CRSP│Michael Chen│[View]│   │
│ │1629257│Conley-Strange│BCS-E│WAYNE CENTER│Unassigned│[View]│   │
│ │1336554│Person, Travis│FUM_7│TEAM...│Sarah Jenkins│[View]│   │
│ │1559731│Perkins, Kai'La│FUM_7│VITAL HEALTH│Unassigned│[View]│   │
│ │1554878│Alwaely, Thikra│AAP│NO CRSP│John Smith│[View]│   │
│ │1420296│THOMAS, AMANI│FUM_30│NO CRSP│Unassigned│[View]│   │
│ │1608825│White, Garion│APM-E│TEAM...│Sarah Jenkins│[View]│   │
│ │1636405│Mongar, Joshua│FUM_30│TEAM...│Michael Chen│[View]│   │
│ └──────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│ Pagination:                                                         │
│ Showing 1 to 10 of 21292 records  [10 per page ▼]                  │
│                                                                     │
│ [⟨⟨] [⟨] [1] [2] [3] [4] [5] [⟩] [⟩⟩]    [1] / 2130               │
└─────────────────────────────────────────────────────────────────────┘
```

## Pagination Bar Breakdown

### Section 1: Record Information
```
┌─────────────────────────────────────────────────────────────┐
│ Showing 1 to 10 of 21292 records  [10 per page ▼]          │
└─────────────────────────────────────────────────────────────┘
```

- **Text**: "Showing 1 to 10 of 21292 records"
  - Updates based on current page and page size
  - Shows record range and total

- **Dropdown**: "10 per page"
  - Options: 10, 25, 50, 100
  - Changes records displayed per page

### Section 2: Navigation Controls
```
┌─────────────────────────────────────────────────────────────┐
│ [⟨⟨] [⟨] [1] [2] [3] [4] [5] [⟩] [⟩⟩]                      │
└─────────────────────────────────────────────────────────────┘
```

- **⟨⟨** - First page (disabled if on page 1)
- **⟨** - Previous page (disabled if on page 1)
- **1, 2, 3, 4, 5** - Page numbers (shows 5 at a time)
  - Active page highlighted in green
  - Click to jump to that page
- **⟩** - Next page (disabled if on last page)
- **⟩⟩** - Last page (disabled if on last page)

### Section 3: Direct Jump
```
┌─────────────────────────────────────────────────────────────┐
│ [1] / 2130                                                  │
└─────────────────────────────────────────────────────────────┘
```

- **Input Field**: Enter page number
- **Text**: "/ 2130" (total pages)
- Press Enter to jump to page

## Page Navigation Examples

### Example 1: Page 1 (First Page)
```
Showing 1 to 10 of 21292 records

[⟨⟨] [⟨] [1] [2] [3] [4] [5] [⟩] [⟩⟩]
 ✗    ✗   ✓   ○   ○   ○   ○   ✓   ✓
```
- First/Previous buttons disabled
- Page 1 highlighted
- Next/Last buttons enabled

### Example 2: Page 50 (Middle)
```
Showing 491 to 500 of 21292 records

[⟨⟨] [⟨] [48] [49] [50] [51] [52] [⟩] [⟩⟩]
 ✓    ✓    ○    ○    ✓    ○    ○    ✓   ✓
```
- All buttons enabled
- Page 50 highlighted
- Shows pages 48-52

### Example 3: Last Page (Page 2130)
```
Showing 21291 to 21292 of 21292 records

[⟨⟨] [⟨] [2126] [2127] [2128] [2129] [2130] [⟩] [⟩⟩]
 ✓    ✓     ○      ○      ○      ○      ✓     ✗   ✗
```
- First/Previous buttons enabled
- Page 2130 highlighted
- Next/Last buttons disabled

## Page Size Options

### 10 per page (Default)
```
Total Pages: 2,130
Records per page: 10
Example: Page 1 shows records 1-10
```

### 25 per page
```
Total Pages: 852
Records per page: 25
Example: Page 1 shows records 1-25
```

### 50 per page
```
Total Pages: 426
Records per page: 50
Example: Page 1 shows records 1-50
```

### 100 per page
```
Total Pages: 213
Records per page: 100
Example: Page 1 shows records 1-100
```

## Button States

### Normal Button
```
┌─────┐
│ [1] │  Gray background, clickable
└─────┘
```

### Hover Button
```
┌─────┐
│ [1] │  Green background, white text
└─────┘
```

### Active Button (Current Page)
```
┌─────┐
│ [1] │  Green background, white text, bold
└─────┘
```

### Disabled Button
```
┌─────┐
│ [1] │  Faded, not clickable
└─────┘
```

## Responsive Layouts

### Desktop (Full Width)
```
┌─────────────────────────────────────────────────────────────┐
│ Showing 1 to 10 of 21292 records  [10 per page ▼]          │
│ [⟨⟨] [⟨] [1] [2] [3] [4] [5] [⟩] [⟩⟩]    [1] / 2130       │
└─────────────────────────────────────────────────────────────┘
```

### Tablet (Wrapped)
```
┌─────────────────────────────────────────────────────────────┐
│ Showing 1 to 10 of 21292 records  [10 per page ▼]          │
│                                                             │
│ [⟨⟨] [⟨] [1] [2] [3] [4] [5] [⟩] [⟩⟩]                      │
│                                                             │
│ [1] / 2130                                                  │
└─────────────────────────────────────────────────────────────┘
```

### Mobile (Stacked)
```
┌──────────────────────────────────┐
│ Showing 1 to 10 of 21292 records │
│ [10 per page ▼]                  │
│                                  │
│ [⟨⟨] [⟨] [1] [2] [3] [⟩] [⟩⟩]    │
│                                  │
│ [1] / 2130                       │
└──────────────────────────────────┘
```

## User Interactions

### Click Page Number
```
User clicks [3]
    ↓
Page changes to 3
    ↓
Grid displays records 21-30
    ↓
Page 3 highlighted
```

### Click Next Button
```
User clicks [⟩]
    ↓
Current page increments
    ↓
Grid displays next 10 records
    ↓
Page numbers update
```

### Change Page Size
```
User selects "50 per page"
    ↓
Page size changes to 50
    ↓
Page resets to 1
    ↓
Grid displays records 1-50
    ↓
Total pages recalculated
```

### Jump to Page
```
User enters "100" in input
    ↓
User presses Enter
    ↓
Page changes to 100
    ↓
Grid displays records 991-1000
    ↓
Page 100 highlighted
```

## Color Scheme

### Colors Used
- **Background**: #fafaf7 (light gray)
- **Border**: #e8e6e1 (light border)
- **Text**: #6b6a66 (dark gray)
- **Active**: #0f6e56 (green)
- **Hover**: #0f6e56 (green)
- **Disabled**: Faded (50% opacity)

### Button States
- **Normal**: White background, gray text
- **Hover**: Green background, white text
- **Active**: Green background, white text
- **Disabled**: Faded white, gray text

## Accessibility Features

### Keyboard Navigation
```
Tab → Navigate between controls
Enter → Submit page input
Space → Click button
```

### Screen Reader
```
"First page button"
"Previous page button"
"Page 1 button, current page"
"Page 2 button"
"Next page button"
"Last page button"
"Page size selector, 10 per page"
"Go to page input, page 1 of 2130"
```

### Focus Indicators
```
Focused button shows outline
Input field shows blue border
Clear visual indication
```

## Performance Indicators

### Fast Navigation
```
Click page → Instant display
No loading spinner
No API call
Smooth transition
```

### Memory Efficient
```
Only 10-100 records in memory
Rest on demand
No lag
Smooth scrolling
```

## Summary

The pagination system provides:

✅ **Intuitive Controls** - Easy to understand
✅ **Multiple Options** - Different page sizes
✅ **Smart Navigation** - Shows relevant pages
✅ **Direct Jump** - Go to specific page
✅ **Clear Information** - Shows record range
✅ **Responsive** - Works on all devices
✅ **Accessible** - Keyboard and screen reader
✅ **Fast** - Instant page switching

---

**Version**: 1.3.0
**Date**: May 25, 2026
