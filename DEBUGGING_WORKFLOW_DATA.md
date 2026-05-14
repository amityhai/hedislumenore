# Debugging Workflow Data - Troubleshooting Guide

## Steps to Debug

### 1. Open Browser DevTools
- Press `F12` or right-click → Inspect
- Go to **Console** tab

### 2. Check Console Logs
Look for these messages:

```
Dashboard - fetchDashboardData called with token: eyJhbGciOiJSUzI1NiJ9...
Raw API Response: { version: {...}, status: {...}, data: {...} }
Processing measure: BCS-E, category: ECDS, rate: 65, goal: 65
Transformed Measures: { eoc: [...], ecds: [...], aac: [], uru: [] }
KPI Data: [...]
Measures Data: { eoc: [...], ecds: [...], aac: [], uru: [] }
Measures EOC count: 11
Measures ECDS count: 6
```

### 3. Check for Errors
Look for error messages like:
- `Error fetching Dashboard Measures: ...`
- `Workflow API Error: ...`
- `Invalid response format`

### 4. Verify Token
In console, run:
```javascript
// Check if token exists
sessionStorage.getItem('appAccessToken')

// Should return a long JWT token starting with eyJ...
```

### 5. Check Network Tab
- Go to **Network** tab
- Look for POST request to `https://dwihn-uat.lumenore.com/appsapi/appbuilder/workflow`
- Check response status (should be 200)
- Check response body for data

### 6. Verify Data Structure
In console, run:
```javascript
// After dashboard loads, check measures
// Open React DevTools or inspect component state
```

## Common Issues & Solutions

### Issue 1: "Invalid response format"
**Cause:** API response doesn't have `result.data.data.resultSet`

**Solution:**
1. Check Network tab response
2. Verify workflow ID is correct: `0a483e41-3282-11f1-bc78-3b7e37da8ec2`
3. Check token is valid

### Issue 2: Measures not showing but no error
**Cause:** Data is fetched but not rendering

**Solution:**
1. Check console for "Measures EOC count" - should be > 0
2. Verify category tabs are clickable
3. Check if measures array is empty

### Issue 3: "Using fallback mock data"
**Cause:** API call failed, using mock data instead

**Solution:**
1. Check console for error message
2. Check Network tab for failed request
3. Verify token is valid
4. Check API endpoint is accessible

### Issue 4: Token not found
**Cause:** Token not stored in session storage

**Solution:**
1. In console, run: `sessionStorage.getItem('appAccessToken')`
2. If empty, token needs to be set
3. Call: `updateToken(newToken)` in App.js

## Console Commands to Debug

```javascript
// Check if measures are loaded
console.log(sessionStorage.getItem('appAccessToken'))

// Check API config
import { getApiConfig } from './services/workflowService'
getApiConfig()

// Check workflow IDs
import { getWorkflowIds } from './services/workflowService'
getWorkflowIds()

// Manually test API call
import { fetchDashboardMeasures } from './services/workflowService'
const token = sessionStorage.getItem('appAccessToken')
fetchDashboardMeasures(token).then(data => console.log(data))
```

## Expected Console Output

When everything works correctly, you should see:

```
Dashboard - fetchDashboardData called with token: eyJhbGciOiJSUzI1NiJ9...
Raw API Response: {
  version: {name: "vanilla", version: null},
  status: {code: "200", value: "success"},
  data: {
    data: {
      queryInfo: {totalRows: 20, type: "selected"},
      metaData: [...],
      resultSet: [
        ["ADD-E_CONT", "ECDS", "ADHD Continuation Phase", 491170, 761940, 64, -9, "55", "Above Goal"],
        ["ADD-E_INIT", "ECDS", "ADHD Initiation Phase", 498680, 769814, 65, -10, "55", "Above Goal"],
        ...
      ]
    }
  },
  error: false
}

Processing measure: ADD-E_CONT, category: ECDS, rate: 64, goal: 55
Processing measure: ADD-E_INIT, category: ECDS, rate: 65, goal: 55
...

Transformed Measures: {
  eoc: [
    {id: "CBP", name: "Controlling High Blood Pressure", rate: 65, goal: 55, ...},
    ...
  ],
  ecds: [
    {id: "ADD-E_CONT", name: "ADHD Continuation Phase", rate: 64, goal: 55, ...},
    ...
  ],
  aac: [],
  uru: []
}

KPI Data: [
  {label: "Above goal / target", value: 17, total: 20, ...},
  ...
]

Measures Data: {eoc: Array(11), ecds: Array(6), aac: Array(0), uru: Array(0)}
Measures EOC count: 11
Measures ECDS count: 6
```

## Checklist

- [ ] Token is valid and stored in session storage
- [ ] Network request shows 200 status
- [ ] API response has `data.data.resultSet` array
- [ ] Console shows "Measures EOC count: 11"
- [ ] Console shows "Measures ECDS count: 6"
- [ ] No error messages in console
- [ ] Measures display in UI with category tabs
- [ ] Can click between EOC, ECDS, AAC, URU tabs

## If Still Not Working

1. **Check token expiry:**
   ```javascript
   import { getTokenInfo } from './services/tokenService'
   getTokenInfo()
   ```

2. **Verify API endpoint:**
   - URL: `https://dwihn-uat.lumenore.com/appsapi/appbuilder/workflow`
   - Method: POST
   - Headers: Include authorization token

3. **Check workflow ID:**
   - Should be: `0a483e41-3282-11f1-bc78-3b7e37da8ec2`

4. **Verify app ID:**
   - Should be: `4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d`

5. **Test with curl:**
   ```bash
   curl -X POST "https://dwihn-uat.lumenore.com/appsapi/appbuilder/workflow" \
     -H "authorization: Bearer YOUR_TOKEN" \
     -H "application-id: 4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d" \
     -F "data={\"workflowId\":\"0a483e41-3282-11f1-bc78-3b7e37da8ec2\",\"data\":{\"appId\":\"4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d\"}}"
   ```

## Next Steps

Once you see the console logs, share:
1. The error message (if any)
2. The "Raw API Response" structure
3. The "Measures EOC count" value

This will help identify the exact issue.
