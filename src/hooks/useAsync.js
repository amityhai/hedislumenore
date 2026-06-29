import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Standardizes the four async states (loading / data / error / refetch) so
 * every page can render skeletons, empty states, and a Retry button the same
 * way. Re-runs whenever `deps` change. Set `{ enabled: false }` to defer.
 *
 *   const { data, loading, error, refetch } = useAsync(
 *     () => fetchDashboardKPI(token), [token, month], { enabled: !!token }
 *   );
 */
export function useAsync(asyncFn, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null });
  const fnRef = useRef(asyncFn);
  fnRef.current = asyncFn;
  const cancelRef = useRef(null);

  const run = useCallback(() => {
    if (cancelRef.current) cancelRef.current.cancelled = true;
    const token = { cancelled: false };
    cancelRef.current = token;

    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(() => fnRef.current())
      .then((data) => { if (!token.cancelled) setState({ data, loading: false, error: null }); })
      .catch((error) => { if (!token.cancelled) setState({ data: null, loading: false, error }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!enabled) { setState((s) => ({ ...s, loading: false })); return undefined; }
    run();
    return () => { if (cancelRef.current) cancelRef.current.cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run]);

  return { ...state, refetch: run };
}

export default useAsync;
