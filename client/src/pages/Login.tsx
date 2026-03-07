import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Add Google Fonts import
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

// SVG Icon
const GoogleIcon = () => (
  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const Login: React.FC = () => {
  const { login, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [submitError, setSubmitError] = useState<{ title: string; message: string } | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Check for auth error/info message on component mount
  useEffect(() => {
    const state = location.state as { error?: string; message?: string; info?: string } | null;
    if (state?.info) {
      setInfoMessage(state.info);
      window.history.replaceState({}, document.title);
      return;
    }
    if (state?.error) {
      setSubmitError({
        title: state.error,
        message: state.message || 'Please try again.'
      });
      window.history.replaceState({}, document.title);
      return;
    }

    // OAuth redirects pass errors as query params (e.g. ?error=access_denied)
    const params = new URLSearchParams(location.search);
    const urlError = params.get('error');
    if (urlError === 'access_denied') {
      setSubmitError({
        title: 'Access Restricted',
        message: "famcal.ai is currently in private beta. Your email is not on the access list. Reach out if you'd like to be added."
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlError === 'auth_failed') {
      setSubmitError({
        title: 'Sign-in Failed',
        message: 'Something went wrong during sign-in. Please try again.'
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitError(null);
      console.log('Attempting login with email:', formData.email);

      if (!formData.email.trim()) {
        setSubmitError({
          title: 'Email Required',
          message: 'Please enter your email address.'
        });
        return;
      }

      if (!formData.password) {
        setSubmitError({
          title: 'Password Required',
          message: 'Please enter your password.'
        });
        return;
      }

      console.log('Calling login function...');
      await login(formData.email, formData.password);
      console.log('Login successful, redirecting...');

      // Redirect after successful login
      navigate('/');
    } catch (err) {
      // Log detailed error information
      console.error('Login error details:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      
      // Auth context will handle setting the error message
      if (err instanceof Error) {
        if (err.message.includes('Network Error')) {
          setSubmitError({
            title: 'Connection Error',
            message: 'Unable to connect to the server. Please check your internet connection.'
          });
        } else {
          setSubmitError({
            title: 'Login Failed',
            message: err.message
          });
        }
      } else {
        setSubmitError({
          title: 'Login Failed',
          message: 'An unexpected error occurred. Please try again.'
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center">
          <img
            className="h-32 w-auto mb-4"
            src="/landing_page_logo_1024x1024.png"
            alt="FamCal Logo"
          />
          <h1 
            className="text-4xl font-extrabold text-gray-900 mb-2"
            style={{ 
              fontFamily: 'Nunito, sans-serif',
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 800
            }}
          >
            famcal.ai
          </h1>
          <p 
            className="text-sm text-gray-600 mb-8"
            style={{
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 500,
              letterSpacing: '-0.01em'
            }}
          >
            Planning made easy—type it, say it, done.
          </p>
        </div>
      </div>

      {/* Private beta banner */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-center">
          <p className="text-sm font-medium text-amber-800">
            famcal.ai is in private beta
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            Sign-in is currently limited to invited testers. Working on something great — stay tuned.
          </p>
        </div>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10 border border-gray-100">
          {infoMessage && (
            <div className="mb-6 p-4 rounded-md bg-indigo-50 border border-indigo-200">
              <p className="text-sm text-indigo-800">{infoMessage}</p>
            </div>
          )}

          {submitError && (
            <div className="mb-6 p-4 rounded-md bg-red-50 border border-red-200">
              <h3 className="text-sm font-medium text-red-800">
                {submitError.title}
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {submitError.message}
              </p>
            </div>
          )}

          {/* Google Sign In Button */}
          <div className="mb-6">
            <button
              onClick={loginWithGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <GoogleIcon />
              Sign in with Google
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-600">Or sign in with email</span>
            </div>
          </div>

          {/* Email / password login form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="space-y-2 text-sm text-center">
            <p>
              <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </Link>
            </p>
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Register here
              </Link>
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            By signing in, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-gray-600">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;