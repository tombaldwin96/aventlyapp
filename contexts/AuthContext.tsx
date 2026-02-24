import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import type { AppUser } from '@/lib/types';

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<AppUser | null>;
  /** Set user after login (avoids second /api/auth/me call before session is in storage). */
  setUserFromLogin: (profile: AppUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const fetchProfile = useCallback(async (): Promise<AppUser | null> => {
    const { data, error: err, status } = await apiFetch<{ user: AppUser }>('/api/auth/me');
    if (err || !data?.user) {
      if (__DEV__) console.log('[Auth] /api/auth/me failed:', status, err || 'no user');
      return null;
    }
    if (data.user.status === 'SUSPENDED') {
      if (__DEV__) console.warn('[Auth] User suspended');
      await supabase.auth.signOut();
      return null;
    }
    return data.user;
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await fetchProfile();
    if (mounted.current) setUser(profile);
    return profile;
  }, [fetchProfile]);

  const setUserFromLogin = useCallback((profile: AppUser) => {
    if (mounted.current) setUser(profile);
  }, []);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;

    const init = async () => {
      if (__DEV__) console.log('[Auth] Restoring session...');
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        if (__DEV__) console.log('[Auth] No session');
        setIsRestoring(false);
        setIsLoading(false);
        return;
      }
      const profile = await fetchProfile();
      if (cancelled) return;
      setUser(profile);
      setIsRestoring(false);
      setIsLoading(false);
      if (__DEV__) console.log('[Auth] Session restored', profile?.id, profile?.role);
    };

    init();
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [fetchProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (mounted.current) setUser(null);
        return;
      }
      if (event === 'TOKEN_REFRESHED' && __DEV__) {
        console.log('[Auth] Token refreshed');
      }
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        const profile = await fetchProfile();
        if (mounted.current) setUser(profile);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await supabase.auth.signOut();
    setUser(null);
    setIsLoading(false);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isRestoring,
    error,
    setError,
    signOut,
    refreshProfile,
    setUserFromLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
