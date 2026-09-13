import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

export type ValidatedRole = 'client' | 'technician' | 'admin' | 'mediator';

export interface AuthState {
  status: 'loading' | 'signed-out' | 'signed-in';
  session: Session | null;
  user: User | null;
  userId: string | null;
  role: ValidatedRole | null;
  staffRole: Database['public']['Enums']['staff_role'] | null;
}

export interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null; role: ValidatedRole | null }>;
  signOut: () => Promise<void>;
  hasRole: (allowed: ValidatedRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SIGNED_OUT_STATE: AuthState = {
  status: 'signed-out',
  session: null,
  user: null,
  userId: null,
  role: null,
  staffRole: null,
};

/**
 * Resolves the authenticated user's validated role from public.users and public.platform_staff.
 */
export async function resolveUserRole(
  userId: string,
  email?: string,
): Promise<{ role: ValidatedRole | null; staffRole: Database['public']['Enums']['staff_role'] | null }> {
  try {
    const [userRow, staffRow] = await Promise.all([
      supabase.from('users').select('role').eq('id', userId).maybeSingle(),
      supabase.from('platform_staff').select('staff_role').eq('id', userId).maybeSingle(),
    ]);

    if (userRow.error) {
      console.warn('[auth] error loading user profile:', userRow.error.message);
    }
    if (staffRow.error) {
      console.warn('[auth] error loading staff profile:', staffRow.error.message);
    }

    const sRole = staffRow.data?.staff_role;
    if (sRole === 'super_admin') {
      return { role: 'admin', staffRole: sRole };
    }
    if (sRole === 'support_moderator') {
      return { role: 'mediator', staffRole: sRole };
    }

    const uRole = userRow.data?.role;
    if (uRole === 'technician') {
      return { role: 'technician', staffRole: null };
    }
    if (uRole === 'client') {
      return { role: 'client', staffRole: null };
    }

    // Direct email fallback for admin seed identity
    if (email === 'admin@sewasync.in') {
      return { role: 'admin', staffRole: 'super_admin' };
    }

    return { role: null, staffRole: null };
  } catch (err) {
    console.error('[auth] failed to resolve user role:', err);
    if (email === 'admin@sewasync.in') {
      return { role: 'admin', staffRole: 'super_admin' };
    }
    return { role: null, staffRole: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...SIGNED_OUT_STATE, status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    const applySession = async (session: Session | null) => {
      if (!session) {
        if (!cancelled) setState(SIGNED_OUT_STATE);
        return;
      }

      const { role, staffRole } = await resolveUserRole(session.user.id, session.user.email);
      if (cancelled) return;

      setState({
        status: 'signed-in',
        session,
        user: session.user,
        userId: session.user.id,
        role,
        staffRole,
      });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) {
        void applySession(session);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        void applySession(session);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message, role: null };
    }
    if (!data.user) {
      return { error: 'No user returned from authentication', role: null };
    }
    const { role } = await resolveUserRole(data.user.id, data.user.email);
    return { error: null, role };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState(SIGNED_OUT_STATE);
  }, []);

  const hasRole = useCallback(
    (allowed: ValidatedRole[]) => {
      return state.role !== null && allowed.includes(state.role);
    },
    [state.role],
  );

  const value = useMemo(
    () => ({
      ...state,
      signIn,
      signOut,
      hasRole,
    }),
    [state, signIn, signOut, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
