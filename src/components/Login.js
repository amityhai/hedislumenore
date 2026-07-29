import React, { useState } from 'react';
import './Login.css';

// Sign-in screen. `onSubmit(email, password, remember)` is called on submit and
// may return a promise; a rejection (or thrown error) shows the inline error
// banner. Without an `onSubmit`, submitting just demos the error state so the
// screen is usable standalone before it's wired to real auth.
const Login = ({ onSubmit, ssoEnabled = true, showErrorState = false }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | loading | error

  // No credential check — email/password are collected but not required to
  // submit, since there's no real staff-auth endpoint yet (see App.js).
  const canSubmit = status !== 'loading';
  const showError = showErrorState || status === 'error';

  const handleEmailChange = (e) => { setEmail(e.target.value); setStatus('idle'); };
  const handlePasswordChange = (e) => { setPassword(e.target.value); setStatus('idle'); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus('loading');
    try {
      if (onSubmit) {
        await onSubmit(email, password, remember);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        throw new Error('demo: no onSubmit handler wired up');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-ring login-hero-ring-outer" aria-hidden="true" />
        <div className="login-hero-ring login-hero-ring-inner" aria-hidden="true" />
        <div className="login-hero-brand">
          <svg width="30" height="30" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect width="28" height="28" rx="8" fill="#fff" />
            <path d="M6 15 L9.5 15 L11.5 9 L14.5 19 L16.5 13 L22 13" stroke="#0e8a8c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="login-hero-brand-text">QualityPulse</span>
        </div>
        <div className="login-hero-copy">
          <div className="login-hero-eyebrow mono">HEDIS QUALITY MANAGEMENT</div>
          <h1 className="login-hero-title">Every measure, every member, one command center.</h1>
          <p className="login-hero-sub">
            Track HEDIS measure performance, close care gaps, and coordinate outreach across your population — all in one place.
          </p>
          <div className="login-hero-stats">
            <div className="login-hero-stat">
              <div className="login-hero-stat-value">18</div>
              <div className="login-hero-stat-label">Measures tracked</div>
            </div>
            <div className="login-hero-stat">
              <div className="login-hero-stat-value">42k</div>
              <div className="login-hero-stat-label">Members monitored</div>
            </div>
            <div className="login-hero-stat">
              <div className="login-hero-stat-value">MY2026</div>
              <div className="login-hero-stat-label">Reporting period</div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-form-pane">
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <h2 className="login-form-title">Sign in</h2>
          <p className="login-form-sub">Use your organization credentials to continue.</p>

          {showError && (
            <div className="login-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="login-error-icon">
                <circle cx="8" cy="8" r="7" stroke="#d9544d" strokeWidth="1.5" />
                <path d="M8 4.5 V8.8" stroke="#d9544d" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="11.4" r="0.9" fill="#d9544d" />
              </svg>
              <span>We couldn't sign you in. Check your email and password, then try again.</span>
            </div>
          )}

          <div className="login-fields">
            <label className="login-field">
              <span className="login-field-label">Work email</span>
              <input
                type="email"
                placeholder="you@organization.org"
                value={email}
                onChange={handleEmailChange}
                autoComplete="username"
              />
            </label>
            <label className="login-field">
              <div className="login-field-row">
                <span className="login-field-label">Password</span>
                <a href="#!" onClick={(e) => e.preventDefault()}>Forgot password?</a>
              </div>
              <div className="login-password-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
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

          <label className="login-remember">
            <input type="checkbox" checked={remember} onChange={() => setRemember((v) => !v)} />
            <span>Keep me signed in on this device</span>
          </label>

          <button type="submit" className="login-submit" disabled={!canSubmit}>
            {status === 'loading' ? 'Signing in…' : 'Sign in'}
          </button>

          {ssoEnabled && (
            <>
              <div className="login-divider">
                <span className="login-divider-line" />
                <span className="login-divider-label">or</span>
                <span className="login-divider-line" />
              </div>
              <button type="button" className="login-sso">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" fill="#0e8a8c" />
                  <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" fill="#5eb0b1" />
                  <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" fill="#5eb0b1" />
                  <rect x="9" y="9" width="5.5" height="5.5" rx="1" fill="#b8d9d9" />
                </svg>
                Continue with single sign-on
              </button>
            </>
          )}

          <p className="login-footnote">
            Access is limited to authorized quality-management staff.
            <br />
            Need an account? <a href="#!" onClick={(e) => e.preventDefault()}>Contact your administrator</a>
            <br />
            Network provider? <a href="/provider.html">Sign in to the provider portal</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
