import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../../../packages/shared/src/lib/supabase';
import { useAuth } from '../../../../packages/shared/src/auth';
import { parseGeoPoint } from '../../../../src/hooks/useLiveTechnicianTracking';
import { haversineDistanceKm } from '../../../../src/lib/eta';
import type { Database } from '../../../../packages/shared/src/types/database';

type RequestRow = Database['public']['Tables']['requests']['Row'];

export interface IncomingAlertItem {
  id: string;
  category_id: string;
  status: string;
  priority: string;
  estimated_total: number;
  symptoms: string[];
  description: string | null;
  address_text: string | null;
  address_line: string | null;
  area: string | null;
  distance_km: number;
  created_at: string;
  service_location: unknown;
}

export function useIncomingAlerts() {
  const { userId, role } = useAuth();
  const [alerts, setAlerts] = useState<IncomingAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const techId = role === 'technician' ? userId : null;
  const categoriesRef = useRef<Set<string>>(new Set());
  const techLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Fetch technician's registered category IDs and current location
  const refreshTechContext = useCallback(async () => {
    if (!techId) return;

    try {
      const [catRes, locRes] = await Promise.all([
        supabase
          .from('technician_categories')
          .select('category_id')
          .eq('technician_id', techId),
        supabase
          .from('technician_locations')
          .select('location')
          .eq('technician_id', techId)
          .maybeSingle(),
      ]);

      if (catRes.data) {
        categoriesRef.current = new Set(catRes.data.map((c) => c.category_id));
      }

      if (locRes.data?.location) {
        const coords = parseGeoPoint(locRes.data.location);
        if (coords) {
          techLocationRef.current = coords;
        }
      } else {
        techLocationRef.current = { latitude: 28.6105, longitude: 77.432 };
      }
    } catch (err) {
      console.warn('[useIncomingAlerts] Error fetching technician context:', err);
    }
  }, [techId]);

  // Main fetch function for pending requests
  const fetchIncomingAlerts = useCallback(async () => {
    if (!techId) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    await refreshTechContext();

    try {
      // 1. Fetch pending unassigned requests and dismissals for this technician
      const [requestsRes, dismissalsRes] = await Promise.all([
        supabase
          .from('requests')
          .select('*')
          .eq('status', 'pending')
          .is('technician_id', null)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('request_technician_dismissals')
          .select('request_id')
          .eq('technician_id', techId),
      ]);

      if (requestsRes.error) {
        setError(requestsRes.error.message);
        setLoading(false);
        return;
      }

      const dismissedSet = new Set((dismissalsRes.data ?? []).map((d) => d.request_id));
      const registeredCats = categoriesRef.current;
      const techPos = techLocationRef.current ?? { latitude: 28.6105, longitude: 77.432 };

      const matchingAlerts: IncomingAlertItem[] = [];

      for (const req of (requestsRes.data as RequestRow[] | null) ?? []) {
        // Skip dismissed
        if (dismissedSet.has(req.id)) continue;

        // Verify category match if technician has registered categories
        if (registeredCats.size > 0 && !registeredCats.has(req.category_id)) {
          continue;
        }

        // Verify distance <= 20 km
        const reqCoords = parseGeoPoint(req.service_location);
        const distanceKm = reqCoords
          ? haversineDistanceKm(techPos.latitude, techPos.longitude, reqCoords.latitude, reqCoords.longitude)
          : 0;

        // Strict 20 km radius check
        if (distanceKm <= 20) {
          matchingAlerts.push({
            id: req.id,
            category_id: req.category_id,
            status: req.status,
            priority: req.priority ?? 'medium',
            estimated_total: Number(req.estimated_total),
            symptoms: (req.symptoms as string[]) ?? [],
            description: req.description,
            address_text: req.address_text,
            address_line: req.address_line,
            area: req.area,
            distance_km: Math.round(distanceKm * 10) / 10,
            created_at: req.created_at,
            service_location: req.service_location,
          });
        }
      }

      setAlerts(matchingAlerts);
    } catch (err) {
      console.error('[useIncomingAlerts] Failed to fetch alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch incoming alerts');
    } finally {
      setLoading(false);
    }
  }, [techId, refreshTechContext]);

  // Initial load
  useEffect(() => {
    void fetchIncomingAlerts();
  }, [fetchIncomingAlerts]);

  // Realtime WebSocket subscription: listen to INSERT and UPDATE on public.requests
  useEffect(() => {
    if (!techId) return;

    const channel = supabase
      .channel(`incoming-alerts-realtime-${techId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'requests' },
        (payload) => {
          const newReq = payload.new as RequestRow;
          if (newReq?.status === 'pending') {
            void fetchIncomingAlerts();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'requests' },
        (payload) => {
          const updReq = payload.new as RequestRow;
          // If a request changed to pending or was claimed/cancelled, refresh feed
          if (updReq?.status === 'pending' || updReq?.technician_id != null) {
            void fetchIncomingAlerts();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'request_technician_dismissals' },
        () => {
          void fetchIncomingAlerts();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [techId, fetchIncomingAlerts]);

  return {
    alerts,
    activeAlert: alerts[0] ?? null,
    loading,
    error,
    refetch: fetchIncomingAlerts,
  };
}

export default useIncomingAlerts;
