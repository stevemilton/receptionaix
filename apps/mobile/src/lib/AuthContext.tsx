import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { initRevenueCat } from './revenuecat';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  onboardingCompleted: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshOnboardingStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Check if user has completed onboarding
  const checkOnboardingStatus = async (userId: string) => {
    const { data } = await supabase
      .from('merchants')
      .select('onboarding_completed')
      .eq('id', userId)
      .single();

    setOnboardingCompleted(data?.onboarding_completed ?? false);
  };

  const refreshOnboardingStatus = async () => {
    if (user) {
      await checkOnboardingStatus(user.id);
    }
  };

  useEffect(() => {
    // Get initial session with error handling
    const initAuth = async () => {
      try {
        console.log('[Auth] Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[Auth] getSession error:', error);
        }

        console.log('[Auth] Session:', session ? 'exists' : 'none');
        setSession(session);
        setUser(session?.user ?? null);

        // Check onboarding status and init RevenueCat if logged in
        if (session?.user) {
          try {
            console.log('[Auth] Checking onboarding status...');
            await checkOnboardingStatus(session.user.id);
          } catch (e) {
            console.error('[Auth] checkOnboardingStatus error:', e);
          }
          initRevenueCat(session.user.id).catch((err) =>
            console.error('[Auth] RevenueCat init error:', err)
          );
        }
      } catch (e) {
        console.error('[Auth] Init error:', e);
      } finally {
        console.log('[Auth] Setting loading to false');
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Check onboarding status and init RevenueCat when user logs in
        if (session?.user) {
          await checkOnboardingStatus(session.user.id);
          initRevenueCat(session.user.id).catch((err) =>
            console.error('[Auth] RevenueCat init error:', err)
          );
        } else {
          setOnboardingCompleted(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const completeOnboarding = async () => {
    if (!user) return;

    await supabase
      .from('merchants')
      .update({ onboarding_completed: true })
      .eq('id', user.id);

    setOnboardingCompleted(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        onboardingCompleted,
        signIn,
        signUp,
        signOut,
        completeOnboarding,
        refreshOnboardingStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
