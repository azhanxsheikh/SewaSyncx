/**
 * Real Supabase Auth session, shared by every surface (Client, Technician,
 * Admin). Nothing in this app had a real session before this: every RPC
 * call authenticated as the anon key, so auth.uid() was always null
 * server-side regardless of what the UI did.
 *
 * `role` mirrors `public.users.role` ('client' | 'technician') and
 * `staffRole` mirrors `public.platform_staff.staff_role` — a signed-in user
 * has exactly one of the two set, never both (handle_new_auth_user routes
 * each signup to one table or the other). Both are `null` while loading and
 * while signed out — callers must not assume either is set just because
 * `status === 'signed-in'` (the profile fetch can still be in flight, or
 * can fail).
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
type StaffRole = Database['public']['Enums']['staff_role'];

export interface AuthState {
  status: 'loading' | 'signed-out' | 'signed-in';
  session: Session | null;
  userId: string | null;
  role: UserRole | null;
  staffRole: StaffRole | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SIGNED_OUT_STATE: AuthState = {
  status: 'signed-out',
  session: null,
  userId: null,
  role: null,
  staffRole: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...SIGNED_OUT_STATE, status: 'loading' });

  const loadProfile = useCallback(
    async (userId: string): Promise<{ role: UserRole | null; staffRole: StaffRole | null }> => {
      const [userRow, staffRow] = await Promise.all([
        supabase.from('users').select('role').eq('id', userId).maybeSingle(),
        supabase.from('platform_staff').select('staff_role').eq('id', userId).maybeSingle(),
      ]);
      if (userRow.error) console.warn('[auth] failed to load user role:', userRow.error.message);
      if (staffRow.error) console.warn('[auth] failed to load staff role:', staffRow.error.message);
      return {
        role: userRow.data?.role ?? null,
        staffRole: staffRow.data?.staff_role ?? null,
      };
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const applySession = async (session: Session | null) => {
      if (!session) {
        setState(SIGNED_OUT_STATE);
        return;
      }
      const { role, staffRole } = await loadProfile(session.user.id);
      if (cancelled) return;
      setState({ status: 'signed-in', session, userId: session.user.id, role, staffRole });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) applySession(session);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) applySession(session);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

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
