import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isDemoUser: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  loginAsDemo: () => void;
  refreshProfile: () => Promise<void>;
  updateProfileState: (updated: Partial<Profile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo profile for reliable prototype walkthrough (§9 of spec)
export const DEMO_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Priya Sharma',
  exam: 'SSC CGL',
  attempt_number: 2,
  city_tier: 'tier2',
  daily_target_hrs: 6,
  streak_count: 12,
  total_points: 2450,
  squad_id: '00000000-0000-0000-0000-000000000002',
  language_pref: 'en',
  created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile from Supabase:', error.message);
        return null;
      }
      return data as Profile | null;
    } catch (e) {
      console.warn('Could not query profiles:', e);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (isDemoUser) {
      setProfile(DEMO_PROFILE);
      return;
    }
    if (user?.id) {
      const p = await fetchProfile(user.id);
      if (p) setProfile(p);
    }
  };

  const updateProfileState = (updated: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updated } : null));
  };

  useEffect(() => {
    // Check local storage for persistent demo mode
    const storedDemo = localStorage.getItem('prepsaathi_demo_mode');
    if (storedDemo === 'true') {
      setIsDemoUser(true);
      setUser({
        id: DEMO_PROFILE.id,
        email: 'priya.demo@prepsaathi.in',
        app_metadata: {},
        user_metadata: { name: DEMO_PROFILE.name },
        aud: 'authenticated',
        created_at: DEMO_PROFILE.created_at,
      } as User);
      setProfile(DEMO_PROFILE);
      setIsLoading(false);
      return;
    }

    // Supabase auth state listener
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        if (mounted) setProfile(p);
      }
      if (mounted) setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        if (mounted) setProfile(p);
      } else {
        if (mounted && !isDemoUser) setProfile(null);
      }
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isDemoUser]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setIsLoading(false);
        return { error };
      }
      setSession(data.session);
      setUser(data.user);
      if (data.user) {
        const p = await fetchProfile(data.user.id);
        setProfile(p);
      }
      setIsDemoUser(false);
      localStorage.removeItem('prepsaathi_demo_mode');
      setIsLoading(false);
      return { error: null };
    } catch (err: any) {
      setIsLoading(false);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error) {
        setIsLoading(false);
        return { error };
      }

      setSession(data.session);
      setUser(data.user);

      // Create initial profile row if user was created
      if (data.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name: name || email.split('@')[0],
            exam: '', // empty triggers onboarding redirect (§6 Screen 1)
            streak_count: 0,
            total_points: 0,
            language_pref: 'en',
          });
          const p = await fetchProfile(data.user.id);
          setProfile(p);
        } catch (e) {
          console.warn('Initial profile insert deferred:', e);
        }
      }

      setIsDemoUser(false);
      localStorage.removeItem('prepsaathi_demo_mode');
      setIsLoading(false);
      return { error: null };
    } catch (err: any) {
      setIsLoading(false);
      return { error: err };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('prepsaathi_demo_mode');
    setIsDemoUser(false);
    setUser(null);
    setSession(null);
    setProfile(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
  };

  const loginAsDemo = () => {
    localStorage.setItem('prepsaathi_demo_mode', 'true');
    setIsDemoUser(true);
    setUser({
      id: DEMO_PROFILE.id,
      email: 'priya.demo@prepsaathi.in',
      app_metadata: {},
      user_metadata: { name: DEMO_PROFILE.name },
      aud: 'authenticated',
      created_at: DEMO_PROFILE.created_at,
    } as User);
    setProfile(DEMO_PROFILE);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isDemoUser,
        signIn,
        signUp,
        signOut,
        loginAsDemo,
        refreshProfile,
        updateProfileState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
