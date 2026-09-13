/**
 * The one real Supabase client for the browser. Replaces the hand-rolled
 * fetch wrapper that used to live in src/lib/supabase.ts — every RPC call
 * now goes through supabase-js, which attaches the current session's JWT
 * automatically. Before this, every request (including accept_request and
 * advance_request_status) always authenticated as the anon key; auth.uid()
 * was always null server-side regardless of what the UI did.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const SUPABASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
    ? String(import.meta.env.VITE_SUPABASE_URL)
    : 'http://127.0.0.1:54321';

const SUPABASE_ANON_KEY =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY
    ? String(import.meta.env.VITE_SUPABASE_ANON_KEY)
    : 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
