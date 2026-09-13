/**
 * Real Supabase Auth session, shared by every surface (Client, Technician,
 * and — once platform_staff exists — Admin). Nothing in this app had a real
 * session before this: every RPC call authenticated as the anon key, so
 * auth.uid() was always null server-side regardless of what the UI did.
 *
 * `role` mirrors `public.users.role` ('client' | 'technician') for the
 * signed-in user, fetched once a session exists. It is `null` while
 * loading and while signed out — callers must not assume it is set just
 * because `status === 'signed-in'` (the profile fetch can still be in
 * flight, or can fail).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/database';

type UserRole = Database['public']['Enums']['user_role'];

export interface AuthState {
  status: 'loading' | 'signed-out' | 'signed-in';
  session: Session | null;
  userId: string | null;
  role: UserRole | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    session: null,
    userId: null,
    role: null,
  });

  const loadRole = useCallback(async (userId: string): Promise<UserRole | null> => {
    const { data, error } = await supabase.from('users').select('role').eq('id', userId).single();
    if (error) {
      console.warn('[auth] failed to load user role:', error.message);
      return null;
    }
    return data.role;
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      if (!session) {
        setState({ status: 'signed-out', session: null, userId: null, role: null });
        return;
      }
      const role = await loadRole(session.user.id);
      if (cancelled) return;
      setState({ status: 'signed-in', session, userId: session.user.id, role });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      if (!session) {
        setState({ status: 'signed-out', session: null, userId: null, role: null });
        return;
      }
      const role = await loadRole(session.user.id);
      if (cancelled) return;
      setState({ status: 'signed-in', session, userId: session.user.id, role });
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [loadRole]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
