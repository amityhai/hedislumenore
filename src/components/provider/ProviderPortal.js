import React, { useEffect, useState } from 'react';
import ProviderLogin from '../ProviderLogin';
import ProviderShell from './ProviderShell';
import ProviderHome from './ProviderHome';
import ProviderInterventions from './ProviderInterventions';
import ProviderPerformance from './ProviderPerformance';
import ProviderInterventionDrawer from './ProviderInterventionDrawer';
import { getProviderSession, setProviderSession, clearProviderSession, resolveProviderIdentity, seedDemoInterventions } from '../../data/providerData';

const SUBPAGES = ['home', 'interventions', 'performance'];

// Top-level controller for the provider portal (mounted by src/ProviderApp.js,
// the provider.html bundle's own entry — a separate build from the staff app,
// so this never has staff nav/data in scope). Gates on a provider session,
// separate from the staff app's token, then renders the shell + page the
// route points at. `page` is one of 'login' | 'home' | 'interventions' |
// 'performance'; `onNavigate(page)` updates the URL.
const ProviderPortal = ({ page, onNavigate }) => {
  const [session, setSession] = useState(getProviderSession);
  const [selected, setSelected] = useState(null);

  // Land unauthenticated visits on the login screen.
  useEffect(() => {
    if (page !== 'login' && !session) {
      onNavigate('login');
    }
  }, [page, session, onNavigate]);

  // Re-check the seed on every session (not just a fresh login) — a session
  // restored from sessionStorage on reload skips handleSubmit entirely, and
  // seedDemoInterventions is also how stale pre-member-level demo data gets
  // migrated, so a returning session needs this too, not just a new one.
  useEffect(() => {
    if (session) seedDemoInterventions(session.providerName);
  }, [session]);

  const handleSubmit = async (npi) => {
    // No provider-auth endpoint exists yet — any well-formed NPI + non-empty
    // password succeeds, matching how the rest of this build's data layer
    // treats "no live endpoint" (deterministic sample data, not a hard block).
    const identity = resolveProviderIdentity(npi);
    setProviderSession(identity);
    setSession(identity);
    onNavigate('home');
  };

  const handleSignOut = () => {
    clearProviderSession();
    setSession(null);
    setSelected(null);
    onNavigate('login');
  };

  if (page === 'login' || !session) {
    return <ProviderLogin onSubmit={handleSubmit} />;
  }

  const active = SUBPAGES.includes(page) ? page : 'home';

  return (
    <ProviderShell
      identity={session}
      active={active}
      onNavigate={onNavigate}
      onSignOut={handleSignOut}
    >
      {active === 'home' && (
        <ProviderHome identity={session} onNavigate={onNavigate} onOpenIntervention={setSelected} />
      )}
      {active === 'interventions' && (
        <ProviderInterventions identity={session} onOpenIntervention={setSelected} />
      )}
      {active === 'performance' && <ProviderPerformance identity={session} />}

      <ProviderInterventionDrawer
        assignment={selected}
        providerName={session.providerName}
        onClose={() => setSelected(null)}
      />
    </ProviderShell>
  );
};

export default ProviderPortal;
