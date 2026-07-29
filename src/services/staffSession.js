/**
 * Staff sign-in gate — separate from tokenService's appAccessToken (the API
 * bearer token, auto-provisioned today). This just tracks whether the staff
 * user has passed the Login screen this session, mirroring providerData's
 * session pattern on the provider side.
 */
const STAFF_SIGNIN_KEY = 'qp_staff_signedin';

export const isStaffSignedIn = () => {
  try { return sessionStorage.getItem(STAFF_SIGNIN_KEY) === '1'; } catch { return false; }
};

export const setStaffSignedIn = () => {
  try { sessionStorage.setItem(STAFF_SIGNIN_KEY, '1'); } catch { /* storage off */ }
};

export const clearStaffSignedIn = () => {
  try { sessionStorage.removeItem(STAFF_SIGNIN_KEY); } catch { /* storage off */ }
};
