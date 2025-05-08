import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Type declarations for Google SDK
declare global {
  interface Window {
    Capacitor?: any;
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token: string }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login, loginWithGoogle, loading, error } = useAuth();

  // Check for auth error message on component mount
  useEffect(() => {
    const authError = sessionStorage.getItem('authError');
    if (authError) {
      setSubmitError(authError);
      // Clear the error message from sessionStorage
      sessionStorage.removeItem('authError');
    }
  }, []);

  // Initialize Google SDK
  useEffect(() => {
    // Load Google SDK
    const loadGoogleSDK = () => {
      if (document.getElementById('google-jssdk')) {
        console.log('Google SDK already loaded');
        return Promise.resolve();
      }

      console.log('Loading Google SDK...');
      return new Promise<void>((resolve, reject) => {
        const js = document.createElement('script');
        js.id = 'google-jssdk';
        js.src = 'https://accounts.google.com/gsi/client';
        js.async = true;
        js.defer = true;
        
        js.onload = () => {
          console.log('Google SDK loaded successfully');
          resolve();
        };
        
        js.onerror = (error) => {
          console.error('Failed to load Google SDK:', error);
          reject(new Error('Failed to load Google authentication'));
        };
        
        document.body.appendChild(js);
      });
    };

    // Load SDK and handle errors
    loadGoogleSDK().catch((error) => {
      console.error('Error loading Google SDK:', error);
      setSubmitError('Failed to load Google authentication');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitError(null);
      console.log('Attempting login with email:', email);

      if (!email.trim()) {
        setSubmitError('Email is required');
        return;
      }

      if (!password) {
        setSubmitError('Password is required');
        return;
      }

      console.log('Calling login function...');
      await login(email, password);
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

  const handleGoogleLogin = async () => {
    try {
      setSubmitError(null);
      
      if (!window.google) {
        console.error('Google SDK not loaded');
        throw new Error('Google SDK not loaded');
      }

      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      console.log('Google Client ID:', clientId);
      console.log('Current domain:', window.location.origin);

      if (!clientId) {
        console.error('Google Client ID is missing');
        throw new Error('Google Client ID is not configured');
      }

      console.log('Initializing Google OAuth client...');
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile',
        callback: async (response) => {
          try {
            console.log('Google OAuth callback received:', response);
            if (response.access_token) {
              console.log('Got access token, logging in...');
              await loginWithGoogle(response.access_token);
              console.log('Google login successful, redirecting to /');
              navigate('/');
            } else {
              console.error('No access token in response');
              setSubmitError('Failed to get authorization from Google');
            }
          } catch (err) {
            console.error('Error in Google callback:', err);
            setSubmitError('Failed to complete Google login');
          }
        },
      });
      
      console.log('Requesting access token...');
      client.requestAccessToken();
    } catch (err) {
      console.error('Google login error:', err);
      setSubmitError(err instanceof Error ? err.message : 'Failed to initialize Google login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            famcal.ai
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            <GoogleIcon />
            Sign in with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
            </div>
          </div>

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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
        </div>

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
  );
};

export default Login;