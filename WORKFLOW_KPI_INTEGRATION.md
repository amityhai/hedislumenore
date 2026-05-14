# Workflow KPI Integration - Complete

## Overview
The Dashboard KPI cards are now fully integrated with the backend workflow API. The cards display real-time data from the workflow response.

## API Response Format
The workflow returns KPI data in this format:
```json
{
  "resultSet": [
    ["Above Goal", 17],
    ["At Goal", 2],
    ["Below Goal", 1],
    ["Target", 20]
  ]
}
```

## KPI Card Mapping
The API response is transformed into dashboard KPI cards:

| API Status | Card Label | Type | Display |
|-----------|-----------|------|---------|
| Above Goal | Above goal / target | above | 17 / 20 |
| At Goal | At goal / target | at | 2 / 20 |
| Below Goal | Below benchmark / critical | below | 1 |
| Target | Gaps closed (MTD) | teal | 20 |

## Implementation Details

### 1. Dashboard Component (`src/components/Dashboard.js`)
- Initial KPI state now reflects the actual API response values (17, 2, 1, 20)
- `loadKPIData()` function fetches data from the workflow API
- Falls back to mock data if no token or API error occurs
- Error message displayed to user if API fails

### 2. Workflow Service (`src/services/workflowService.js`)
- `fetchKPIData(appId, workflowId)` - Makes API call with Bearer token
- `transformKPIResponse(resultSet)` - Transforms API response to KPI format
  - Calculates total from non-Target entries (17 + 2 + 1 = 20)
  - Maps status names to display labels and styling
  - Preserves trend messages and card types

### 3. API Configuration
- **Base URL**: `https://dwihn-uat.lumenore.com/appsapi/appbuilder/workflow`
- **Method**: POST
- **Headers**: 
  - `authorization`: Bearer token from session storage
  - `application-id`: 4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d
  - `content-type`: application/json
- **Payload**:
  ```json
  {
    "workflowId": "28d510c9-3284-11f1-bc78-afc84e14c8e9",
    "data": { "appId": "4e5c9ea7-326e-11f1-bc78-7d4a64b19d8d" }
  }
  ```

## Data Flow
1. User logs in and provides access token
2. Token stored in session storage (`appAccessToken`)
3. Dashboard mounts and checks for token
4. If token exists, `loadKPIData()` is called
5. API response is fetched and transformed
6. KPI cards update with real data
7. If API fails, mock data is used as fallback

## Testing the Integration
1. Login with a valid access token
2. Dashboard will automatically fetch KPI data
3. KPI cards will display: 17/20, 2/20, 1, 20
4. Check browser console for any API errors
5. If API fails, error message appears above KPI cards

## Notes
- The "Target" field (20) represents total gaps closed and is displayed without a total denominator
- The other three cards show value/total format (e.g., "17 / 20")
- All trend messages are preserved from the transformation
- Card styling (colors) is determined by the `type` field (above, at, below, teal)
