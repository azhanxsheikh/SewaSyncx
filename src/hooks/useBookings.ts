import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { BookingRecord } from '../types/domain';
import type { Database } from '../types/database';

type RequestRow = Database['public']['Tables']['requests']['Row'];

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatStatus(s: string): string {
  if (s === 'completed') return 'Completed';
  if (s === 'cancelled') return 'Cancelled';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function useBookings(): {
  bookings: BookingRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { user, userId } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const activeUid = user?.id || userId;

  const fetchBookings = useCallback(async () => {
    if (!activeUid) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: qErr } = await supabase
      .from('requests')
      .select('*, service_categories(name, icon), technician:technician_id(name)')
      .eq('user_id', activeUid)
      .order('created_at', { ascending: false });

    if (qErr) {
      console.warn('[bookings] error querying user bookings:', qErr.message);
      setError(qErr.message);
      setBookings([]);
    } else {
      type RequestWithJoins = RequestRow & {
        service_categories: { name: string; icon: string } | null;
        technician: { name: string } | null;
      };
      const records: BookingRecord[] = ((data ?? []) as unknown as RequestWithJoins[]).map((r) => ({
        id: r.id,
        service: r.service_categories?.name ?? 'Emergency Service',
        icon: r.service_categories?.icon ?? '🔧',
        technician: r.technician?.name ?? 'Unassigned',
        date: formatDate(r.created_at),
        status: formatStatus(r.status),
        rawStatus: r.status,
        amount: `₹${r.final_price ?? r.estimated_total ?? 0}`,
        type: r.scheduled_at ? 'scheduled' : 'sos',
        rating: 0,
        description: r.description ?? undefined,
        priority: r.priority ?? undefined,
        estimatedTotal: r.estimated_total ? Number(r.estimated_total) : undefined,
        photos: (r as { photos?: string[] }).photos ?? [],
      }));
      setBookings(records);
    }
    setLoading(false);
  }, [activeUid]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return { bookings, loading, error, refetch: fetchBookings };
}

export default useBookings;
