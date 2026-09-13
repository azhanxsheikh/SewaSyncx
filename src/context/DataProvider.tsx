/**
 * Real Supabase queries for the signed-in user's own records, replacing the
 * fixture data most hooks in src/hooks/ used to return unconditionally.
 *
 * Fetched once per session (on sign-in) rather than per-hook-call, so every
 * hook stays a synchronous selector over this context — no hook gained a
 * loading state, and CLAUDE.md's zero-white-screen rule is preserved the
 * same way DispatchContext already preserves it: `ready` starts false and
 * every array/record defaults to empty/null, so a screen renders its
 * existing "no data yet" branch instead of blocking on a promise.
 *
 * What's deliberately NOT here, and why:
 *  - A general "browse all technicians" list. technician_profiles is
 *    browsable by anyone verified (technician_profiles_select_verified),
 *    but a technician's *name* only becomes visible to a client through
 *    users_select_assigned_technician — i.e. only once actually assigned to
 *    one of that client's requests. There is no real query for "list of
 *    technicians with names" outside that relationship; useTechnicians()
 *    stays fixture-backed for that reason (see src/hooks/useTechnicians.ts).
 *  - Admin data beyond requests/disputes. Of the Admin console's 5 mock
 *    datasets, only these two have a real backing table; the other three
 *    (compliance/fatigue registry, fare-variance rollups, collusion
 *    detection, photo-mismatch review) have none — that's new schema work,
 *    not a rewire, and stays out of scope here.
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
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import type {
  BookingRecord,
  ClientStats,
  FamilyMember,
  SavedAddress,
  ScheduledCategory,
  ServiceCategory,
  TechnicianJobRecord,
} from '../types/domain';
import type { Database } from '../types/database';

type RequestRow = Database['public']['Tables']['requests']['Row'];
type DisputeRow = Database['public']['Tables']['disputes']['Row'];

export interface ClientProfileData {
  name: string;
  greetingName: string;
  initial: string;
  phone: string;
  email: string;
  areaLabel: string;
}

interface DataState {
  ready: boolean;
  serviceCategories: ServiceCategory[];
  scheduledCategories: ScheduledCategory[];
  savedAddresses: SavedAddress[];
  familyMembers: FamilyMember[];
  clientProfile: ClientProfileData | null;
  clientStats: ClientStats | null;
  bookingHistory: BookingRecord[];
  technicianJobHistory: TechnicianJobRecord[];
  /** Most recent non-terminal request for this client — the closest real
   *  stand-in for "current request" until request creation itself is real
   *  (DispatchContext still simulates that locally). Null when there isn't
   *  one, or before the initial fetch completes. */
  currentRequest: RequestRow | null;
  /** Completed requests where the settled price differs from the estimate
   *  — kept fresh by Realtime for the Admin console. */
  varianceRequests: RequestRow[];
  /** Open disputes — kept fresh by Realtime for the Admin console. */
  disputes: DisputeRow[];
  /**
   * Set by the Realtime handler the instant this client's own current
   * request transitions to `completed`; cleared by `clearJustCompleted()`.
   * A screen watches this to auto-navigate to the invoice view — see
   * App.tsx's effect. This is a navigation signal only: DigitalInvoice.tsx
   * still renders from DispatchContext's own (still-simulated) job state,
   * not from this real request row, since those two aren't unified yet.
   */
  justCompletedRequestId: string | null;
}

interface DataContextValue extends DataState {
  clearJustCompleted: () => void;
}

const EMPTY_STATE: DataState = {
  ready: false,
  serviceCategories: [],
  scheduledCategories: [],
  savedAddresses: [],
  familyMembers: [],
  clientProfile: null,
  clientStats: null,
  bookingHistory: [],
  technicianJobHistory: [],
  currentRequest: null,
  varianceRequests: [],
  disputes: [],
  justCompletedRequestId: null,
};

const DataContext = createContext<DataContextValue>({
  ...EMPTY_STATE,
  clearJustCompleted: () => {},
});

// ---------------------------------------------------------------------------
// Row -> view-model mapping
// ---------------------------------------------------------------------------

