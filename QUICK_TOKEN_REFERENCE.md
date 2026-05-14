# Quick Token Reference

## 🎯 One-Minute Overview

Your app now has automatic token management. Tokens are stored in session storage and auto-refresh every 14 minutes.

## 📝 When You Get a New Token

```javascript
// In App.js or any component
updateToken(newToken);
```

That's it. The token will be:
- Stored in session storage
- Used in all API calls
- Auto-refreshed every 14 minutes
- Validated before use

## 🔍 Check Token Status

```javascript
// In browser console
getTokenInfo();
```

Returns:
```javascript
{
  exists: true,
  isValid: true,
  expiryTime: Date,
  timeRemainingMs: 840000,
  timeRemainingMinutes: 14,
  tokenPreview: "eyJhbGciOiJSUzI1NiJ9...cBSlg"
}
```

## 📦 Session Storage Keys

- `appAccessToken` - The JWT token
- `appAccessTokenExpiry` - When it expires (timestamp in ms)

## ⏱️ Token Timeline

- **Stored**: 15 minutes expiry
- **Auto-refresh**: Every 14 minutes
- **Expires**: Automatically cleared from storage
- **Warning**: Console warning 1 minute before expiry

## 🔗 Using Token in Components

```javascript
function MyComponent({ token }) {
  useEffect(() => {
    fetch(url, {
      headers: {
        'authorization': `Bearer ${token}`
      }
    });
  }, [token]);
}
```

## 📂 Files

- `src/services/tokenService.js` - Token management
- `src/App.js` - Token initialization & distribution
- `TOKEN_MANAGEMENT_GUIDE.md` - Full documentation
- `TOKEN_INTEGRATION_COMPLETE.md` - Integration details

## ✅ What's Working

✅ Token stored in session storage
✅ Auto-refresh every 14 minutes
✅ Expiry validation
✅ All components receive token
✅ Easy token updates
✅ Debug utilities

## 🚀 Ready to Use

The system is fully integrated and ready. Just call `updateToken(newToken)` when you receive a new token from your backend.
