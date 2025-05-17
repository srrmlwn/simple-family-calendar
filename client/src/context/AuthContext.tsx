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
  handleAuthCallback: (token: string) => Promise<void>;
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
  handleAuthCallback: async () => {},
  logout: () => {},
  loading: false,
  error: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
  const loginWithGoogle = () => {
    try {
      setLoading(true);
      setError(null);
      
      // Log the environment variables and constructed URL
      console.log('Environment variables:', {
        REACT_APP_API_URL: process.env.REACT_APP_API_URL,
        NODE_ENV: process.env.NODE_ENV
      });
      
      const redirectUrl = `${process.env.REACT_APP_API_URL}/api/auth/google`;
      console.log('Redirecting to Google OAuth URL:', redirectUrl);
      
      // Redirect to Google OAuth endpoint
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate Google login');
      console.error('Google login error:', err);
      setLoading(false);
    }
  };

  // Handle auth callback
  const handleAuthCallback = async (token: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user info using the token
      const user = await authService.getCurrentUser(token);
      
      handleAuthSuccess({
        user,
        token
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete authentication');
      console.error('Auth callback error:', err);
      navigate('/login', { 
        state: { error: 'Authentication failed. Please try again.' }
      });
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
        handleAuthCallback,
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