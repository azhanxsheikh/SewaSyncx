/**
 * Re-exports the unified Supabase Auth subsystem from packages/shared/src/auth.
 * This guarantees a single AuthContext and AuthProvider instance across all
 * monorepo packages and apps, avoiding dual-context runtime exceptions.
 */
export {
  AuthProvider,
  useAuth,
  resolveUserRole,
  type ValidatedRole,
  type AuthState,
  type AuthContextValue,
} from '../../packages/shared/src/auth';

import type { Database } from '../types/database';
export type UserRole = Database['public']['Enums']['user_role'];
export type StaffRole = Database['public']['Enums']['staff_role'];
