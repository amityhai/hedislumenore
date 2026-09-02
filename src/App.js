import React, { useState, useEffect, useRef, useCallback, Component } from 'react';
import './App.css';
import CareActionCenter from './components/CareActionCenter';
import ScorecardV2 from './components/v2/ScorecardV2';
import OutcomeAnalysis from './components/v2/OutcomeAnalysis';
import ProviderDirectory from './components/v2/ProviderDirectory';
import GoalDefinition from './components/v2/GoalDefinition';
import Login from './components/Login';
// Parked pages (see PAGES / NAV_ITEMS below):
// import TrackingBoard from './components/v2/TrackingBoard';
// import Dashboard from './components/Dashboard';
// import MeasureDetail from './components/MeasureDetail';
// import RateSimulator from './components/RateSimulator';
// import ProviderScores from './components/ProviderScores';
import { getCurrentMonthValue } from './components/MonthFilter';
import { setToken, getToken, isTokenValid, setupTokenRefreshInterval } from './services/tokenService';
import { setSelectedWorkflowMonth, fetchAvailableMonths } from './services/workflowService';
import { isStaffSignedIn, setStaffSignedIn, clearStaffSignedIn } from './services/staffSession';

// ── Hash routing ─────────────────────────────────────────────
// Lightweight, dependency-free routing so pages are deep-linkable and survive a
// refresh. Format: #/<page>[/<measureId>], e.g. #/detail/BCS_E.
// Only the two active flows are routable while the redesign focuses on them —
// the rest of the list is parked below; move entries back to re-enable.
const PAGES = ['v2', 'providers', 'goals', 'cac', 'outcome'];
// Parked: 'tracking', 'dashboard', 'detail', 'sim', 'prov'
const ALIASES = { rateSimulator: 'sim', providerScores: 'prov' };

// Breakpoints mirror App.css: below MOBILE_Q the sidebar is an overlay drawer;
// below RAIL_Q it collapses to an icon rail so content keeps its width.
const MOBILE_Q = '(max-width: 768px)';
const RAIL_Q = '(max-width: 1024px)';
const mq = (q) => (typeof window === 'undefined' ? { matches: false } : window.matchMedia(q));

