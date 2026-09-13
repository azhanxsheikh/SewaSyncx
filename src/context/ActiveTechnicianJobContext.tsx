/**
 * Server-authoritative job state for the technician surface.
 *
 * public.requests is the source of truth. This provider loads the
 * technician's active request (technician_id = auth.uid(), non-terminal
 * status) — or, when there is none, the newest pending request RLS lets them
 * see — and writes it into DispatchContext, which the screens render from.
 * Every transition goes through an RPC first and local state changes only
 * after the server accepts it; on any failure the provider re-reads the row.
 *
 * Before this, the execution console changed local state only, and three
 * independent writers (a refetch on every requests change, the dev bridge
 * poll, cross-tab BroadcastChannel/localStorage) overwrote it — so switching
 * tabs appeared to reset the job. DispatchProvider runs with
 * inboundSync={false} on this surface so this provider is the only writer.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { useDispatch } from './DispatchContext';
import { parseGeoPoint } from '../hooks/useLiveTechnicianTracking';
import type { Database } from '../types/database';
import type { DispatchJob, DispatchStatus, ExecutionStep, PriceAdjustmentReason } from '../types/dispatch';

type RequestRow = Database['public']['Tables']['requests']['Row'];
type RequestStatus = Database['public']['Enums']['request_status'];
type RequestWithJoins = RequestRow & {
  service_categories: { slug: string; name: string } | null;
  client: { name: string; phone: string | null } | null;
  family_member: { name: string; relation: string; phone: string | null } | null;
};

/** Transitions the execution console may request via advance_request_status. */
export type ConsoleTransition = 'en_route' | 'arrived' | 'in_progress';

const ACTIVE_STATUSES: RequestStatus[] = ['accepted', 'en_route', 'arrived', 'in_progress'];
const TERMINAL_STATUSES: RequestStatus[] = ['completed', 'cancelled', 'declined', 'unfulfilled'];
const REQUEST_SELECT =
  '*, service_categories(slug, name), client:client_id(name, phone), family_member:family_member_id(name, relation, phone)';

/** Alert response window shown by IncomingAlert. */
export const ALERT_WINDOW_SECONDS = 45;

const DISPATCH_STATUS: Record<RequestStatus, DispatchStatus> = {
  pending: 'requested',
  accepted: 'accepted',
  en_route: 'en-route',
  arrived: 'arrived',
  in_progress: 'in-progress',
  completed: 'completed',
  cancelled: 'cancelled',
  declined: 'declined',
  unfulfilled: 'unfulfilled',
};

const EXECUTION_STEP: Record<RequestStatus, ExecutionStep> = {
  pending: 'accepted',
  accepted: 'accepted',
  en_route: 'en-route',
  arrived: 'arrived',
  in_progress: 'in-progress',
  completed: 'completed',
  cancelled: 'accepted',
  declined: 'accepted',
  unfulfilled: 'accepted',
};

function mapRequestToJob(r: RequestWithJoins): DispatchJob {
  const coords = parseGeoPoint(r.service_location);
  const isFamily = Boolean(r.family_member_id || r.family_member);
  return {
    id: r.id,
    service: r.service_categories?.slug ?? 'service',
    priority: r.priority ?? 'medium',
    symptoms: r.symptoms ?? [],
    description: r.description ?? '',
    location: r.address_text || (r.address_line + (r.area ? `, ${r.area}` : '')),
    // contact_name/contact_phone are snapshotted server-side at creation
    // (snapshot_request_contact), from the family member when there is one.
    customerName: r.contact_name || (isFamily ? r.family_member?.name : r.client?.name) || 'Customer',
    customerPhone: r.contact_phone || (isFamily ? r.family_member?.phone : r.client?.phone) || '',
    requesterName: r.client?.name,
    requesterPhone: r.client?.phone ?? undefined,
    requestedForMemberId: r.family_member_id ?? undefined,
    requestedForRelation: r.family_member?.relation ?? r.family_member?.name ?? undefined,
    estimatedTotal: Number(r.estimated_total),
    finalPrice: r.final_price !== null ? Number(r.final_price) : undefined,
    priceAdjustmentReason: r.price_adjustment_reason ?? undefined,
    priceAdjustmentNotes: r.price_adjustment_notes ?? undefined,
    status: DISPATCH_STATUS[r.status],
    executionStep: EXECUTION_STEP[r.status],
    technicianId: r.technician_id ?? undefined,
    serviceLatitude: coords?.latitude,
    serviceLongitude: coords?.longitude,
    landmarkAndInstructions: r.address_notes ?? undefined,
    searchRadiusKm: r.search_radius_km ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
    attachments: [],
  };
}

function friendlyRpcError(message: string): string {
  if (message.includes('invalid_transition')) return 'That step is no longer valid for this job — it has been refreshed from the server.';
  if (message.includes('not_a_participant')) return 'This job is no longer assigned to you.';
  if (message.includes('already_claimed')) return 'Another technician already claimed this request.';
  if (message.includes('technician_not_verified')) return 'Your account must be verified before accepting jobs.';
  if (message.includes('cost_addition_not_approved')) return 'The final price exceeds the estimate without an approved cost addition from the client.';
  if (message.includes('unsettled_cost_addition')) return 'A cost addition is still awaiting client approval.';
  return message;
}

