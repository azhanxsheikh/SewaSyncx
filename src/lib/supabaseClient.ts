/**
 * Re-exports the shared Supabase client from packages/shared/src/lib/supabase.
 * Ensures a single client instance, unified authentication cache, and single
 * Realtime socket multiplexer across all applications and shared libraries.
 */
export { supabase } from '../../packages/shared/src/lib/supabase';
