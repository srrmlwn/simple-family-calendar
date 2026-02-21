import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  handleAuthCallback: () => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // On mount, try to restore session from the httpOnly cookie by fetching /me.
  // If the cookie is absent or expired the request will 401 and we stay logged out.
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Handle successful authentication
  const handleAuthSuccess = useCallback((authUser: User) => {
    setUser(authUser);
    // Store non-sensitive user display data in localStorage for fast UI restore on reload.
    // The actual auth token stays in the httpOnly cookie — localStorage holds no secrets.
    localStorage.setItem('user', JSON.stringify(authUser));
    navigate('/', { replace: true });
  }, [navigate]);

  // Login with Google — redirect to server OAuth endpoint
  const loginWithGoogle = () => {
    try {
      setLoading(true);
      setError(null);
      window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/google`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate Google login');
      setLoading(false);
    }
  };

  // Handle Google OAuth redirect callback.
  // The httpOnly cookie has already been set by the server; just fetch /me.
  const handleAuthCallback = async () => {
    try {
      setLoading(true);
      setError(null);

      const { user: authUser } = await authService.handleGoogleCallback();
      handleAuthSuccess(authUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete authentication');
      navigate('/login', {
        state: { error: 'Authentication failed. Please try again.' },
      });
    } finally {
      setLoading(false);
    }
  };

  // Login with email/password
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { user: authUser } = await authService.login(email, password);
      handleAuthSuccess(authUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
      throw err; // re-throw so LoginPage can display the error
    } finally {
      setLoading(false);
    }
  };

  // Register new user
  const register = async (firstName: string, lastName: string, email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { user: authUser } = await authService.register(firstName, lastName, email, password);
      handleAuthSuccess(authUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  // Logout user — clear cookie server-side and wipe client state
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    authService.logout(); // best-effort; don't await
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
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