interface ActiveTechnicianJobValue {
  /** id of the technician's non-terminal request, or null. */
  activeRequestId: string | null;
  /** id of the pending request currently offered as an alert, or null. */
  pendingRequestId: string | null;
  loading: boolean;
  /** True while a transition RPC is in flight. */
  mutating: boolean;
  error: string | null;
  notice: string | null;
  clearMessages: () => void;
  refresh: () => Promise<void>;
  accept: (requestId: string) => Promise<void>;
  decline: (requestId: string) => void;
  advance: (next: ConsoleTransition) => Promise<boolean>;
  settle: (finalPrice: number, reason?: PriceAdjustmentReason, notes?: string) => Promise<boolean>;
  /** Epoch ms when the alert window for a request closes (fixed on first sight). */
  alertDeadline: (requestId: string) => number;
}

const ActiveTechnicianJobContext = createContext<ActiveTechnicianJobValue | null>(null);

export function ActiveTechnicianJobProvider({ children }: { children: ReactNode }) {
  const { userId, role } = useAuth();
  const { job, replaceJob, updateJob, declineJob } = useDispatch();

  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const jobRef = useRef(job);
  jobRef.current = job;
  const refreshSeq = useRef(0);
  const declinedIds = useRef(new Set<string>());
  const alertSeenAt = useRef(new Map<string, number>());

  const techId = role === 'technician' ? userId : null;

  const refresh = useCallback(async () => {
    if (!techId) return;
    // Only the newest refresh may write: an older response resolving late
    // must not overwrite a newer one.
    const seq = ++refreshSeq.current;

    const { data: activeRows, error: activeErr } = await supabase
      .from('requests')
      .select(REQUEST_SELECT)
      .eq('technician_id', techId)
      .in('status', ACTIVE_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (seq !== refreshSeq.current) return;
    if (activeErr) {
      console.warn('[technician] active request query failed:', activeErr.message);
      setLoading(false);
      return; // keep current state rather than clearing on a transient error
    }

    const active = (activeRows as unknown as RequestWithJoins[] | null)?.[0];
    if (active) {
      setActiveRequestId(active.id);
      setPendingRequestId(null);
      replaceJob(mapRequestToJob(active));
      setLoading(false);
      return;
    }
    setActiveRequestId(null);

    // RLS (requests_select_eligible_technician) limits this to pending
    // requests in the technician's categories, radius and verification.
    const { data: pendingRows, error: pendingErr } = await supabase
      .from('requests')
      .select(REQUEST_SELECT)
      .eq('status', 'pending')
      .is('technician_id', null)
      .order('created_at', { ascending: false })
      .limit(10);
    if (seq !== refreshSeq.current) return;
    if (pendingErr) console.warn('[technician] pending request query failed:', pendingErr.message);

    const pending = (pendingRows as unknown as RequestWithJoins[] | null)?.find(
      (row) => !declinedIds.current.has(row.id),
    );
    if (pending) {
      setPendingRequestId(pending.id);
      if (!alertSeenAt.current.has(pending.id)) alertSeenAt.current.set(pending.id, Date.now());
      replaceJob(mapRequestToJob(pending));
    } else {
      // Nothing active or offered: the console returns to standby. This
      // includes a just-settled job (ActiveJob renders standby for any
      // non-active status), whichever of the settle RPC response or its
      // Realtime event arrives first.
      setPendingRequestId(null);
      replaceJob(null);
    }
    setLoading(false);
  }, [techId, replaceJob]);

  const accept = useCallback(
    async (requestId: string) => {
      if (!techId) throw new Error('Sign in as a technician to accept requests.');
      setMutating(true);
      setError(null);
      try {
        const { error: rpcErr } = await supabase.rpc('accept_request', {
          p_request_id: requestId,
          p_technician_id: techId,
        });
        if (rpcErr) {
          await refresh();
          throw new Error(friendlyRpcError(rpcErr.message));
        }
        setActiveRequestId(requestId);
        setPendingRequestId(null);
        await refresh();
      } finally {
        setMutating(false);
      }
    },
    [techId, refresh],
  );

  const decline = useCallback(
    (requestId: string) => {
      // Declining a broadcast is private to this technician (CLAUDE.md §4.5):
      // no server state changes, the request just stops being offered here.
      declinedIds.current.add(requestId);
      declineJob();
      void refresh();
    },
    [declineJob, refresh],
  );

  const advance = useCallback(
    async (next: ConsoleTransition) => {
      const requestId = activeRequestId;
      if (!requestId || mutating) return false;
      setMutating(true);
      setError(null);
      try {
        const { data, error: rpcErr } = await supabase.rpc('advance_request_status', {
          p_request_id: requestId,
          p_next_status: next,
        });
        if (rpcErr || !data) {
          setError(friendlyRpcError(rpcErr?.message ?? 'Status update failed'));
          await refresh();
          return false;
        }
        const row = data as RequestRow;
        if (jobRef.current?.id === row.id) {
          updateJob({ status: DISPATCH_STATUS[row.status], executionStep: EXECUTION_STEP[row.status] });
        }
        return true;
      } finally {
        setMutating(false);
      }
    },
    [activeRequestId, mutating, refresh, updateJob],
  );

  const settle = useCallback(
    async (finalPrice: number, reason?: PriceAdjustmentReason, notes?: string) => {
      const requestId = activeRequestId;
      if (!requestId) return false;
      setMutating(true);
      setError(null);
      try {
        const { error: rpcErr } = await supabase.rpc('settle_job_payment', {
          p_request_id: requestId,
          p_final_price: finalPrice,
          ...(reason ? { p_reason: reason } : {}),
          ...(notes ? { p_notes: notes } : {}),
        });
        if (rpcErr) {
          setError(`Settlement failed: ${friendlyRpcError(rpcErr.message)}`);
          await refresh();
          return false;
        }
        updateJob({
          finalPrice,
          priceAdjustmentReason: reason,
          priceAdjustmentNotes: notes || undefined,
          status: 'completed',
          executionStep: 'completed',
        });
        setActiveRequestId(null);
        void refresh();
        return true;
      } finally {
        setMutating(false);
      }
    },
    [activeRequestId, refresh, updateJob],
  );

  const alertDeadline = useCallback((requestId: string) => {
    let seen = alertSeenAt.current.get(requestId);
    if (seen === undefined) {
      seen = Date.now();
      alertSeenAt.current.set(requestId, seen);
    }
    return seen + ALERT_WINDOW_SECONDS * 1000;
  }, []);

  const clearMessages = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  // Initial load, and resync whenever the tab becomes visible again.
  useEffect(() => {
    if (!techId) return;
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [techId, refresh]);

  // Incoming alerts + assignments made elsewhere (e.g. accepted on another
  // device). The socket reporting SUBSCRIBED precedes the server confirming
  // the postgres_changes binding ("Subscribed to PostgreSQL"); rows written in
  // between are never delivered. Refreshing on that confirmation — which also
  // arrives after every reconnect — recovers anything missed.
  useEffect(() => {
    if (!techId) return;
    const channel = supabase
      .channel(`technician-alerts-${techId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: 'status=eq.pending' }, () => {
        void refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `technician_id=eq.${techId}` }, () => {
        void refresh();
      })
      .on('system', {}, (payload: { extension?: string; status?: string }) => {
        if (payload.extension === 'postgres_changes' && payload.status === 'ok') void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [techId, refresh]);

  // The active request itself: client cancellations and any status change
  // made outside this tab arrive here immediately.
  useEffect(() => {
    if (!techId || !activeRequestId) return;
    const channel = supabase
      .channel(`technician-active-${activeRequestId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'requests', filter: `id=eq.${activeRequestId}` },
        (payload) => {
          const row = payload.new as RequestRow;
          if (row.status === 'cancelled') {
            setNotice('The client cancelled this request.');
          }
          if (TERMINAL_STATUSES.includes(row.status) && row.status !== 'completed') {
            void refresh();
            return;
          }
          if (jobRef.current?.id === row.id) {
            updateJob({
              status: DISPATCH_STATUS[row.status],
              executionStep: EXECUTION_STEP[row.status],
              ...(row.final_price !== null ? { finalPrice: Number(row.final_price) } : {}),
            });
          }
          // Settled (possibly from another session): back to standby.
          if (row.status === 'completed') {
            setActiveRequestId(null);
            void refresh();
          }
        },
      )
      .on('system', {}, (payload: { extension?: string; status?: string }) => {
        if (payload.extension === 'postgres_changes' && payload.status === 'ok') void refresh();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [techId, activeRequestId, refresh, updateJob]);

  const value = useMemo<ActiveTechnicianJobValue>(
    () => ({
      activeRequestId,
      pendingRequestId,
      loading,
      mutating,
      error,
      notice,
      clearMessages,
      refresh,
      accept,
      decline,
      advance,
      settle,
      alertDeadline,
    }),
    [activeRequestId, pendingRequestId, loading, mutating, error, notice, clearMessages, refresh, accept, decline, advance, settle, alertDeadline],
  );

  return <ActiveTechnicianJobContext.Provider value={value}>{children}</ActiveTechnicianJobContext.Provider>;
}

export function useActiveTechnicianJob(): ActiveTechnicianJobValue {
  const ctx = useContext(ActiveTechnicianJobContext);
  if (!ctx) throw new Error('useActiveTechnicianJob must be used inside ActiveTechnicianJobProvider');
  return ctx;
}

/** For screens that may also render outside the technician app. */
export function useOptionalActiveTechnicianJob(): ActiveTechnicianJobValue | null {
  return useContext(ActiveTechnicianJobContext);
}
