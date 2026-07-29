import React, { useState } from 'react';
import './ProviderLogin.css';

// Provider-portal sign in — NPI + password instead of the staff email/password.
// Same shape as Login.js: `onSubmit(npi, password, remember)` may return a
// promise; a rejection shows the inline error banner. This is a separate
// bundle from the staff app (provider.html vs index.html), so the staff-portal
// link below is a real cross-app navigation, not an in-app route.
const ProviderLogin = ({ onSubmit, showErrorState = false }) => {
  const [npi, setNpi] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | loading | error

  const npiOk = /^\d{10}$/.test(npi);
  // No credential check — NPI/password are collected but not required to
  // submit, since there's no real provider-auth endpoint yet (see ProviderPortal.js).
  const canSubmit = status !== 'loading';
  const showError = showErrorState || status === 'error';
  const npiHint = npi.length === 0
    ? 'The National Provider Identifier for your practice.'
    : (npiOk ? '✓ Valid NPI format' : `${npi.length} of 10 digits`);

  const handleNpiChange = (e) => {
    setNpi(e.target.value.replace(/\D/g, '').slice(0, 10));
    setStatus('idle');
  };
  const handlePasswordChange = (e) => { setPassword(e.target.value); setStatus('idle'); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('loading');
    try {
      if (onSubmit) {
        await onSubmit(npi, password, remember);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        throw new Error('demo: no onSubmit handler wired up');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="provider-login-page">
      <div className="provider-login-hero">
        <div className="provider-login-hero-ring provider-login-hero-ring-outer" aria-hidden="true" />
        <div className="provider-login-hero-ring provider-login-hero-ring-inner" aria-hidden="true" />
        <div className="provider-login-hero-top">
          <div className="provider-login-hero-brand">
            <svg width="30" height="30" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect width="28" height="28" rx="8" fill="#fff" />
              <path d="M6 15 L9.5 15 L11.5 9 L14.5 19 L16.5 13 L22 13" stroke="#3f74c9" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="provider-login-hero-brand-text">QualityPulse</span>
          </div>
          <span className="provider-login-hero-badge mono">PROVIDER PORTAL</span>
        </div>
        <div className="provider-login-hero-copy">
          <div className="provider-login-hero-eyebrow mono">FOR NETWORK PROVIDERS</div>
          <h1 className="provider-login-hero-title">Your assigned interventions, ready when you are.</h1>
          <p className="provider-login-hero-sub">
            Review the care interventions DWIHN has assigned to your practice, document outreach, and close gaps for your members.
          </p>
          <div className="provider-login-hero-list">
            {[
              'See interventions assigned to your members',
              'Document outreach and completion status',
              'Track your measure performance over time',
            ].map((text) => (
              <div className="provider-login-hero-item" key={text}>
                <div className="provider-login-hero-check" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7.5 L5.5 10.5 L11.5 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="provider-login-form-pane">
        <form className="provider-login-form" onSubmit={handleSubmit} noValidate>
          <h2 className="provider-login-form-title">Provider sign in</h2>
          <p className="provider-login-form-sub">Sign in with your NPI and the credentials issued by DWIHN.</p>

          {showError && (
            <div className="provider-login-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="provider-login-error-icon">
                <circle cx="8" cy="8" r="7" stroke="#d9544d" strokeWidth="1.5" />
                <path d="M8 4.5 V8.8" stroke="#d9544d" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="11.4" r="0.9" fill="#d9544d" />
              </svg>
              <span>We couldn't verify those credentials. Check your NPI and password, then try again.</span>
            </div>
          )}

          <div className="provider-login-fields">
            <label className="provider-login-field">
              <span className="provider-login-field-label">NPI number</span>
              <input
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit NPI"
                value={npi}
                onChange={handleNpiChange}
                className="mono"
                autoComplete="off"
              />
              <span className="provider-login-field-hint">{npiHint}</span>
            </label>
            <label className="provider-login-field">
              <div className="provider-login-field-row">
                <span className="provider-login-field-label">Password</span>
                <a href="#!" onClick={(e) => e.preventDefault()}>Forgot password?</a>
              </div>
              <div className="provider-login-password-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="provider-login-password-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M1.5 9 C3.5 5.4 6 3.6 9 3.6 C12 3.6 14.5 5.4 16.5 9 C14.5 12.6 12 14.4 9 14.4 C6 14.4 3.5 12.6 1.5 9 Z" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="9" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </button>
              </div>
            </label>
          </div>

          <label className="provider-login-remember">
            <input type="checkbox" checked={remember} onChange={() => setRemember((v) => !v)} />
            <span>Keep me signed in on this device</span>
          </label>

          <button type="submit" className="provider-login-submit" disabled={!canSubmit}>
            {status === 'loading' ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="provider-login-footnote">
            New to the network? <a href="#!" onClick={(e) => e.preventDefault()}>Request provider access</a>
            <br />
            DWIHN staff? <a href="/">Sign in to the staff portal</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ProviderLogin;
