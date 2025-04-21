import React, { createContext, useState, useEffect, useContext } from 'react';
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
  logout: () => {},
  loading: false,
  error: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  // Login user
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log("AuthContext - Logging in user - " + email + ", " + password);
      const response = await authService.login(email, password);

      if (response) {
        setUser(response.user);
        setToken(response.token);

        console.log("Storing token " + response.token + " and user " + response.user + " in local storage");
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
      console.error('Login error:', err);
      console.error('Login error details xxxx:', JSON.stringify(err));
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
        setUser(response.user);
        setToken(response.token);

        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
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
            isAuthenticated: !!token,
            user,
            token,
            login,
            register,
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