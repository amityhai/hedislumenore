import React, { useEffect, useState } from 'react';
import './ProviderShell.css';

const NAV = [
  { key: 'home', label: 'Home', icon: 'M12 3 L2 12 h3 v8 h6 v-6 h2 v6 h6 v-8 h3 Z' },
  { key: 'interventions', label: 'Interventions', icon: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z' },
  { key: 'performance', label: 'Performance', icon: 'M4 20h16v2H2V4h2v16zm3-4h2v-6H7v6zm4 0h2V7h-2v9zm4 0h2v-3h-2v3z' },
];

const MOBILE_Q = '(max-width: 768px)';
const mq = (q) => (typeof window === 'undefined' ? { matches: false } : window.matchMedia(q));

// Left-sidebar shell for the provider portal — mirrors the staff app's
// sidebar shape (App.js) so the two audiences share the same navigation
// pattern; only the theme color and nav items differ.
const ProviderShell = ({ identity, active, onNavigate, onSignOut, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => mq(MOBILE_Q).matches);

  useEffect(() => {
    const m = mq(MOBILE_Q);
    const onChange = (e) => {
      setIsMobile(e.matches);
      if (e.matches) setSidebarOpen(false);
    };
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);

  const navigate = (key) => {
    onNavigate(key);
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <div className="provider-portal">
      {isMobile && !sidebarOpen && (
        <button type="button" className="pv-mobile-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}
      {isMobile && sidebarOpen && (
        <div className="pv-sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <aside className={`pv-sidebar ${sidebarOpen ? 'pv-sidebar-open' : 'pv-sidebar-closed'}`}>
        <div className="pv-sidebar-header">
          <div className="pv-brand">
            <svg className="pv-brand-icon" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="QualityPulse">
              <rect width="28" height="28" rx="8" fill="var(--pv-primary)" />
              <path d="M6 15 L9.5 15 L11.5 9 L14.5 19 L16.5 13 L22 13" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="pv-brand-text">QualityPulse</span>
          </div>
          <button
            className="pv-sidebar-toggle"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            title={sidebarOpen ? 'Collapse' : 'Expand'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        <div className="pv-sidebar-badge-wrap"><span className="pv-badge">PROVIDER PORTAL</span></div>

        <nav className="pv-nav-menu">
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`pv-nav-item ${active === item.key ? 'active' : ''}`}
              onClick={() => navigate(item.key)}
              title={item.label}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                <path d={item.icon} />
              </svg>
              <span className="pv-nav-item-text">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="pv-sidebar-identity">
          <div className="pv-identity-name">{identity.providerName}</div>
          <div className="pv-identity-meta">NPI {identity.npi || '—'}</div>
        </div>
        <button type="button" className="pv-signout" onClick={onSignOut} title="Sign out">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="pv-signout-text">Sign out</span>
        </button>
      </aside>

      <main className={`pv-main-content ${sidebarOpen ? '' : 'pv-main-content-expanded'}`}>
        <div className="pv-content">{children}</div>
      </main>
    </div>
  );
};

export default ProviderShell;
