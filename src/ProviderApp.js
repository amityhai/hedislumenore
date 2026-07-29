import React, { useEffect, useState } from 'react';
import ProviderPortal from './components/provider/ProviderPortal';

// Standalone entry point for the provider bundle (provider.html) — its own
// tiny hash router, independent of the staff app's PAGES/App.js. Routes:
// #/login, #/home, #/interventions, #/performance (default: #/home).
const PAGES = ['login', 'home', 'interventions', 'performance'];

const parseHash = () => {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return PAGES.includes(raw) ? raw : (raw === '' ? 'home' : 'login');
};

const ProviderApp = () => {
  const [page, setPage] = useState(parseHash);

  useEffect(() => {
    const onHashChange = () => setPage(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (next) => {
    const p = PAGES.includes(next) ? next : 'home';
    const hash = `#/${p}`;
    if (window.location.hash !== hash) window.location.hash = hash;
    else setPage(p);
  };

  return <ProviderPortal page={page} onNavigate={navigate} />;
};

export default ProviderApp;
