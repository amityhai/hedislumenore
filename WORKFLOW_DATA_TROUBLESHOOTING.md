# Workflow Data Troubleshooting

## What Changed

I've added debugging features to help identify why workflow data isn't showing:

### 1. Enhanced Console Logging
The app now logs detailed information:
- Raw API response
- Each measure being processed
- Transformed measures data
- Measure counts per category

### 2. UI Debug Information
The Dashboard now shows:
- Error messages (if any)
- Loading state
- Measure count per category in tabs: `EOC (11)`, `ECDS (6)`, etc.
- "No measures available" message if category is empty

### 3. Better Error Display
- Error messages now display in the UI
- Shows what went wrong during data fetch

## How to Check If It's Working

### Step 1: Open Browser Console
1. Press `F12` or right-click → Inspect
2. Go to **Console** tab
3. Refresh the page

### Step 2: Look for These Logs

**Success Case:**
```
Dashboard - fetchDashboardData called with token: eyJhbGciOiJSUzI1NiJ9...
Raw API Response: {version: {...}, status: {...}, data: {...}}
Processing measure: CBP, category: EOC, rate: 65, goal: 55
Processing measure: GSD, category: EOC, rate: 65, goal: 65
...
Transformed Measures: {eoc: Array(11), ecds: Array(6), aac: Array(0), uru: Array(0)}
KPI Data: [...]
Measures Data: {eoc: Array(11), ecds: Array(6), aac: Array(0), uru: Array(0)}
Measures EOC count: 11
Measures ECDS count: 6
```

**Error Case:**
```
Dashboard - fetchDashboardData called with token: eyJhbGciOiJSUzI1NiJ9...
Error fetching dashboard data: Error: Invalid response format
Using fallback mock data
```

### Step 3: Check UI

**Success:**
- Tabs show: `EOC (11)`, `ECDS (6)`, `AAC (0)`, `URU (0)`
- Measure pills appear below tabs
- Can click between categories

**Error:**
- Error message displays in red box
- Tabs show: `EOC (0)`, `ECDS (0)`, `AAC (0)`, `URU (0)`
- "No measures available" message appears

## Common Issues & Solutions

### Issue 1: Tabs Show (0) for All Categories

**Cause:** Measures data is empty or not being fetched

**Check:**
1. Look for error message in console
2. Check if "Raw API Response" is logged
3. Verify token is valid

**Solution:**
```javascript
// In console, check token
sessionStorage.getItem('appAccessToken')

// Should return a long JWT token
// If empty, token needs to be set
```

### Issue 2: "Invalid response format" Error

**Cause:** API response structure is different than expected

**Check:**
1. Look at "Raw API Response" in console
2. Verify it has `data.data.resultSet` property

**Solution:**
1. Check if API endpoint is correct
2. Verify workflow ID: `0a483e41-3282-11f1-bc78-3b7e37da8ec2`
3. Check if token is valid

### Issue 3: "Using fallback mock data" Message

**Cause:** API call failed, using mock data instead

**Check:**
1. Look for error message in console
2. Check Network tab for failed request
3. Verify token expiry

**Solution:**
1. Check token is not expired
2. Verify API endpoint is accessible
3. Check network connection

### Issue 4: Measures Show But Data Looks Wrong

**Cause:** Data transformation issue

**Check:**
1. Look at "Processing measure" logs
2. Check if rates and goals are correct
3. Verify category mapping

**Solution:**
1. Check if API response format changed
2. Verify goal values are being parsed correctly
3. Check if scientific notation is being handled

## Debug Commands

Run these in browser console:

```javascript
// Check token
sessionStorage.getItem('appAccessToken')

// Check token info
import { getTokenInfo } from './services/tokenService'
getTokenInfo()

// Check API config
import { getApiConfig } from './services/workflowService'
getApiConfig()

// Manually fetch measures
import { fetchDashboardMeasures } from './services/workflowService'
const token = sessionStorage.getItem('appAccessToken')
fetchDashboardMeasures(token)
  .then(data => {
    console.log('Success:', data)
    console.log('EOC count:', data.eoc.length)
    console.log('ECDS count:', data.ecds.length)
  })
  .catch(err => console.error('Error:', err))
```

## Network Tab Debugging

1. Open DevTools → Network tab
2. Refresh page
3. Look for POST request to `https://dwihn-uat.lumenore.com/appsapi/appbuilder/workflow`
4. Click on it and check:
   - **Status:** Should be 200
   - **Request Headers:** Should include authorization token
   - **Response:** Should have `data.data.resultSet` array

## Expected Response Structure

```json
{
  "version": {"name": "vanilla", "version": null},
  "status": {"code": "200", "value": "success"},
  "data": {
    "data": {
      "queryInfo": {"totalRows": 20, "type": "selected"},
      "metaData": [...],
      "resultSet": [
        ["ADD-E_CONT", "ECDS", "ADHD Continuation Phase", 491170, 761940, 64, -9, "55", "Above Goal"],
        ["ADD-E_INIT", "ECDS", "ADHD Initiation Phase", 498680, 769814, 65, -10, "55", "Above Goal"],
        ...
      ]
    }
  },
  "error": false
}
```

## Checklist

- [ ] Console shows "Raw API Response"
- [ ] Console shows "Processing measure" logs
- [ ] Console shows "Measures EOC count: 11"
- [ ] Tabs show measure counts: `EOC (11)`, `ECDS (6)`
- [ ] No error messages in console
- [ ] No error messages in UI
- [ ] Can click between category tabs
- [ ] Measure pills appear when category has data
- [ ] Can click measure pills to select them

## If Still Not Working

1. **Share console output:**
   - Copy all logs from console
   - Include any error messages

2. **Share Network response:**
   - Go to Network tab
   - Find workflow API request
   - Copy the response body

3. **Check token:**
   - Run: `sessionStorage.getItem('appAccessToken')`
   - Verify it's a valid JWT token

4. **Verify API endpoint:**
   - URL: `https://dwihn-uat.lumenore.com/appsapi/appbuilder/workflow`
   - Workflow ID: `0a483e41-3282-11f1-bc78-3b7e37da8ec2`
   - App ID: `4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d`

## Next Steps

Once you've checked the console:
1. Share the error message (if any)
2. Share the "Raw API Response" structure
3. Share the "Measures EOC count" value
4. Share the Network tab response

This will help identify the exact issue.
