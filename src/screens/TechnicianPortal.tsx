import { useEffect, useState } from 'react';
import TechDashboard from './technician/TechDashboard';
import IncomingAlert from './technician/IncomingAlert';
import ActiveJob from './technician/ActiveJob';
import JobHistory from './technician/JobHistory';
import TechnicianProfilePage from './technician/TechnicianProfilePage';
import { useDispatch } from '../context/DispatchContext';
import { useAuth } from '../context/AuthContext';
import { useOptionalActiveTechnicianJob } from '../context/ActiveTechnicianJobContext';

type PortalTab = 'dashboard' | 'alerts' | 'active' | 'history' | 'profile';

export default function TechnicianPortal() {
  const [tab, setTab] = useState<PortalTab>('dashboard');
  const { job } = useDispatch();
  const { session, signOut } = useAuth();
  const refreshJob = useOptionalActiveTechnicianJob()?.refresh;

  // Every tab switch re-reads the technician's request from public.requests,
  // so Dashboard / Incoming alerts / Active job always render server state.
  useEffect(() => {
    void refreshJob?.();
  }, [tab, refreshJob]);
  const hasAlert = job?.status === 'requested' || job?.status === 'searching';
  const hasActive = Boolean(job && ['accepted', 'en-route', 'en_route', 'arrived', 'in-progress', 'in_progress'].includes(job.status));

  const content = tab === 'alerts'
    ? <IncomingAlert onAccepted={() => setTab('active')} />
    : tab === 'active'
    ? <ActiveJob onOpenAlerts={() => setTab('alerts')} />
    : tab === 'history'
    ? <JobHistory />
    : tab === 'profile'
    ? <TechnicianProfilePage />
    : <TechDashboard onOpenAlerts={() => setTab('alerts')} onOpenActive={() => setTab('active')} />;

  return (
    <div className="technician-portal min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/95 px-4 sm:px-5 py-3 sm:py-4 sticky top-0 z-40 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 font-display font-800 text-sm sm:text-base text-white shadow-md shadow-red-500/20">SH</div>
            <div className="min-w-0">
              <p className="font-display font-800 text-sm sm:text-base leading-tight truncate text-slate-900">Technician Portal</p>
              <p className="text-[10px] sm:text-xs text-slate-500 truncate">SOS HomeFix Dispatch</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <button
              type="button"
              onClick={() => setTab('profile')}
              className={`hover:text-red-600 transition-colors truncate max-w-[130px] sm:max-w-[160px] ${
                tab === 'profile' ? 'text-red-600 font-bold underline' : 'text-slate-700'
              }`}
              title="Manage Technician Profile"
            >
              {session?.user.email ?? 'Profile'}
            </button>
            <button
              type="button"
              onClick={() => setTab('profile')}
              className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                tab === 'profile'
                  ? 'bg-red-500 text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>👤 Profile</span>
            </button>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="text-emerald-600 font-semibold">Online</span>
            <span className="text-slate-300">|</span>
            <button onClick={() => signOut()} className="text-slate-500 hover:text-red-600 underline text-xs sm:text-sm">Sign out</button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-5 py-6 lg:flex-row">
        <nav className="flex shrink-0 gap-2 overflow-x-auto pb-1 lg:pb-0 lg:w-52 lg:flex-col scrollbar-none">
          {(['dashboard', 'alerts', 'active', 'history', 'profile'] as PortalTab[]).map(item => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`flex items-center justify-between whitespace-nowrap rounded-xl px-4 py-3 text-left text-sm font-600 capitalize transition-all ${
                tab === item
                  ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                  : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80 shadow-sm'
              }`}
            >
              {item === 'alerts' ? 'Incoming alerts' : item === 'active' ? 'Active job' : item === 'profile' ? 'Profile & skills' : item}
              {item === 'alerts' && hasAlert && <span className="rounded-full bg-white px-2 py-0.5 text-xs text-red-600 font-bold shadow-sm">1</span>}
              {item === 'active' && hasActive && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
            </button>
          ))}
        </nav>
        <main className="min-w-0 flex-1">{content}</main>
      </div>
    </div>
  );
}

