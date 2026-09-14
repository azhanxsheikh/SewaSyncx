import { useEffect, useRef } from 'react';
import { supabase } from '../../../../packages/shared/src/lib/supabase';

export type AdminRealtimeTable =
  | 'requests'
  | 'disputes'
  | 'technician_profiles'
  | 'invoices'
  | 'request_status_events'
  | 'request_attachments';

interface UseAdminRealtimeOptions {
  tables?: AdminRealtimeTable[];
  onChange: (table: AdminRealtimeTable) => void;
}

export function useAdminRealtime({
  tables = ['requests', 'disputes', 'technician_profiles', 'invoices'],
  onChange,
}: UseAdminRealtimeOptions) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const tablesKey = tables.join(',');

  useEffect(() => {
    const channelName = `admin-realtime-${Math.random().toString(36).slice(2, 9)}`;
    let channel = supabase.channel(channelName);

    tables.forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          onChangeRef.current(table);
        },
      );
    });

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tablesKey]);
}

export default useAdminRealtime;