// Sidebar navigation (single source of truth for the nav list).
const NAV_ITEMS = [
  { page: 'v2', label: 'Overview', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM7 19a2 2 0 1 1 0-4 2 2 0 0 1 0 4z' },
  { page: 'providers', label: 'Providers', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
  { page: 'goals', label: 'Measure Goals', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z' },
  { page: 'outcome', label: 'Outcome Analysis', icon: 'M4 20h16v2H2V4h2v16zm3-4h2v-6H7v6zm4 0h2V7h-2v9zm4 0h2v-3h-2v3z' },
  { page: 'cac', label: 'Care Action Center', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z' },
  // Parked while the redesign focuses on Overview + Care Action Center —
  // uncomment (and restore the page in PAGES above) to bring a tab back:
  // { page: 'tracking', label: 'Risk Tracking', icon: 'M3 12h4l2 6 4-14 2 8h6' },
  // { page: 'dashboard', label: 'Overview (classic)', icon: 'M3 13h2v8H3zm4-8h2v16H7zm4-2h2v18h-2zm4 4h2v14h-2zm4-4h2v18h-2z' },
  // { page: 'detail', label: 'Measure Detail', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54h2.5v2.71h2v-2.71h2.5l-2.75-3.54z' },
  // { page: 'sim', label: 'Rate Simulator', icon: 'M3 3h18v2H3zm2 4h14v2H5zm-2 4h18v2H3zm2 4h14v2H5zm-2 4h18v2H3z' },
  // { page: 'prov', label: 'Provider Scores', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
];

// Page-level error boundary — keeps one view's crash from blanking the whole app.
class ErrBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error('Page render error:', err, info); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 40, maxWidth: 560 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-text)', marginBottom: 8 }}>Something went wrong on this page.</h2>
          <p style={{ color: 'var(--c-text-3)', fontSize: 14, marginBottom: 16 }}>The rest of the app is still available — try another page from the sidebar.</p>
          <button type="button" className="btn btn-secondary" onClick={() => this.setState({ err: null })}>↻ Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const parseHash = () => {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [page, ...rest] = raw.split('/');
  return {
    page: PAGES.includes(page) ? page : 'v2',
    measure: decodeURIComponent(rest.join('/') || ''),
  };
};

function App() {
  // No real staff-auth endpoint exists yet (the API token below is a fixed
  // demo bearer token, not tied to this) — this gate is the same "no live
  // endpoint yet" treatment as the provider portal: any submitted credentials
  // succeed, but the app is genuinely inaccessible without going through it.
  const [staffAuthed, setStaffAuthed] = useState(isStaffSignedIn);
  const [route, setRoute] = useState(parseHash);
  const currentPage = route.page;
  // Used by the parked MeasureDetail page; kept so deep links survive re-enabling.
  // eslint-disable-next-line no-unused-vars
  const selectedMeasure = route.measure;
  // Start collapsed by default so the data-dense Overview gets the full width on
  // first paint; the user can expand the sidebar manually, and pages can request
  // it (see `requestSidebar`). Kept collapsed on rail/drawer layouts regardless.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => mq(MOBILE_Q).matches);

  // Track the mobile breakpoint and force the drawer shut on the way in, so a
  // desktop-open sidebar doesn't become a full-screen overlay on resize.
  useEffect(() => {
    const m = mq(MOBILE_Q);
    const onChange = (e) => {
      setIsMobile(e.matches);
      if (e.matches) setSidebarOpen(false);
    };
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);

  // Pages ask for the sidebar to collapse/expand (the v2 explorer wants the room).
  // Honour that on wide screens only — on a rail/drawer layout the page doesn't
  // get a say, otherwise landing on the Overview would pop the drawer open.
  const requestSidebar = useCallback((open) => {
    if (!mq(RAIL_Q).matches) setSidebarOpen(open);
  }, []);

  // Keep app state in sync with the URL (back/forward, manual edits, refresh).
  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  // Selected MonthFilter value (`YYYY-MM`) is owned here so it survives
  // page-to-page navigation (e.g. Dashboard → Deep Dive → MeasureDetail).
  // Each page receives it as a controlled prop and any MonthFilter changes
  // bubble back up via `setSelectedMonth`.
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  // List of months returned by the AVAILABLE_MONTHS workflow. Format:
  //   [{ value: "YYYY-MM", label: "Mon YYYY", monYear: "Mon-YYYY" }, ...]
  // Sorted most-recent first. Fetched once per token and passed down to every
  // MonthFilter via props so all of them stay in sync without duplicate calls.
  const [availableMonths, setAvailableMonths] = useState([]);

  // Sync the workflow service synchronously during render — this is the single
  // source of truth for the month that ends up in every workflow payload. Doing
  // it in App (the top of the tree) guarantees the service is updated before
  // any descendant's render-phase code or effects run.
  setSelectedWorkflowMonth(selectedMonth);
  const [token, setTokenState] = useState(() => {
    // Initialize token from tokenService or use default
    const storedToken = getToken();
    if (storedToken) {
      return storedToken;
    }
    // Fallback to default token if none stored
    return 'eyJhbGciOiJSUzI1NiJ9.eyJ0ZW5hbnRVdWlkIjoiZmViNTEyY2YtMTBmYi0xMWVmLTlhNzgtNGZjMmY1ZDVlYThmIiwidGVuYW50Um9sZSI6ImFkbWluIiwidGVuYW50TmFtZSI6ImJlaGF2aW9yYWxoZWFsdGgiLCJ0ZW5hbnRJZCI6MjcsInVzZXJVdWlkIjoiZmViMjA1OGUtMTBmYi0xMWVmLTlhNzgtZWIzNDc4MTU3NDA4IiwibmFtZSI6ImpvaG4iLCJzZXNzaW9uSWQiOiJjZmJlMDU1Zi1hZTAyLTRkMWEtYmRkNi1lODM2MWRjNTY4NjMiLCJ2YWxpZGl0eSI6OTYwLCJ1c2VyTmFtZSI6ImpvaG5kb2UiLCJ1c2VySWQiOjU4LCJlbWFpbCI6ImpvaG5kb2VAbHVtZW5vcmUuY29tIiwic3ViIjoiam9obmRvZUBsdW1lbm9yZS5jb20iLCJpYXQiOjE3NzU2Mjg0NzUsImV4cCI6MTc3NTYyOTQzNX0.ocCHU4M3a06D1rorlPVXwykmmN7r1EiXfp7bsPKTz_J7eFGhOPMOBH9_7rhxR0lXN6v7mayPjeMZJ3nMJ3hZjoEvut5FvgIDlVmGW8PB28MVO9j45temLZhIBBcd0bHyrMrY4CIt1dCX7Y4UWxQoPzaeSyTUehbTopgWwtreD9v1EjuqDOSbsHTVjgqhjFt3R4qlLpuqU9mq0g9bGrPu32wGv1f40m5AAeVRrLmW0rpfltpQGzB-C2XuV69xBrUAZW6HimxW26fR-epE6WfXrQetUrAoYn9x8nrqym-zuKjGCuf3-snZuHp7BQHr2CEFjIvwGiXFk9km4ZB41cBSlg';
  });
  const tokenRefreshIntervalRef = useRef(null);

  // Initialize token on app load
  useEffect(() => {
    // If no token in session storage, store the default one
    if (!isTokenValid()) {
      setToken(token, 15);
    }

    // Setup auto-refresh interval (every 14 minutes)
    tokenRefreshIntervalRef.current = setupTokenRefreshInterval(14);

    return () => {
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
      }
    };
  }, []);

  // Watch for token changes in session storage
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const storedToken = getToken();
      if (storedToken && storedToken !== token) {
        setTokenState(storedToken);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [token]);

  // Load the list of months that actually have data from the AVAILABLE_MONTHS
  // workflow, then snap the current selection to the most recent month from
  // that list if today's month isn't part of it. This makes sure the dropdown
  // shows real options and the first round of workflow calls hits a month the
  // backend has data for.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchAvailableMonths(token)
      .then((months) => {
        if (cancelled || !months || months.length === 0) return;
        setAvailableMonths(months);
        const isCurrentInList = months.some((m) => m.value === selectedMonth);
        if (!isCurrentInList) {
          setSelectedMonth(months[0].value); // already sorted most-recent-first
        }
      })
      .catch(() => {
        // Swallow: the MonthFilter falls back to a generated 12-month list.
      });
    return () => { cancelled = true; };
    // We intentionally do not depend on `selectedMonth` — we only snap on the
    // initial load (or when the token changes). User-driven changes after that
    // should not be overridden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleNavigate = (page, measure = null) => {
    const aliased = ALIASES[page] || page;
    const p = PAGES.includes(aliased) ? aliased : 'v2';
    const hash = measure ? `#/${p}/${encodeURIComponent(measure)}` : `#/${p}`;
    if (isMobile) setSidebarOpen(false); // tapping a nav item dismisses the drawer
    if (window.location.hash !== hash) {
      window.location.hash = hash; // hashchange listener updates route state
    } else {
      setRoute({ page: p, measure: measure || '' });
    }
  };

  const handleBack = () => handleNavigate('v2');

  // Function to update token (can be called from anywhere)
  const updateToken = (newToken) => {
    setToken(newToken, 15); // Store with 15-minute expiry
    setTokenState(newToken);
  };

  const handleStaffLogin = async () => {
    setStaffSignedIn();
    setStaffAuthed(true);
  };

  const handleSignOut = () => {
    clearStaffSignedIn();
    setStaffAuthed(false);
  };

  // The provider portal is a fully separate bundle (provider.html →
  // src/ProviderApp.js) — reached by a real cross-app link, not a route in
  // here. This gate only ever shows the staff login.
  if (!staffAuthed) {
    return <Login onSubmit={handleStaffLogin} />;
  }

  return (
    <div className="app">
      {isMobile && !sidebarOpen && (
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}
      {isMobile && sidebarOpen && (
        <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <svg className="logo-icon" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="QualityPulse">
              <rect width="28" height="28" rx="8" fill="#7562e8" />
              <path d="M6 15 L9.5 15 L11.5 9 L14.5 19 L16.5 13 L22 13" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="logo-text">QualityPulse</span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            title={sidebarOpen ? 'Collapse' : 'Expand'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
        <nav className="nav-menu">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.page}
              type="button"
              className={`nav-item ${currentPage === item.page ? 'active' : ''}`}
              onClick={() => handleNavigate(item.page)}
              title={item.label}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                <path d={item.icon} />
              </svg>
              <span className="nav-item-text">{item.label}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="sidebar-signout" onClick={handleSignOut} title="Sign out">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="sidebar-signout-text">Sign out</span>
        </button>
      </aside>

      <main className={`main-content ${sidebarOpen ? '' : 'main-content-expanded'}`}>
        <div className="content">
          <ErrBoundary>
          {currentPage === 'v2' && <ScorecardV2 token={token} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} availableMonths={availableMonths} onSidebar={requestSidebar} />}
          {currentPage === 'providers' && <ProviderDirectory token={token} selectedMonth={selectedMonth} onSidebar={requestSidebar} />}
          {currentPage === 'goals' && <GoalDefinition token={token} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} availableMonths={availableMonths} />}
          {currentPage === 'outcome' && <OutcomeAnalysis />}
          {currentPage === 'cac' && <CareActionCenter onBack={handleBack} token={token} />}
          {/* Parked pages — restore alongside their PAGES / NAV_ITEMS entries:
          {currentPage === 'tracking' && <TrackingBoard />}
          {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} token={token} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} availableMonths={availableMonths} />}
          {currentPage === 'detail' && <MeasureDetail measureId={selectedMeasure} onBack={handleBack} onNavigate={handleNavigate} token={token} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} availableMonths={availableMonths} />}
          {currentPage === 'sim' && <RateSimulator onBack={handleBack} token={token} />}
          {currentPage === 'prov' && <ProviderScores onBack={handleBack} token={token} />}
          */}
          </ErrBoundary>
        </div>
      </main>
    </div>
  );
}

export default App;
