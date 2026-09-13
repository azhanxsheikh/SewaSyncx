import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { Database } from '../types/database';

type RequestRow = Database['public']['Tables']['requests']['Row'];
type RequestStatus = Database['public']['Enums']['request_status'];

const ACTIVE_STATUSES: RequestStatus[] = ['accepted', 'en_route', 'arrived', 'in_progress'];

export function useActiveTechnicianJob(): {
  activeJob: RequestRow | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { user, userId } = useAuth();
  const [activeJob, setActiveJob] = useState<RequestRow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const activeUid = user?.id || userId;

  const fetchActiveJob = useCallback(async () => {
    if (!activeUid) {
      setActiveJob(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: qErr } = await supabase
      .from('requests')
      .select('*')
      .eq('technician_id', activeUid)
      .in('status', ACTIVE_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (qErr) {
      console.warn('[activeJob] error querying active job:', qErr.message);
      setError(qErr.message);
      setActiveJob(null);
    } else {
      setActiveJob(data?.[0] ?? null);
    }
    setLoading(false);
  }, [activeUid]);

  useEffect(() => {
    fetchActiveJob();
  }, [fetchActiveJob]);

  return { activeJob, loading, error, refetch: fetchActiveJob };
}

export default useActiveTechnicianJob;
