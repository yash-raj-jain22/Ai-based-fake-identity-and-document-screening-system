import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/services/api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('docuscreen_user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('docuscreen_token') || null;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Validate session on mount
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('docuscreen_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('docuscreen_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Session verification failed, clearing auth cache:', err.message);
          logout();
        }
      }
      setIsLoading(false);
    };

    verifySession();
  }, []);

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    if (res.success && res.data) {
      const { user: loggedInUser, token: authToken } = res.data;
      setUser(loggedInUser);
      setToken(authToken);
      localStorage.setItem('docuscreen_user', JSON.stringify(loggedInUser));
      localStorage.setItem('docuscreen_token', authToken);
      return loggedInUser;
    }
    throw new Error(res.message || 'Login failed');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('docuscreen_user', JSON.stringify(updatedUser));
  };

  const updateProfile = async (profileData) => {
    const res = await authApi.getMe(); // verify or use systemApi
    // The Profile component can call systemApi.updateProfile and call updateUser
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('docuscreen_user');
    localStorage.removeItem('docuscreen_token');
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
