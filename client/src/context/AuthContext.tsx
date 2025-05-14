import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  handleGoogleCallback: (token: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  token: null,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: () => {},
  handleGoogleCallback: async () => {},
  logout: () => {},
  loading: false,
  error: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleClientLoaded, setIsGoogleClientLoaded] = useState<boolean>(false);
  const navigate = useNavigate();

  // Check if Google client is loaded
  useEffect(() => {
    const checkGoogleClient = () => {
      if (window.google?.accounts?.oauth2?.initTokenClient) {
        setIsGoogleClientLoaded(true);
      } else {
        // Check again after a short delay
        setTimeout(checkGoogleClient, 100);
      }
    };
    checkGoogleClient();
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  // Handle successful authentication
  const handleAuthSuccess = useCallback((authResponse: { user: User; token: string }) => {
    setUser(authResponse.user);
    setToken(authResponse.token);
    localStorage.setItem('token', authResponse.token);
    localStorage.setItem('user', JSON.stringify(authResponse.user));
    navigate('/', { replace: true });
  }, [navigate]);

  // Login with Google
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("AuthContext - Initiating Google login with popup", {
        origin: window.location.origin,
        hostname: window.location.hostname,
        href: window.location.href,
        domain: window.location.host
      });

      if (!isGoogleClientLoaded) {
        throw new Error('Google OAuth client is still loading. Please try again in a moment.');
      }

      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
        scope: 'email profile openid',
        callback: async (response: { 
          access_token?: string;
          error?: string;
          error_description?: string;
        }) => {
          console.log("Callback invoked - Google OAuth response:", {
            response,
            origin: window.location.origin,
            hostname: window.location.hostname,
            href: window.location.href,
            domain: window.location.host
          });
          if (response.error) {
            console.error('Google OAuth error:', response.error);
            setError(response.error_description || 'Google authentication failed');
            return;
          }

          if (response.access_token) {
            try {
              // Send the token to our backend
              const authResponse = await authService.verifyGoogleToken(response.access_token);
              handleAuthSuccess(authResponse);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to complete Google authentication');
              console.error('Google token verification error:', err);
            }
          }
        },
      });
      console.log("Requesting access token. Client:", JSON.stringify(client));
      console.log("Setting up Google OAuth callback with current state:", {
        origin: window.location.origin,
        hostname: window.location.hostname,
        href: window.location.href,
        domain: window.location.host,
        isGoogleClientLoaded,
        clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID ? 'present' : 'missing'
      });
      client.requestAccessToken();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate Google login');
      console.error('Google login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log("AuthContext - Logging in user - " + email + ", " + password);
      const response = await authService.login(email, password);
      if (response) {
        handleAuthSuccess(response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Register user
  const register = async (firstName: string, lastName: string, email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log("AuthContext - Registering user - " + firstName + ", " + lastName);
      const response = await authService.register(firstName, lastName, email, password);
      if (response) {
        handleAuthSuccess(response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth callback
  const handleGoogleCallback = async (token: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log("AuthContext - Handling Google callback");
      
      const response = await authService.handleGoogleCallback(token);
      
      setUser(response.user);
      setToken(response.token);
      
      console.log("Storing Google auth token and user in local storage");
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete Google authentication');
      console.error('Google callback error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        token,
        login,
        register,
        loginWithGoogle,
        handleGoogleCallback,
        logout,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;