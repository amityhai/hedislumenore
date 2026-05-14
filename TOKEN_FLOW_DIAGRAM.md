# Token Management Flow Diagram

## Application Startup Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    App Loads (App.js)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │ Check Session Storage for      │
        │ appAccessToken                 │
        └────────────┬───────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    ┌─────────┐          ┌──────────────┐
    │ Found   │          │ Not Found    │
    │ Valid   │          │              │
    └────┬────┘          └────┬─────────┘
         │                    │
         │                    ▼
         │            ┌──────────────────┐
         │            │ Store Default    │
         │            │ Token (15 min)   │
         │            └────┬─────────────┘
         │                 │
         └────────┬────────┘
                  │
                  ▼
        ┌─────────────────────────┐
        │ Setup Auto-Refresh      │
        │ Interval (14 minutes)   │
        └────────┬────────────────┘
                 │
                 ▼
        ┌─────────────────────────┐
        │ Pass Token to All       │
        │ Components via Props    │
        └─────────────────────────┘
```

## Token Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                    Token Lifecycle (15 min)                      │
└──────────────────────────────────────────────────────────────────┘

Time:    0 min          5 min          10 min         14 min        15 min
         │              │              │              │             │
         ▼              ▼              ▼              ▼             ▼
    ┌────────┐      ┌────────┐    ┌────────┐   ┌──────────┐   ┌────────┐
    │ Token  │      │ Token  │    │ Token  │   │ AUTO     │   │ Token  │
    │ Stored │      │ Valid  │    │ Valid  │   │ REFRESH  │   │ Expires│
    │ 15 min │      │ 10 min │    │ 5 min  │   │ Triggered   │ Cleared│
    │ expiry │      │ left   │    │ left   │   │ 15 min   │   │        │
    └────────┘      └────────┘    └────────┘   │ expiry   │   └────────┘
                                                │ set      │
                                                └──────────┘
```

## Token Update Flow

```
┌─────────────────────────────────────────────────────────────┐
│         External Source Provides New Token                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │ Call updateToken(newToken)     │
        │ in App.js                      │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │ Store in Session Storage:      │
        │ - appAccessToken               │
        │ - appAccessTokenExpiry         │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │ Update React State             │
        │ (setTokenState)                │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │ Re-render All Components       │
        │ with New Token                 │
        └────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────────────┐
        │ Components Use New Token       │
        │ in API Calls                   │
        └────────────────────────────────┘
```

## Component Token Usage

```
┌──────────────────────────────────────────────────────────────┐
│                      App.js                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ State: token                                           │  │
│  │ Function: updateToken(newToken)                        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────────┐   ┌──────────────┐   ┌──────────────┐
    │ Dashboard   │   │ MeasureDetail│   │ CareAction   │
    │ token={...} │   │ token={...}  │   │ token={...}  │
    └─────────────┘   └──────────────┘   └──────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────────────────────────────────────────────────┐
    │ Use token in API calls:                             │
    │ fetch(url, {                                        │
    │   headers: { 'authorization': `Bearer ${token}` }   │
    │ })                                                  │
    └─────────────────────────────────────────────────────┘
```

## Session Storage Structure

```
┌─────────────────────────────────────────────────────────────┐
│              Browser Session Storage                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Key: appAccessToken                                       │
│  Value: eyJhbGciOiJSUzI1NiJ9.eyJ0ZW5hbnRVdWlkIjoiZmViNTEy... │
│                                                             │
│  Key: appAccessTokenExpiry                                 │
│  Value: 1775629435000  (timestamp in milliseconds)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Auto-Refresh Mechanism

```
┌──────────────────────────────────────────────────────────────┐
│         setupTokenRefreshInterval(14 minutes)               │
└────────────────────────┬─────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
    Every 14 minutes                     │
         │                               │
         ▼                               ▼
    ┌─────────────┐              ┌──────────────┐
    │ Check if    │              │ If Valid:    │
    │ Token Valid │              │ Refresh for  │
    │             │              │ 15 more min  │
    └─────────────┘              └──────────────┘
         │                               │
         ▼                               ▼
    ┌─────────────┐              ┌──────────────┐
    │ If Invalid: │              │ Update       │
    │ Stop        │              │ Expiry Time  │
    │ Refresh     │              │ in Storage   │
    └─────────────┘              └──────────────┘
```

## Error Handling

```
┌──────────────────────────────────────────────────────────────┐
│                    Token Validation                          │
└────────────────────────┬─────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
    ┌─────────────┐              ┌──────────────┐
    │ Token       │              │ Token        │
    │ Exists?     │              │ Expired?     │
    └──────┬──────┘              └──────┬───────┘
           │                            │
      No   │   Yes                 Yes  │   No
           │                            │
           ▼                            ▼
    ┌─────────────┐              ┌──────────────┐
    │ Return null │              │ Return token │
    │ (no token)  │              │ (valid)      │
    └─────────────┘              └──────────────┘
           │                            │
           └────────────┬───────────────┘
                        │
                        ▼
                ┌──────────────────┐
                │ Use in API calls │
                │ or show error    │
                └──────────────────┘
```

## Summary

1. **App Loads** → Check session storage for token
2. **No Token** → Store default token (15 min expiry)
3. **Setup Auto-Refresh** → Every 14 minutes
4. **Pass to Components** → Via props
5. **Use in API Calls** → Authorization header
6. **New Token Arrives** → Call updateToken()
7. **Repeat** → Auto-refresh continues

All automatic. Just call `updateToken(newToken)` when needed.