function mapServiceCategory(row: Database['public']['Tables']['service_categories']['Row']): ServiceCategory {
  return {
    // Matches the fixture convention (src/mocks/fixtures.ts) that the rest
    // of the app's state — selectedService, symptom/question lookups —
    // already keys on: the slug, not the real UUID primary key. Screens
    // pass this id straight back into diagnosticQuestions/symptomTags
    // (still fixture-backed, keyed by slug), so switching to row.id would
    // silently break every one of those lookups.
    id: row.slug,
    icon: row.icon,
    name: row.name,
    description: row.description ?? '',
    basePrice: row.sos_base_price ?? 0,
    emergencyFee: row.sos_emergency_fee ?? 0,
    // SCHEMA-GAP (domain.ts): presentation-only, not persisted. A stable,
    // deterministic pick keeps a category's color consistent across loads.
    color: ['red', 'blue', 'cyan', 'amber', 'orange'][
      Math.abs(hashCode(row.slug)) % 5
    ],
  };
}

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
  }
  return hash;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatStatus(status: RequestRow['status']): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function DataProvider({ children }: { children: ReactNode }) {
  const { status, userId, role, staffRole } = useAuth();
  const [state, setState] = useState<DataState>(EMPTY_STATE);

  const loadClientData = useCallback(async (uid: string): Promise<Partial<DataState>> => {
    const [userRow, addressRows, familyRows, requestRows, reviewRows] = await Promise.all([
      supabase.from('users').select('name, phone, email, default_street_address').eq('id', uid).maybeSingle(),
      supabase.from('saved_addresses').select('*').eq('user_id', uid),
      supabase.from('family_members').select('*').eq('owner_id', uid),
      supabase
        .from('requests')
        .select('*, service_categories(name, icon), technician:technician_id(name)')
        .eq('client_id', uid)
        .order('created_at', { ascending: false }),
      supabase.from('reviews').select('rating').eq('client_id', uid),
    ]);

    if (userRow.error) console.warn('[data] failed to load client profile:', userRow.error.message);
    if (addressRows.error) console.warn('[data] failed to load saved addresses:', addressRows.error.message);
    if (familyRows.error) console.warn('[data] failed to load family members:', familyRows.error.message);
    if (requestRows.error) console.warn('[data] failed to load requests:', requestRows.error.message);
    if (reviewRows.error) console.warn('[data] failed to load reviews:', reviewRows.error.message);

    const clientProfile: ClientProfileData | null = userRow.data
      ? {
          name: userRow.data.name,
          greetingName: userRow.data.name.split(' ')[0] ?? userRow.data.name,
          initial: userRow.data.name.charAt(0).toUpperCase(),
          phone: userRow.data.phone ?? '',
          email: userRow.data.email ?? '',
          areaLabel: userRow.data.default_street_address ?? '',
        }
      : null;

    const savedAddresses: SavedAddress[] = (addressRows.data ?? []).map((row) => ({
      id: row.id,
      label: row.label,
      icon: row.icon ?? '📍',
      address: row.address_line,
      area: row.area,
    }));

    const familyMembers: FamilyMember[] = (familyRows.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      relation: row.relation,
      emoji: row.emoji ?? '👤',
      address: row.address_line,
      area: row.area,
      phone: row.phone ?? '',
      color: 'blue',
    }));

    type RequestWithJoins = RequestRow & {
      service_categories: { name: string; icon: string } | null;
      technician: { name: string } | null;
    };
    const requests = (requestRows.data ?? []) as unknown as RequestWithJoins[];

    const bookingHistory: BookingRecord[] = requests.map((r) => ({
      id: r.id,
      service: r.service_categories?.name ?? 'Service',
      icon: r.service_categories?.icon ?? '🔧',
      technician: r.technician?.name ?? 'Unassigned',
      date: formatDate(r.created_at),
      status: formatStatus(r.status),
      amount: `₹${r.final_price ?? r.estimated_total}`,
      type: r.scheduled_at ? 'scheduled' : 'sos',
      rating: 0,
    }));

    const nonTerminalStatuses: RequestRow['status'][] = ['pending', 'accepted', 'en_route', 'arrived', 'in_progress'];
    const currentRequest = requests.find((r) => nonTerminalStatuses.includes(r.status)) ?? null;

    const ratings = (reviewRows.data ?? []).map((r) => r.rating);
    const clientStats: ClientStats = {
      servicesUsed: requests.filter((r) => r.status === 'completed').length,
      sosUsed: requests.filter((r) => r.status === 'completed' && !r.scheduled_at).length,
      averageRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
    };

    return { clientProfile, savedAddresses, familyMembers, bookingHistory, currentRequest, clientStats };
  }, []);

  const loadTechnicianData = useCallback(async (uid: string): Promise<Partial<DataState>> => {
    const { data, error } = await supabase
      .from('requests')
      .select('*, service_categories(name, icon), client:client_id(name)')
      .eq('technician_id', uid)
      .order('created_at', { ascending: false });

    if (error) console.warn('[data] failed to load technician job history:', error.message);

    type RequestWithJoins = RequestRow & {
      service_categories: { name: string; icon: string } | null;
      client: { name: string } | null;
    };
    const requests = (data ?? []) as unknown as RequestWithJoins[];

    const technicianJobHistory: TechnicianJobRecord[] = requests.map((r) => ({
      id: r.id,
      service: r.service_categories?.name ?? 'Service',
      customer: r.client?.name ?? 'Client',
      date: formatDate(r.created_at),
      amount: `₹${r.final_price ?? r.estimated_total}`,
      status: formatStatus(r.status),
    }));

    return { technicianJobHistory };
  }, []);

  const loadCatalogue = useCallback(async (): Promise<Partial<DataState>> => {
    const { data, error } = await supabase.from('service_categories').select('*').order('name');
    if (error) {
      console.warn('[data] failed to load service categories:', error.message);
      return {};
    }
    const serviceCategories = (data ?? []).map(mapServiceCategory);
    const scheduledCategories: ScheduledCategory[] = (data ?? []).map((row) => ({
      id: row.slug, // see mapServiceCategory's comment on why slug, not row.id
      icon: row.icon,
      name: row.name,
      price: row.sos_base_price ?? 0,
    }));
    return { serviceCategories, scheduledCategories };
  }, []);

  const loadStaffData = useCallback(async (): Promise<Partial<DataState>> => {
    const [requestRows, disputeRows] = await Promise.all([
      supabase.from('requests').select('*').eq('status', 'completed').order('completed_at', { ascending: false }).limit(50),
      supabase.from('disputes').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (requestRows.error) console.warn('[data] failed to load requests for admin:', requestRows.error.message);
    if (disputeRows.error) console.warn('[data] failed to load disputes:', disputeRows.error.message);

    const varianceRequests = (requestRows.data ?? []).filter(
      (r) => r.final_price !== null && r.final_price !== r.estimated_total,
    );
    return { varianceRequests, disputes: disputeRows.data ?? [] };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (status !== 'signed-in' || !userId) {
      setState(EMPTY_STATE);
      return;
    }

    (async () => {
      const catalogue = await loadCatalogue();
      if (cancelled) return;

      let roleData: Partial<DataState> = {};
      if (role === 'client') {
        roleData = await loadClientData(userId);
      } else if (role === 'technician') {
        roleData = await loadTechnicianData(userId);
      } else if (staffRole) {
        roleData = await loadStaffData();
      }
      if (cancelled) return;

      setState({ ...EMPTY_STATE, ...catalogue, ...roleData, ready: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [status, userId, role, staffRole, loadCatalogue, loadClientData, loadTechnicianData, loadStaffData]);

  // ---------------------------------------------------------------------
  // Realtime
  // ---------------------------------------------------------------------

  // Client: refresh on any change to one of this client's requests, and flag
  // justCompletedRequestId when one transitions to 'completed' so a screen
  // can auto-navigate to the invoice view (see App.tsx).
  useEffect(() => {
    if (role !== 'client' || !userId) return;
    const channel = supabase
      .channel(`client-requests-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'requests', filter: `client_id=eq.${userId}` },
        (payload) => {
          const newRow = payload.new as RequestRow | undefined;
          loadClientData(userId).then((patch) =>
            setState((s) => ({
              ...s,
              ...patch,
              justCompletedRequestId: newRow?.status === 'completed' ? newRow.id : s.justCompletedRequestId,
            })),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, userId, loadClientData]);

  // Technician: new pending requests. RLS (requests_select_eligible_technician)
  // already scopes delivery to this technician's own categories and radius —
  // no client-side category filter needed.
  useEffect(() => {
    if (role !== 'technician' || !userId) return;
    const channel = supabase
      .channel(`technician-pending-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'requests', filter: 'status=eq.pending' },
        () => {
          loadTechnicianData(userId).then((patch) => setState((s) => ({ ...s, ...patch })));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, userId, loadTechnicianData]);

  // Admin: completed requests (variance filtered client-side — postgres_changes
  // filters are simple column equality, not a cross-column "!=") and disputes.
  useEffect(() => {
    if (!staffRole) return;
    const channel = supabase
      .channel('admin-ops')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'requests', filter: 'status=eq.completed' },
        () => {
          loadStaffData().then((patch) => setState((s) => ({ ...s, ...patch })));
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, () => {
        loadStaffData().then((patch) => setState((s) => ({ ...s, ...patch })));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [staffRole, loadStaffData]);

  const clearJustCompleted = useCallback(() => {
    setState((s) => (s.justCompletedRequestId ? { ...s, justCompletedRequestId: null } : s));
  }, []);

  const value = useMemo(() => ({ ...state, clearJustCompleted }), [state, clearJustCompleted]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  return useContext(DataContext);
}
