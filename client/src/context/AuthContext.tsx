import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  managingFamilyId?: string;
  managingFamilyName?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loginWithGoogle: () => void;
  handleAuthCallback: () => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loginWithGoogle: () => {},
  handleAuthCallback: async () => {},
  logout: () => {},
  loading: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // On mount, restore session from localStorage (actual auth via httpOnly cookie).
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

  const handleAuthSuccess = useCallback((authUser: User) => {
    setUser(authUser);
    localStorage.setItem('user', JSON.stringify(authUser));
    navigate('/', { replace: true });
  }, [navigate]);

  // Redirect to Google OAuth
  const loginWithGoogle = () => {
    setLoading(true);
    window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/google`;
  };

  // Handle Google OAuth redirect callback — cookie already set server-side, just fetch /me.
  const handleAuthCallback = async () => {
    try {
      setLoading(true);

      const { user: authUser } = await authService.handleGoogleCallback();

      // If there's a pending invite token, accept it now.
      const pendingToken = localStorage.getItem('pendingInviteToken');
      if (pendingToken) {
        localStorage.removeItem('pendingInviteToken');
        try {
          await api.post('/api/family/invite/accept', { token: pendingToken });
          await authService.logout();
          navigate('/', {
            replace: true,
            state: { info: 'Invitation accepted! Please sign in again to access the family calendar.' },
          });
          return;
        } catch {
          // Accept failed — log in normally
        }
      }

      handleAuthSuccess(authUser);
    } catch {
      navigate('/', { state: { error: 'Authentication failed. Please try again.' } });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    authService.logout();
    navigate('/', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, loginWithGoogle, handleAuthCallback, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
