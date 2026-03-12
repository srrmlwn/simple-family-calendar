import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleIcon = () => (
  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const Login: React.FC = () => {
  const { loginWithGoogle, loading } = useAuth();
  const location = useLocation();
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { error?: string; message?: string; info?: string } | null;
    if (state?.info) {
      setInfoMessage(state.info);
      window.history.replaceState({}, document.title);
      return;
    }
    if (state?.error) {
      setError({ title: state.error, message: state.message || 'Please try again.' });
      window.history.replaceState({}, document.title);
      return;
    }

    const params = new URLSearchParams(location.search);
    const urlError = params.get('error');
    if (urlError === 'access_denied') {
      setError({
        title: 'Access Restricted',
        message: "kinroo.ai is currently in private beta. Your email is not on the access list. Reach out at hello@kinroo.ai to be added."
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlError === 'auth_failed') {
      setError({ title: 'Sign-in Failed', message: 'Something went wrong. Please try again.' });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img className="h-20 w-auto mb-5" src="/landing_page_logo_1024x1024.png" alt="kinroo.ai" />
          <h1
            className="font-display text-5xl font-bold mb-2"
            style={{ letterSpacing: '-0.04em', color: 'var(--text-base)' }}
          >
            kinroo<span style={{ color: 'var(--accent-mid)' }}>.ai</span>
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            The family calendar that actually listens.
          </p>
        </div>

        <div
          className="py-8 px-6 rounded-2xl"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 24px rgba(30,26,20,0.08)',
          }}
        >
          {infoMessage && (
            <div
              className="mb-5 p-3 rounded-xl"
              style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--accent)' }}>{infoMessage}</p>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm font-semibold text-red-800">{error.title}</p>
              <p className="mt-0.5 text-sm text-red-700">{error.message}</p>
            </div>
          )}

          <button
            onClick={loginWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-mid)',
              color: 'var(--text-base)',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-mid)')}
          >
            <GoogleIcon />
            {loading ? 'Signing in…' : 'Sign in with Google'}
          </button>

          <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            By signing in, you agree to our{' '}
            <Link to="/terms" className="underline hover:opacity-70" style={{ color: 'var(--text-muted)' }}>Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="underline hover:opacity-70" style={{ color: 'var(--text-muted)' }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
