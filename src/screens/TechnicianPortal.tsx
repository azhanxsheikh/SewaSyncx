import { useState } from 'react';
import TechDashboard from './technician/TechDashboard';
import IncomingAlert from './technician/IncomingAlert';
import ActiveJob from './technician/ActiveJob';
import JobHistory from './technician/JobHistory';
import { useDispatch } from '../context/DispatchContext';

type PortalTab = 'dashboard' | 'alerts' | 'active' | 'history';

export default function TechnicianPortal() {
  const [tab, setTab] = useState<PortalTab>('dashboard');
  const { job } = useDispatch();
  const hasAlert = job?.status === 'requested' || job?.status === 'searching';
  const hasActive = Boolean(job && ['accepted', 'en-route', 'arrived', 'in-progress'].includes(job.status));

  const content = tab === 'alerts'
    ? <IncomingAlert onAccepted={() => setTab('active')} />
    : tab === 'active'
    ? <ActiveJob />
    : tab === 'history'
    ? <JobHistory />
    : <TechDashboard onOpenAlerts={() => setTab('alerts')} onOpenActive={() => setTab('active')} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/95 px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 font-display font-800">SH</div>
            <div><p className="font-display font-800">Technician Portal</p><p className="text-xs text-slate-400">SOS HomeFix Dispatch</p></div>
          </div>
          <div className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Rahul Kumar <span className="text-slate-500">|</span> Online</div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-6 lg:flex-row">
        <nav className="flex shrink-0 gap-2 overflow-x-auto lg:w-52 lg:flex-col">
          {(['dashboard', 'alerts', 'active', 'history'] as PortalTab[]).map(item => (
            <button key={item} onClick={() => setTab(item)} className={`flex items-center justify-between whitespace-nowrap rounded-xl px-4 py-3 text-left text-sm font-600 capitalize transition-colors ${tab === item ? 'bg-red-500 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}>
              {item === 'alerts' ? 'Incoming alerts' : item === 'active' ? 'Active job' : item}
              {item === 'alerts' && hasAlert && <span className="rounded-full bg-white px-2 py-0.5 text-xs text-red-600">1</span>}
              {item === 'active' && hasActive && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
            </button>
          ))}
        </nav>
        <main className="min-w-0 flex-1">{content}</main>
      </div>
    </div>
  );
}
