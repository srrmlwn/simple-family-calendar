import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const { login, loginWithGoogle, loading, error } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check for auth error message on component mount
  useEffect(() => {
    const authError = sessionStorage.getItem('authError');
    if (authError) {
      setSubmitError(authError);
      // Clear the error message from sessionStorage
      sessionStorage.removeItem('authError');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitError(null);
      console.log('Attempting login with email:', formData.email);

      if (!formData.email.trim()) {
        setSubmitError('Email is required');
        return;
      }

      if (!formData.password) {
        setSubmitError('Password is required');
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
          setSubmitError('Network error: Unable to connect to the server. Please check your internet connection.');
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError('An unexpected error occurred');
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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10 border border-gray-100">
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

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6">
              <div 
                id="g_id_onload"
                data-client_id={process.env.REACT_APP_GOOGLE_CLIENT_ID}
                data-context="signin"
                data-ux_mode="popup"
                data-callback="handleGoogleSignIn"
                data-auto_prompt="false"
              />

              <div 
                className="g_id_signin"
                data-type="standard"
                data-shape="rectangular"
                data-theme="outline"
                data-text="signin_with"
                data-size="large"
                data-logo_alignment="left"
                data-width="400"
                data-domain="famcal.ai"
              />
            </div>
          </div>

          {/* Existing login form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {(submitError || error) && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">
                  {submitError || error}
                </div>
              </div>
            )}

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

          <div className="text-sm text-center">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;