import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const SessionContext = createContext(null);

const TOKEN_KEY = 'rag_session_token';

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [sessionToken, setSessionToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const restoreSession = useCallback(async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }
    try {
      const resp = await authAPI.getMe(sessionToken);
      setProfile(resp.user || resp);
      setError(null);
    } catch {
      setSessionToken(null);
      setProfile(null);
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => { restoreSession(); }, [restoreSession]);

  const persistSession = (token, userData) => {
    setSessionToken(token);
    setProfile(userData);
    localStorage.setItem(TOKEN_KEY, token);
  };

  const login = async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await authAPI.login(email, password);
      persistSession(token, user);
      return user;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Authentication failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (firstName, lastName, email, password, department) => {
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await authAPI.signup(firstName, lastName, email, password, department);
      persistSession(token, user);
      return user;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Registration failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setSessionToken(null);
    setProfile(null);
    setError(null);
    localStorage.removeItem(TOKEN_KEY);
  };

  const enrichedUser = profile ? {
    ...profile,
    name: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email,
  } : null;

  return (
    <SessionContext.Provider value={{
      user: enrichedUser,
      token: sessionToken,
      loading,
      error,
      login,
      signup,
      logout,
      clearError: () => setError(null),
      isAuthenticated: !!profile && !!sessionToken,
      isAdmin: profile?.role === 'admin',
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default SessionContext;
