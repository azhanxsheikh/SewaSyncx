import { useEffect, useState, type ReactNode } from 'react';
import TechnicianPortal from '../../../src/screens/TechnicianPortal';
import { DispatchProvider } from '../../../src/context/DispatchContext';
import { AuthProvider, useAuth } from '../../../packages/shared/src/auth';
import LoginPage from './components/auth/LoginPage';
import { DataProvider } from '../../../src/context/DataProvider';
import { useTechnicianBroadcaster } from './hooks/useTechnicianBroadcaster';
import { ActiveTechnicianJobProvider } from './context/ActiveTechnicianJobContext';

function TechnicianBroadcastIndicator() {
  const { isBroadcasting, isSimulating, currentCoordinates, toggleSimulation } = useTechnicianBroadcaster();
  if (!isBroadcasting) return null;
  return (
    <div className="fixed bottom-3 right-3 z-[9999] flex items-center gap-2 rounded-full bg-white/95 border border-slate-200 px-3 py-1.5 text-xs text-slate-800 shadow-xl backdrop-blur-md">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span className="font-semibold text-emerald-600">
        {isSimulating ? 'Simulating Route' : 'GPS Live'}
      </span>
      {currentCoordinates && (
        <span className="text-[10px] text-slate-500 font-mono">
          ({currentCoordinates.latitude.toFixed(4)}, {currentCoordinates.longitude.toFixed(4)})
        </span>
      )}
      <button
        type="button"
        onClick={toggleSimulation}
        className="ml-1 rounded px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-medium transition-colors"
      >
        {isSimulating ? 'Use Real GPS' : 'Simulate'}
      </button>
    </div>
  );
}

// Job state is loaded, transitioned and kept live by
// ActiveTechnicianJobProvider (src/context/ActiveTechnicianJobContext.tsx).
function TechnicianShell({ children }: { children: ReactNode }) {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Connecting to Technician Dispatch Radar...</p>
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
        theme="light"
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
        theme="light"
        initialError="ACCESS DENIED: Technician portal is restricted to registered technicians."
      />
    );
  }

  return (
    <DispatchProvider inboundSync={false}>
      <ActiveTechnicianJobProvider>
        <TechnicianShell>
          <TechnicianPortal />
        </TechnicianShell>
      </ActiveTechnicianJobProvider>
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
