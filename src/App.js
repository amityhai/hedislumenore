import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import MeasureDetail from './components/MeasureDetail';
import CareActionCenter from './components/CareActionCenter';
import RateSimulator from './components/RateSimulator';
import ProviderScores from './components/ProviderScores';
import { setToken, getToken, isTokenValid, setupTokenRefreshInterval } from './services/tokenService';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedMeasure, setSelectedMeasure] = useState('');
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
      console.log('Default token stored in session storage');
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
        console.log('Token updated from session storage');
      }
    }, 1000);

    return () => clearInterval(checkInterval);
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
    console.log('Token updated in session storage');
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">QualityPulse</div>
        <nav className="nav-menu">
          <div
            className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavigate('dashboard')}
          >
            Dashboard
          </div>
          <div
            className={`nav-item ${currentPage === 'detail' ? 'active' : ''}`}
            onClick={() => handleNavigate('detail')}
          >
            Measure detail
          </div>
          <div
            className={`nav-item ${currentPage === 'cac' ? 'active' : ''}`}
            onClick={() => handleNavigate('cac')}
          >
            Care Action Center
          </div>
          <div
            className={`nav-item ${currentPage === 'sim' ? 'active' : ''}`}
            onClick={() => handleNavigate('sim')}
          >
            Rate Simulator
          </div>
          <div
            className={`nav-item ${currentPage === 'prov' ? 'active' : ''}`}
            onClick={() => handleNavigate('prov')}
          >
            Provider scores
          </div>
        </nav>
        <div className="user-profile">
          <div className="user-avatar">JM</div>
          <div>
            <div className="user-name">Jennifer Martin</div>
            <div className="user-role">Quality Director</div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="content">
          {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} token={token} />}
          {currentPage === 'detail' && <MeasureDetail measureId={selectedMeasure} onBack={handleBack} onNavigate={handleNavigate} token={token} />}
          {currentPage === 'cac' && <CareActionCenter onBack={handleBack} token={token} />}
          {currentPage === 'sim' && <RateSimulator onBack={handleBack} token={token} />}
          {currentPage === 'prov' && <ProviderScores onBack={handleBack} token={token} />}
        </div>
      </main>
    </div>
  );
}

export default App;
