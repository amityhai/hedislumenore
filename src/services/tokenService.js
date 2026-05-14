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
      console.warn('Token is empty');
      return false;
    }

    // Store token
    sessionStorage.setItem(TOKEN_KEY, token);

    // Calculate and store expiry time
    const expiryTime = new Date().getTime() + (expiryMinutes * 60 * 1000);
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

    console.log(`Token stored in session storage. Expires in ${expiryMinutes} minutes.`);
    return true;
  } catch (error) {
    console.error('Error storing token:', error);
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
      console.warn('No token found in session storage');
      return null;
    }

    // Check if token is expired
    if (expiry) {
      const expiryTime = parseInt(expiry, 10);
      const currentTime = new Date().getTime();

      if (currentTime > expiryTime) {
        console.warn('Token has expired');
        clearToken();
        return null;
      }

      // Warn if token is expiring soon (within 1 minute)
      const timeUntilExpiry = expiryTime - currentTime;
      if (timeUntilExpiry < 60000) {
        console.warn('Token expiring soon. Please refresh.');
      }
    }

    return token;
  } catch (error) {
    console.error('Error retrieving token:', error);
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
    console.log('Token cleared from session storage');
  } catch (error) {
    console.error('Error clearing token:', error);
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
      console.warn('No token to refresh');
      return false;
    }

    // Update expiry time
    const expiryTime = new Date().getTime() + (expiryMinutes * 60 * 1000);
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

    console.log(`Token refreshed. New expiry in ${expiryMinutes} minutes.`);
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
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
    console.error('Error getting token expiry:', error);
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
    console.error('Error calculating time until expiry:', error);
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
    console.error('Error getting token info:', error);
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
      console.log('Token auto-refreshed');
    } else {
      clearInterval(intervalId);
      console.log('Token invalid, stopping auto-refresh');
    }
  }, refreshIntervalMinutes * 60 * 1000);

  console.log(`Token auto-refresh setup. Will refresh every ${refreshIntervalMinutes} minutes.`);
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
