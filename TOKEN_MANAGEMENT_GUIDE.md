# Token Management Guide

## Overview
The application now uses a centralized token management system via `tokenService.js`. Tokens are stored in session storage with automatic expiry and refresh capabilities.

## How It Works

### 1. Token Storage
- Tokens are stored in session storage under the key `appAccessToken`
- Token expiry time is stored under `appAccessTokenExpiry`
- Default expiry: 15 minutes
- Auto-refresh interval: Every 14 minutes

### 2. App Initialization
When the app loads (`src/App.js`):
1. Checks if a valid token exists in session storage
2. If not, stores the default token with 15-minute expiry
3. Sets up auto-refresh interval (every 14 minutes)
4. Monitors session storage for token changes

### 3. Token Lifecycle

**Initial Load:**
```javascript
// App.js initializes token on mount
useEffect(() => {
  if (!isTokenValid()) {
    setToken(token, 15); // Store with 15-minute expiry
  }
  tokenRefreshIntervalRef.current = setupTokenRefreshInterval(14);
}, []);
```

**Auto-Refresh:**
- Every 14 minutes, the token is automatically refreshed for another 15 minutes
- This prevents token expiration during active use

**Manual Update:**
```javascript
// Call this function to update token from external source
updateToken(newToken);
```

## Using Token Service in Components

### Import Functions
```javascript
import { 
  setToken, 
  getToken, 
  isTokenValid, 
  clearToken, 
  refreshToken,
  getTokenInfo 
} from './services/tokenService';
```

### Common Operations

**Get Current Token:**
```javascript
const token = getToken(); // Returns token or null if expired
```

**Check Token Validity:**
```javascript
if (isTokenValid()) {
  // Token exists and is not expired
}
```

**Get Token Info (for debugging):**
```javascript
const info = getTokenInfo();
console.log(info);
// Output:
// {
//   exists: true,
//   isValid: true,
//   expiryTime: Date,
//   timeRemainingMs: 840000,
//   timeRemainingMinutes: 14,
//   tokenPreview: "eyJhbGciOiJSUzI1NiJ9...cBSlg"
// }
```

**Clear Token:**
```javascript
clearToken(); // Removes token from session storage
```

## Receiving New Token from External Source

When you receive a new `appAccessToken` from an external source (e.g., API response):

```javascript
// In App.js or any component with access to updateToken
const newToken = 'eyJhbGciOiJSUzI1NiJ9...'; // Token from external source
updateToken(newToken); // Stores in session storage with 15-min expiry
```

## Token Expiry Behavior

- **Token expires in 1 minute:** Console warning logged
- **Token expires:** Automatically cleared from session storage
- **getToken() called on expired token:** Returns null
- **Auto-refresh:** Prevents expiration during active use

## Session Storage Keys

| Key | Purpose | Example |
|-----|---------|---------|
| `appAccessToken` | Stores the JWT token | `eyJhbGciOiJSUzI1NiJ9...` |
| `appAccessTokenExpiry` | Stores expiry timestamp | `1775629435000` |

## Debugging

Check token status in browser console:
```javascript
// In browser console
import { getTokenInfo } from './services/tokenService';
getTokenInfo();
```

Or check session storage directly:
```javascript
// In browser console
sessionStorage.getItem('appAccessToken');
sessionStorage.getItem('appAccessTokenExpiry');
```

## Integration with Components

All components receive the token via props:
```javascript
// In App.js
<Dashboard token={token} />
<MeasureDetail token={token} />
<CareActionCenter token={token} />
<RateSimulator token={token} />
<ProviderScores token={token} />
```

Use token in components:
```javascript
// In any component
function MyComponent({ token }) {
  useEffect(() => {
    // Use token in API calls
    fetch(url, {
      headers: {
        'authorization': `Bearer ${token}`
      }
    });
  }, [token]);
}
```

## Key Features

✅ Automatic token expiry validation
✅ Auto-refresh every 14 minutes (prevents expiration)
✅ Session storage persistence
✅ Expiry warnings (1 minute before expiry)
✅ Easy token updates from external sources
✅ Debug utilities for token inspection
✅ Centralized token management
