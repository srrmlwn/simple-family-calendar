import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Declare Capacitor for TypeScript
declare global {
  interface Window {
    Capacitor?: any;
  }
}

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login, loading, error } = useAuth();

  // Log network information on component mount
  useEffect(() => {
    // Check if running in Capacitor
    const isCapacitor = window.Capacitor !== undefined;
    console.log('Running in Capacitor:', isCapacitor);
    
    // Log API URL
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
    console.log('API URL:', apiUrl);
    
    // Check network connectivity
    if (navigator.onLine) {
      console.log('Device is online');
      setNetworkInfo('Device is online');
    } else {
      console.log('Device is offline');
      setNetworkInfo('Device is offline');
    }
    
    // Add network status change listener
    const handleOnline = () => {
      console.log('Device came online');
      setNetworkInfo('Device is online');
    };
    
    const handleOffline = () => {
      console.log('Device went offline');
      setNetworkInfo('Device is offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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

      // Check network status before attempting login
      if (!navigator.onLine) {
        setSubmitError('Network error: Device is offline');
        return;
      }

      console.log('Calling login function...');
      await login(email, password);
      console.log('Login successful, redirecting...');

      // Redirect after successful login
      // AuthContext will update isAuthenticated, which will redirect in useEffect
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Simple Family Calendar
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in to your account
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {(submitError || error) && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700">
                    {submitError || error}
                  </div>
                </div>
            )}
            
            {networkInfo && (
                <div className="rounded-md bg-blue-50 p-4">
                  <div className="text-sm text-blue-700">
                    {networkInfo}
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

            <div className="text-sm text-center">
              <p>
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                  Register here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
  );
};

export default Login;