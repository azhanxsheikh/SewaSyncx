import type { Database } from '../types/database';

const SUPABASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
    ? String(import.meta.env.VITE_SUPABASE_URL)
    : 'http://127.0.0.1:54321';

const SUPABASE_ANON_KEY =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY
    ? String(import.meta.env.VITE_SUPABASE_ANON_KEY)
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';

export interface RpcResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Executes a PostgreSQL RPC function exposed via Supabase / PostgREST.
 */
export async function callRpc<
  TFunctionName extends keyof Database['public']['Functions']
>(
  fnName: TFunctionName,
  args: Database['public']['Functions'][TFunctionName]['Args']
): Promise<RpcResult<Database['public']['Functions'][TFunctionName]['Returns']>> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${String(fnName)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        data: null,
        error: new Error(`RPC ${String(fnName)} failed (${response.status}): ${errText}`),
      };
    }

    const data = (await response.json()) as Database['public']['Functions'][TFunctionName]['Returns'];
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Invokes the accept_request RPC to claim a pending emergency or scheduled request.
 */
export async function acceptRequestRpc(p_request_id: string, p_technician_id: string) {
  return callRpc('accept_request', {
    p_request_id,
    p_technician_id,
  });
}

/**
 * Invokes the advance_request_status RPC to transition request status.
 * Takes no pricing arguments — the real RPC never accepted them (see
 * settleJobPaymentRpc below for settlement). Not currently called anywhere:
 * nothing yet drives the technician-side en_route/arrived/in_progress
 * transitions through the real backend, only through local dispatch state.
 */
export async function advanceRequestStatusRpc(
  p_request_id: string,
  p_next_status: Database['public']['Enums']['request_status'],
) {
  return callRpc('advance_request_status', {
    p_request_id,
    p_next_status,
  });
}

/**
 * Invokes settle_job_payment: records the technician's final price and
 * adjustment reason, walks the request through to `completed`, and
 * generates its invoice. p_reason is required whenever p_final_price
 * exceeds the request's estimated_total, and must already have an approved
 * request_cost_additions row covering the difference.
 */
export async function settleJobPaymentRpc(
  p_request_id: string,
  p_final_price: number,
  p_reason?: Database['public']['Enums']['price_adjustment_reason'],
  p_notes?: string,
) {
  return callRpc('settle_job_payment', {
    p_request_id,
    p_final_price,
    ...(p_reason !== undefined ? { p_reason } : {}),
    ...(p_notes !== undefined ? { p_notes } : {}),
  });
}

