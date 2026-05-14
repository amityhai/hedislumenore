# Measure Stratification Filtering

## How It Works

The age stratification is automatically filtered based on the currently selected measure. When you select a different measure, the stratification data updates to show only the age groups for that measure.

## Data Flow

```
User selects measure pill
    ↓
setSelectedMeasure(measureId)
    ↓
useEffect triggers (selectedMeasure dependency)
    ↓
stratificationData[selectedMeasure] is accessed
    ↓
Age stratification for that measure is displayed
```

## Implementation

### 1. Measure Selection
When user clicks a measure pill:
```javascript
<button onClick={() => setSelectedMeasure(m.id)}>
  {m.id}
</button>
```

### 2. Stratification Filtering
The stratification section uses the selected measure:
```javascript
{stratificationData[selectedMeasure] && (
  <div className="stratification-section">
    {stratificationData[selectedMeasure].age && (
      // Display age stratification for this measure
    )}
  </div>
)}
```

### 3. Automatic Updates
When measure changes, stratification automatically updates:
```javascript
useEffect(() => {
  console.log('Selected measure changed to:', selectedMeasure);
  console.log('Stratification data for this measure:', stratificationData[selectedMeasure]);
}, [selectedMeasure, stratificationData]);
```

## Example Flow

### Step 1: Initial Load
- Category: EOC
- First measure selected: ADD-E_CONT (or first in API response)
- Stratification shows: Age groups for ADD-E_CONT
  - 0-17: 64%
  - 18-64: 64%
  - 65+: 65%

### Step 2: User Clicks Different Measure
- User clicks "CBP" pill
- selectedMeasure changes to "CBP"
- Stratification updates to show: Age groups for CBP
  - 0-17: 64%
  - 18-64: 65%
  - 65+: 65%

### Step 3: User Switches Category
- User clicks "ECDS" tab
- First measure in ECDS selected (e.g., ADD-E_CONT)
- Stratification updates to show: Age groups for that measure

## Data Structure

```javascript
stratificationData = {
  'ADD-E_CONT': {
    age: [
      { group: '0-17', rate: 64, denom: 124869, nonCompliant: 45113 },
      { group: '18-64', rate: 64, denom: 122161, nonCompliant: 43978 },
      { group: '65+', rate: 65, denom: 133940, nonCompliant: 46879 }
    ]
  },
  'ADD-E_INIT': {
    age: [
      { group: '0-17', rate: 65, denom: 129622, nonCompliant: 45367 },
      { group: '18-64', rate: 65, denom: 129382, nonCompliant: 45284 },
      { group: '65+', rate: 64, denom: 125903, nonCompliant: 45325 }
    ]
  },
  'BCS-E': {
    age: [
      { group: '0-17', rate: 65, denom: 133170, nonCompliant: 46550 },
      { group: '18-64', rate: 64, denom: 120800, nonCompliant: 43488 },
      { group: '65+', rate: 65, denom: 127893, nonCompliant: 44762 }
    ]
  },
  // ... more measures
}
```

## Console Logging

When you select a measure, check the console to see:
```
Selected measure changed to: BCS-E
Stratification data for this measure: {
  age: [
    { group: '0-17', rate: 65, denom: 133170, nonCompliant: 46550 },
    { group: '18-64', rate: 64, denom: 120800, nonCompliant: 43488 },
    { group: '65+', rate: 65, denom: 127893, nonCompliant: 44762 }
  ]
}
```

## Key Points

✅ Stratification automatically filters by selected measure
✅ Updates when measure changes
✅ Updates when category changes (first measure selected)
✅ Shows age groups for current measure only
✅ No manual filtering needed
✅ Console logs show current measure and its data

## Testing

1. **Load Dashboard**
   - First measure in EOC selected
   - Age stratification shows for that measure

2. **Click Different Measure Pill**
   - Stratification updates immediately
   - Shows age groups for new measure

3. **Switch Category Tab**
   - First measure in new category selected
   - Stratification updates to new measure

4. **Check Console**
   - See "Selected measure changed to: [measureId]"
   - See stratification data for that measure

## Status: WORKING ✅

Age stratification is correctly filtered by the selected measure. When you select a different measure, the stratification data automatically updates to show only the age groups for that measure.
