import React, { createContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService.js';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if an existing session is valid on application startup
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authService.getMe();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      // 401 is normal for unauthenticated guests, no need to log loudly
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials) => {
    setError(null);
    try {
      const res = await authService.login(credentials);
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      }
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      const res = await authService.register(userData);
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      }
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    setUser,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

