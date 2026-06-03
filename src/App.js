import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import MeasureDetail from './components/MeasureDetail';
import CareActionCenter from './components/CareActionCenter';
import RateSimulator from './components/RateSimulator';
import ProviderScores from './components/ProviderScores';
import logoImage from './assets/logo.png';
import { getCurrentMonthValue } from './components/MonthFilter';
import { setToken, getToken, isTokenValid, setupTokenRefreshInterval } from './services/tokenService';
import { setSelectedWorkflowMonth, fetchAvailableMonths } from './services/workflowService';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedMeasure, setSelectedMeasure] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
    setCurrentPage(page);
    if (measure) setSelectedMeasure(measure);
  };

  const handleBack = () => {
    setCurrentPage('dashboard');
  };

  // Function to update token (can be called from anywhere)
  const updateToken = (newToken) => {
    setToken(newToken, 15); // Store with 15-minute expiry
    setTokenState(newToken);
  };

  return (
    <div className="app">
      <aside 
        className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{ cursor: 'pointer' }}
      >
        <div className="sidebar-header">
          <div className="logo">
            <img src={logoImage} alt="QualityPulse Logo" className="logo-icon" />
            <span className="logo-text">QualityPulse</span>
          </div>
        </div>
        <nav className="nav-menu">
          <div
            className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleNavigate('dashboard');
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M3 13h2v8H3zm4-8h2v16H7zm4-2h2v18h-2zm4 4h2v14h-2zm4-4h2v18h-2z"/>
            </svg>
            <span className="nav-item-text">Overview</span>
          </div>
          <div
            className={`nav-item ${currentPage === 'detail' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleNavigate('detail');
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54h2.5v2.71h2v-2.71h2.5l-2.75-3.54z"/>
            </svg>
            <span className="nav-item-text">Measure Detail</span>
          </div>
          <div
            className={`nav-item ${currentPage === 'cac' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleNavigate('cac');
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
            </svg>
            <span className="nav-item-text">Care Action Center</span>
          </div>
        </nav>
      </aside>

      <main className={`main-content ${sidebarOpen ? '' : 'main-content-expanded'}`}>
        <div className="content">
          {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} token={token} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} availableMonths={availableMonths} />}
          {currentPage === 'detail' && <MeasureDetail measureId={selectedMeasure} onBack={handleBack} onNavigate={handleNavigate} token={token} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} availableMonths={availableMonths} />}
          {currentPage === 'cac' && <CareActionCenter onBack={handleBack} token={token} />}
          {currentPage === 'sim' && <RateSimulator onBack={handleBack} token={token} />}
          {currentPage === 'prov' && <ProviderScores onBack={handleBack} token={token} />}
        </div>
      </main>
    </div>
  );
}

export default App;
