import { useEffect, useState, type ReactNode } from 'react';
import TechnicianPortal from '../../../src/screens/TechnicianPortal';
import { DispatchProvider, useDispatch } from '../../../src/context/DispatchContext';
import { AuthProvider, useAuth } from '../../../packages/shared/src/auth';
import LoginPage from './components/auth/LoginPage';
import { DataProvider } from '../../../src/context/DataProvider';
import { supabase } from '../../../packages/shared/src/lib/supabase';
import type { DispatchJob, DispatchStatus, ExecutionStep } from '../../../src/types/dispatch';
import { useTechnicianBroadcaster } from './hooks/useTechnicianBroadcaster';
import { parseGeoPoint } from '../../../src/hooks/useLiveTechnicianTracking';

function TechnicianBroadcastIndicator() {
  const { isBroadcasting, isSimulating, currentCoordinates, toggleSimulation } = useTechnicianBroadcaster();
  if (!isBroadcasting) return null;
  return (
    <div className="fixed bottom-3 right-3 z-[9999] flex items-center gap-2 rounded-full bg-slate-900/90 border border-emerald-500/40 px-3 py-1.5 text-xs text-slate-200 shadow-xl backdrop-blur-md">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span className="font-semibold text-emerald-400">
        {isSimulating ? 'Simulating Route' : 'GPS Live'}
      </span>
      {currentCoordinates && (
        <span className="text-[10px] text-slate-400">
          ({currentCoordinates.latitude.toFixed(4)}, {currentCoordinates.longitude.toFixed(4)})
        </span>
      )}
      <button
        type="button"
        onClick={toggleSimulation}
        className="ml-1 rounded px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
      >
        {isSimulating ? 'Use Real GPS' : 'Simulate'}
      </button>
    </div>
  );
}

function TechnicianDataLoader({ children }: { children: ReactNode }) {
  const { userId, role } = useAuth();
  const { updateJob } = useDispatch();

  useEffect(() => {
    if (!userId || role !== 'technician') return;
    const techId: string = userId;

    let cancelled = false;

    async function loadTechnicianRequests() {
      try {
        // Query active job assigned to this technician
        const { data: activeRows, error: activeErr } = await supabase
          .from('requests')
          .select('*, service_categories(slug, name), client:client_id(name, phone)')
          .eq('technician_id', techId)
          .in('status', ['accepted', 'en_route', 'arrived', 'in_progress'])
          .order('updated_at', { ascending: false })
          .limit(1);

        if (activeErr) {
          console.warn('[technician] error loading active request:', activeErr.message);
        }

        if (!cancelled && activeRows && activeRows.length > 0) {
          const r = activeRows[0];
          const dispatchStatus: DispatchStatus =
            r.status === 'en_route' ? 'en-route' : r.status === 'in_progress' ? 'in-progress' : (r.status as DispatchStatus);
          const executionStep: ExecutionStep =
            r.status === 'en_route' ? 'en-route' : r.status === 'in_progress' ? 'in-progress' : r.status === 'completed' ? 'completed' : 'accepted';

          const coords = parseGeoPoint(r.service_location);
          const mappedJob: DispatchJob = {
            id: r.id,
            service: r.service_categories?.slug || 'ac',
            priority: r.priority || 'medium',
            symptoms: r.symptoms || [],
            description: r.description || '',
            location: r.address_text || (r.address_line + (r.area ? `, ${r.area}` : '')),
            customerName: r.contact_name || r.client?.name || 'Abdullah Sheikh',
            customerPhone: r.contact_phone || r.client?.phone || '+91 98765 43210',
            estimatedTotal: Number(r.estimated_total),
            finalPrice: r.final_price ? Number(r.final_price) : undefined,
            status: dispatchStatus,
            executionStep,
            technicianId: techId,
            technicianName: 'Rahul Kumar',
            serviceLatitude: coords?.latitude,
            serviceLongitude: coords?.longitude,
            landmarkAndInstructions: r.address_notes || undefined,
            createdAt: new Date(r.created_at).getTime(),
            updatedAt: new Date(r.updated_at).getTime(),
            attachments: [],
          };
          updateJob(mappedJob);
          return;
        }

        // If no active job, query pending requests for the radar
        const { data: pendingRows, error: pendingErr } = await supabase
          .from('requests')
          .select('*, service_categories(slug, name), client:client_id(name, phone)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (pendingErr) {
          console.warn('[technician] error loading pending requests:', pendingErr.message);
        }

        if (!cancelled && pendingRows && pendingRows.length > 0) {
          const r = pendingRows[0];
          const coords = parseGeoPoint(r.service_location);
          const mappedJob: DispatchJob = {
            id: r.id,
            service: r.service_categories?.slug || 'electrical',
            priority: r.priority || 'medium',
            symptoms: r.symptoms || [],
            description: r.description || '',
            location: r.address_text || (r.address_line + (r.area ? `, ${r.area}` : '')),
            customerName: r.contact_name || r.client?.name || 'Customer',
            customerPhone: r.contact_phone || r.client?.phone || '',
            estimatedTotal: Number(r.estimated_total),
            status: 'requested',
            executionStep: 'accepted',
            serviceLatitude: coords?.latitude,
            serviceLongitude: coords?.longitude,
            landmarkAndInstructions: r.address_notes || undefined,
            createdAt: new Date(r.created_at).getTime(),
            updatedAt: new Date(r.updated_at).getTime(),
            attachments: [],
          };
          updateJob(mappedJob);
        }
      } catch (err) {
        console.error('[technician] error loading requests:', err);
      }
    }

    void loadTechnicianRequests();

    const channel = supabase
      .channel(`technician-radar-${techId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        void loadTechnicianRequests();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId, role, updateJob]);

  return (
    <>
      {children}
      <TechnicianBroadcastIndicator />
    </>
  );
}

function TechnicianAppInner() {
  const { status, role, signOut } = useAuth();
  const [deniedMsg, setDeniedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'signed-in' && role && role !== 'technician') {
      void signOut();
      setDeniedMsg('ACCESS DENIED: Technician portal is restricted to registered technicians.');
    }
  }, [status, role, signOut]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Connecting to Technician Dispatch Radar...</p>
        </div>
      </div>
    );
  }

  if (status === 'signed-out' || deniedMsg) {
    return (
      <LoginPage
        portal="technician"
        title="SewaSync Technician"
        subtitle="Sign in to see your live dispatch feed"
        theme="dark"
        initialError={deniedMsg}
        onSuccess={() => setDeniedMsg(null)}
      />
    );
  }

  if (role !== 'technician') {
    return (
      <LoginPage
        portal="technician"
        title="SewaSync Technician"
        subtitle="Sign in to see your live dispatch feed"
        theme="dark"
        initialError="ACCESS DENIED: Technician portal is restricted to registered technicians."
      />
    );
  }

  return (
    <DispatchProvider>
      <TechnicianDataLoader>
        <TechnicianPortal />
      </TechnicianDataLoader>
    </DispatchProvider>
  );
}

export default function TechnicianApp() {
  return (
    <AuthProvider>
      <DataProvider>
        <TechnicianAppInner />
      </DataProvider>
    </AuthProvider>
  );
}
