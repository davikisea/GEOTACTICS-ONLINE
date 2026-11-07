import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { Database } from '../types/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    error: null,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[useAuth] Error fetching profile:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[useAuth] Unexpected error fetching profile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    if (profile) {
      setState((prev) => ({ ...prev, profile }));
    }
  }, [state.user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    // Check active session on mount
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        setState({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          error: error.message,
        });
        return;
      }

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (mounted) {
          setState({
            user: session.user,
            session,
            profile,
            isLoading: false,
            error: null,
          });
        }
      } else {
        if (mounted) {
          setState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            error: null,
          });
        }
      }
    });

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (mounted) {
          setState({
            user: session.user,
            session,
            profile,
            isLoading: false,
            error: null,
          });
        }
      } else {
        if (mounted) {
          setState({
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            error: null,
          });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signInWithEmail = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setState((prev) => ({ ...prev, isLoading: false, error: error.message }));
      return { success: false, error: error.message };
    }
    const profile = data.user ? await fetchProfile(data.user.id) : null;
    setState({
      user: data.user,
      session: data.session,
      profile,
      isLoading: false,
      error: null,
    });
    return { success: true, user: data.user };
  };

  const signUpWithEmail = async (email: string, password: string, username: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });
    if (error) {
      setState((prev) => ({ ...prev, isLoading: false, error: error.message }));
      return { success: false, error: error.message };
    }
    return { success: true, user: data.user };
  };

  const signOut = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      profile: null,
      isLoading: false,
      error: null,
    });
  };

  return {
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshProfile,
  };
}
