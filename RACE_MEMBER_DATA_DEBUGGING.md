# Race Member Data Debugging Guide

## Issue
Members for "Asian" and "Other" race categories are not displaying in the race stratification dropdown.

## Root Cause Analysis

The issue could be one of the following:

### 1. API Not Filtering by Race Category
The race member details API (`bb5e52d6-380c-11f1-bbd1-03e2e173ad9d`) might not be filtering results by the `raceStrat` parameter. The API might be returning all members regardless of the race filter.

**Solution**: Check if the API accepts `raceStrat` as a filter parameter. If not, we may need to:
- Filter client-side after receiving all data
- Use a different API endpoint
- Contact API provider to add filtering support

### 2. Race Category Name Mismatch
The race category names in the UI might not match the values in the database.

**Examples**:
- UI shows: "Asian", "Other"
- Database has: "ASIAN", "OTHER", "Asian/Pacific Islander", etc.

**Solution**: Check the browser console logs to see what race values are being sent to the API.

### 3. No Data Exists for Those Categories
The database might not have any members for "Asian" and "Other" race categories for the selected measure and CRSP combination.

**Solution**: Check the raw API response to see if data exists.

## Debugging Steps

### Step 1: Check Browser Console Logs
Open browser DevTools (F12) and look for console logs when clicking on race categories:

```
Clicked CRSP: stratType=race, stratGroup=Asian, crspName=..., key=race-Asian-...
Fetching race members with filters: {measureId: "...", raceStrat: "Asian", crsp: "..."}
Raw Race Member Details API Response: {...}
Filters applied: {measureId: "...", raceStrat: "Asian", crsp: "..."}
Received 0 members for key: race-Asian-...
```

### Step 2: Check API Response
Look at the "Raw Race Member Details API Response" in the console. Check:
- Does it contain data?
- What race values are in the response?
- Are "Asian" and "Other" records present?

### Step 3: Verify Filter Values
Check if the race category names match exactly:
- Look at the `race_strat` column in the API response
- Compare with the values being sent in the filter

### Step 4: Test with Different Measure/CRSP
Try selecting a different measure or CRSP combination to see if the issue is specific to certain data combinations.

## Potential Fixes

### Fix 1: Client-Side Filtering (If API Returns All Data)
If the API returns all members without filtering, we can filter client-side:

```javascript
result.data.data.resultSet.forEach((row) => {
  const [memberId, memberName, measureId, raceStrat, crsp] = row;
  
  // Only include rows matching all filters
  if (
    measureId === filters.measureId &&
    raceStrat === filters.raceStrat &&
    crsp === filters.crsp
  ) {
    // Add to memberDetails
  }
});
```

### Fix 2: Case-Insensitive Comparison
If there's a case mismatch:

```javascript
if (
  measureId === filters.measureId &&
  raceStrat.toLowerCase() === filters.raceStrat.toLowerCase() &&
  crsp === filters.crsp
) {
  // Add to memberDetails
}
```

### Fix 3: Trim Whitespace
If there are leading/trailing spaces:

```javascript
if (
  measureId === filters.measureId &&
  raceStrat.trim() === filters.raceStrat.trim() &&
  crsp === filters.crsp
) {
  // Add to memberDetails
}
```

## Console Log Output to Check

When you click on "Asian" or "Other" race category, look for:

1. **Filter values being sent**:
   ```
   Fetching race members with filters: {measureId: "...", raceStrat: "Asian", crsp: "..."}
   ```

2. **API response data**:
   ```
   Raw Race Member Details API Response: {data: {data: {resultSet: [...]}}}
   ```

3. **Member count received**:
   ```
   Received 0 members for key: race-Asian-...
   ```

## Next Steps

1. **Check the console logs** when clicking on Asian/Other categories
2. **Share the API response** from the console
3. **Verify the race category names** in the response match what's being sent
4. **Check if data exists** for those categories in the database

## Files with Debugging

- `src/components/MeasureDetail.js` - Added console logs in `handleCRSPClick()`
- `src/services/workflowService.js` - Added console logs in `fetchRaceMemberDetails()`

Both functions now log:
- Filter parameters being sent
- API response received
- Number of members returned
- Transformed member details
