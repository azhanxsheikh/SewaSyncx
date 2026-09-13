import type { Database } from '../types/database';
import { supabase } from './supabaseClient';

export interface RpcResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Executes a PostgreSQL RPC function via the real supabase-js client, which
 * attaches the signed-in user's JWT automatically. Before this, every RPC
 * call went through a hand-rolled fetch wrapper sending only the anon key —
 * auth.uid() was always null server-side, so every auth-checked RPC
 * (accept_request, advance_request_status, settle_job_payment, ...) could
 * never actually succeed, regardless of what the UI did.
 */
export async function callRpc<
  TFunctionName extends keyof Database['public']['Functions']
>(
  fnName: TFunctionName,
  args: Database['public']['Functions'][TFunctionName]['Args']
): Promise<RpcResult<Database['public']['Functions'][TFunctionName]['Returns']>> {
  const { data, error } = await supabase.rpc(fnName, args);
  if (error) {
    return { data: null, error: new Error(`RPC ${String(fnName)} failed: ${error.message}`) };
  }
  return { data: data as Database['public']['Functions'][TFunctionName]['Returns'], error: null };
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
 * settleJobPaymentRpc below for settlement).
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
