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

// Local dev default (`supabase status`). PostgREST accepts either key
// format, but this CLI's bundled Realtime server (2.84.2) rejects the newer
// sb_publishable_* format for the websocket handshake specifically
// (server logs: "MalformedJWT: the token provided is not a valid JWT") —
// verified against the running stack, not assumed. The legacy JWT-format
// anon key works for both, so it's the default here.
const SUPABASE_ANON_KEY =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY
    ? String(import.meta.env.VITE_SUPABASE_ANON_KEY)
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
