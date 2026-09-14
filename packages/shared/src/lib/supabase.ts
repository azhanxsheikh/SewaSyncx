import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const SUPABASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
    ? String(import.meta.env.VITE_SUPABASE_URL)
    : 'http://127.0.0.1:54321';

const SUPABASE_ANON_KEY =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY
    ? String(import.meta.env.VITE_SUPABASE_ANON_KEY)
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const customFetch: typeof fetch = async (input, init) => {
  try {
    const response = await fetch(input, init);
    if (!response.ok && response.status >= 400) {
      try {
        const clone = response.clone();
        const body = await clone.json();
        if (body) {
          console.error("SUPABASE AUTH/DB ERROR:", body);
        }
      } catch {
        // Body was not JSON
      }
    }
    return response;
  } catch (netErr) {
    console.error("SUPABASE AUTH/DB ERROR:", netErr);
    throw netErr;
  }
};

export function logSupabaseError(error: unknown) {
  if (error) {
    console.error("SUPABASE AUTH/DB ERROR:", error);
  }
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    global: {
      fetch: customFetch,
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

export type { Database };
