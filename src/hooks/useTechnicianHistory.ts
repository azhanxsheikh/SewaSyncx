import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { TechnicianJobRecord } from '../types/domain';
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

export function useTechnicianHistory(): {
  history: TechnicianJobRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { user, userId } = useAuth();
  const [history, setHistory] = useState<TechnicianJobRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const activeUid = user?.id || userId;

  const fetchHistory = useCallback(async () => {
    if (!activeUid) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: qErr } = await supabase
      .from('requests')
      .select('*, service_categories(name, icon), client:client_id(name)')
      .eq('technician_id', activeUid)
      .in('status', ['completed', 'cancelled'])
      .order('created_at', { ascending: false });

    if (qErr) {
      console.warn('[history] error querying technician history:', qErr.message);
      setError(qErr.message);
      setHistory([]);
    } else {
      type RequestWithJoins = RequestRow & {
        service_categories: { name: string; icon: string } | null;
        client: { name: string } | null;
      };
      const records: TechnicianJobRecord[] = ((data ?? []) as unknown as RequestWithJoins[]).map((r) => ({
        id: r.id,
        service: r.service_categories?.name ?? 'Emergency Service',
        customer: r.client?.name ?? 'Client',
        date: formatDate(r.created_at),
        amount: `₹${r.final_price ?? r.estimated_total ?? 0}`,
        status: formatStatus(r.status),
      }));
      setHistory(records);
    }
    setLoading(false);
  }, [activeUid]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
}

export default useTechnicianHistory;
