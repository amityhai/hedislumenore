/**
 * Token Service
 * Manages appAccessToken in session storage
 */

const TOKEN_KEY = 'appAccessToken';
const TOKEN_EXPIRY_KEY = 'appAccessTokenExpiry';

/**
 * Store token in session storage
 * @param {string} token - The appAccessToken
 * @param {number} expiryMinutes - Token expiry time in minutes (default: 15)
 */
export const setToken = (token, expiryMinutes = 15) => {
  try {
    if (!token) {
      return false;
    }

    // Store token
    sessionStorage.setItem(TOKEN_KEY, token);

    // Calculate and store expiry time
    const expiryTime = new Date().getTime() + (expiryMinutes * 60 * 1000);
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get token from session storage
 * @returns {string|null} The appAccessToken or null if not found/expired
 */
export const getToken = () => {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);

    if (!token) {
      return null;
    }

    // Check if token is expired
    if (expiry) {
      const expiryTime = parseInt(expiry, 10);
      const currentTime = new Date().getTime();

      if (currentTime > expiryTime) {
        clearToken();
        return null;
      }

      // Warn if token is expiring soon (within 1 minute)
      const timeUntilExpiry = expiryTime - currentTime;
      if (timeUntilExpiry < 60000) {
      }
    }

    return token;
  } catch (error) {
    return null;
  }
};

/**
 * Check if token exists and is valid
 * @returns {boolean} True if token exists and is not expired
 */
export const isTokenValid = () => {
  return getToken() !== null;
};

/**
 * Clear token from session storage
 */
export const clearToken = () => {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch (error) {
  }
};

/**
 * Refresh token (update expiry time)
 * @param {number} expiryMinutes - New expiry time in minutes (default: 15)
 * @returns {boolean} True if token was refreshed
 */
export const refreshToken = (expiryMinutes = 15) => {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);

    if (!token) {
      return false;
    }

    // Update expiry time
    const expiryTime = new Date().getTime() + (expiryMinutes * 60 * 1000);
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get token expiry time
 * @returns {Date|null} Token expiry date or null if not found
 */
export const getTokenExpiry = () => {
  try {
    const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);

    if (!expiry) {
      return null;
    }

    return new Date(parseInt(expiry, 10));
  } catch (error) {
    return null;
  }
};

/**
 * Get time remaining until token expires
 * @returns {number|null} Milliseconds until expiry or null if not found
 */
export const getTimeUntilExpiry = () => {
  try {
    const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);

    if (!expiry) {
      return null;
    }

    const expiryTime = parseInt(expiry, 10);
    const currentTime = new Date().getTime();
    const timeRemaining = expiryTime - currentTime;

    return timeRemaining > 0 ? timeRemaining : 0;
  } catch (error) {
    return null;
  }
};

/**
 * Get token info (for debugging)
 * @returns {object} Token information
 */
export const getTokenInfo = () => {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const expiry = getTokenExpiry();
    const timeRemaining = getTimeUntilExpiry();

    return {
      exists: !!token,
      isValid: isTokenValid(),
      expiryTime: expiry,
      timeRemainingMs: timeRemaining,
      timeRemainingMinutes: timeRemaining ? Math.floor(timeRemaining / 60000) : null,
      tokenPreview: token ? `${token.substring(0, 20)}...${token.substring(token.length - 20)}` : null
    };
  } catch (error) {
    return null;
  }
};

/**
 * Setup automatic token refresh
 * @param {number} refreshIntervalMinutes - Interval to refresh token (default: 14 minutes)
 * @returns {number} Interval ID for cleanup
 */
export const setupTokenRefreshInterval = (refreshIntervalMinutes = 14) => {
  const intervalId = setInterval(() => {
    if (isTokenValid()) {
      refreshToken(15); // Refresh for another 15 minutes
    } else {
      clearInterval(intervalId);
    }
  }, refreshIntervalMinutes * 60 * 1000);

  return intervalId;
};

export default {
  setToken,
  getToken,
  isTokenValid,
  clearToken,
  refreshToken,
  getTokenExpiry,
  getTimeUntilExpiry,
  getTokenInfo,
  setupTokenRefreshInterval
};
