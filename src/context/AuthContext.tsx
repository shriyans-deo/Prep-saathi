import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { clearQueryCache } from '../lib/query';
import type { Profile } from '../types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  profileError: boolean;
  isSample: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null; needsConfirmation: boolean }>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  startSampleAccount: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const loadedFor = useRef<string | null>(null);

  const applySession = useCallback(async (next: Session | null) => {
    setSession(next);
    const uid = next?.user?.id ?? null;
    if (!uid) {
      loadedFor.current = null;
      setProfile(null);
      setProfileError(false);
      setIsLoading(false);
      return;
    }
    // Token refreshes fire this too. Only reload when the user actually changes.
    if (loadedFor.current === uid) {
      setIsLoading(false);
      return;
    }
    loadedFor.current = uid;
    try {
      setProfile(await loadProfile(uid));
      setProfileError(false);
    } catch (e) {
      console.error('Could not load profile:', e);
      setProfileError(true);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      // supabase-js holds a lock during this callback, so database calls must be deferred.
      setTimeout(() => void applySession(next), 0);
    });
    return () => listener.subscription.unsubscribe();
  }, [applySession]);

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id;
    if (uid) setProfile(await loadProfile(uid));
  }, [session?.user?.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    return { error, needsConfirmation: !error && !data.session };
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` });
    return { error };
  }, []);

  const startSampleAccount = useCallback(async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) return { error };
    const { error: seedError } = await supabase.rpc('seed_my_demo_account');
    if (seedError) return { error: new Error(seedError.message) };
    if (data.user) {
      loadedFor.current = data.user.id;
      setProfile(await loadProfile(data.user.id));
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    clearQueryCache();
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      user: (session?.user ?? null) as User | null,
      session,
      profile,
      isLoading,
      profileError,
      isSample: profile?.is_demo ?? false,
      signIn,
      signUp,
      sendPasswordReset,
      startSampleAccount,
      signOut,
      refreshProfile,
    }),
    [session, profile, isLoading, profileError, signIn, signUp, sendPasswordReset, startSampleAccount, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
