# KPI Display Guide

## What You Should See

### KPI Cards Display

```
┌─────────────────────────────────────────────────────────────────┐
│ Care Action Center                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────┐│
│  │ Total        │  │ Unassigned   │  │ Actionable   │  │Expir │
│  │ non-         │  │              │  │ now          │  │ing   │
│  │ compliant    │  │              │  │              │  │this  │
│  │              │  │              │  │              │  │week  │
│  │   21,292     │  │    2,392     │  │    5,842     │  │ 127  │
│  │              │  │              │  │              │  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────┘
│                       (orange)         (blue)          (red)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## KPI Values

### Total Non-Compliant
- **Label**: "Total non-compliant"
- **Value**: 21,292
- **Color**: Default (no color)
- **Source**: API (610cb1f9-583c-11f1-9e64-c1c8521cd737)
- **Status**: ✅ Real data

### Unassigned
- **Label**: "Unassigned"
- **Value**: 2,392
- **Color**: #EF9F27 (orange)
- **Source**: Fallback (placeholder workflow ID)
- **Status**: ⏳ Needs workflow ID

### Actionable Now
- **Label**: "Actionable now"
- **Value**: 5,842
- **Color**: #85b7eb (blue)
- **Source**: Fallback (placeholder workflow ID)
- **Status**: ⏳ Needs workflow ID

### Expiring This Week
- **Label**: "Expiring this week"
- **Value**: 127
- **Color**: #f09595 (red)
- **Source**: Fallback (placeholder workflow ID)
- **Status**: ⏳ Needs workflow ID

## CSS Styling

### KPI Card Structure
```html
<div className="kpi-card" style={{ borderBottomColor: '#EF9F27' }}>
  <div className="kpi-label">Unassigned</div>
  <div className="kpi-value">2,392</div>
</div>
```

### CSS Classes
```css
.kpi-card {
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid #e8e6e1;
  background: #fff;
  border-bottom: 3px solid #e8e6e1;
}

.kpi-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.kpi-value {
  font-size: 26px;
  font-weight: 700;
}
```

## Data Flow

```
Component Mount
    ↓
loadKpiData() called
    ↓
Promise.all([4 API calls])
    ├─ fetchCACNonCompliantCount() → 21,292 ✅
    ├─ fetchCACUnassignedCount() → 2,392 (fallback)
    ├─ fetchCACActionableCount() → 5,842 (fallback)
    └─ fetchCACExpiringCount() → 127 (fallback)
    ↓
setKpiData() updates state
    ↓
KPI cards re-render with values
    ↓
Display:
├─ Total non-compliant: 21,292
├─ Unassigned: 2,392
├─ Actionable now: 5,842
└─ Expiring this week: 127
```

## Console Output

### Logs You Should See
```
Loading KPI data...
Fetching non-compliant count...
Fetching unassigned count...
Fetching actionable count...
Fetching expiring count...
Non-compliant count fetched: 21292
KPI data loaded: {
  nonCompliant: 21292,
  unassigned: 2392,
  actionable: 5842,
  expiring: 127
}
```

### No Errors
- No "Error loading KPI data" messages
- No "Invalid response format" errors
- No network errors

## Troubleshooting

### Issue: KPI Cards Show 0
**Solution**: Check console logs for errors

### Issue: KPI Cards Show No Values
**Solution**: 
1. Check if component is loading
2. Open console (F12)
3. Look for "Loading KPI data..." log
4. Check for errors

### Issue: Console Shows Errors
**Solution**:
1. Check workflow IDs are correct
2. Verify token is valid
3. Check network connectivity
4. Verify API endpoint is accessible

### Issue: Only Non-Compliant Shows Real Data
**Solution**: This is expected - other workflow IDs are placeholders
- Non-compliant: Real data from API ✅
- Others: Fallback values until workflow IDs available ⏳

## Expected Behavior

### On Load
1. KPI cards appear with loading state
2. Console shows "Loading KPI data..."
3. After 1-2 seconds, values appear
4. Console shows "KPI data loaded: {...}"

### After Load
1. KPI cards display values
2. Non-compliant shows 21,292 (real data)
3. Others show fallback values
4. No errors in console

### On Error
1. KPI cards still display values
2. Values are fallback/default values
3. Error logged to console
4. Component continues to work

## Verification Checklist

- [ ] KPI cards visible on page
- [ ] Total non-compliant shows 21,292
- [ ] Unassigned shows 2,392
- [ ] Actionable now shows 5,842
- [ ] Expiring this week shows 127
- [ ] Console shows "Loading KPI data..."
- [ ] Console shows "KPI data loaded: {...}"
- [ ] No errors in console
- [ ] Cards have correct colors
- [ ] Values are formatted with commas (21,292)

## Next Steps

1. **Verify Display**
   - Check if KPI cards show values
   - Verify console logs
   - Check for errors

2. **Get Workflow IDs**
   - Contact Lumenore team
   - Get IDs for unassigned, actionable, expiring

3. **Update Workflow IDs**
   - Replace placeholder IDs
   - Test with real data

4. **Monitor Performance**
   - Check load times
   - Monitor API calls
   - Verify data accuracy

---

**Version**: 1.4.1
**Date**: May 25, 2026
**Status**: Ready for Testing
