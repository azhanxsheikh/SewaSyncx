import { useEffect } from 'react';
import { useDispatch } from '../../context/DispatchContext';

interface Props { onOpenAlerts: () => void; onOpenActive: () => void; }

export default function TechDashboard({ onOpenAlerts, onOpenActive }: Props) {
  const { job, technicianOnline, setTechOnline, jobHistory } = useDispatch();
  const alert = job?.status === 'requested' || job?.status === 'searching';
  const active = job && ['accepted', 'en-route', 'arrived', 'in-progress'].includes(job.status);
  const earnings = jobHistory.reduce((sum, j) => sum + (j.finalPrice ?? j.estimatedTotal ?? 0), 0);
  useEffect(() => {
    console.log('[technician] dashboard request state', {
      id: job?.id ?? null,
      status: job?.status ?? null,
      alert,
      visibleToRahul: Boolean(alert),
    });
  }, [alert, job?.id, job?.status]);
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-slate-400">Wednesday, September 9, 2026</p><h1 className="mt-1 font-display text-3xl font-800">Good morning, Rahul</h1></div><button onClick={() => setTechOnline(!technicianOnline)} className={`tech-online-pulse rounded-full px-4 py-2 text-sm font-700 ${technicianOnline ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{technicianOnline ? '● Online' : '○ Offline'}</button></div>
    <div className="grid gap-4 sm:grid-cols-3">
      {[['Today\'s jobs', active ? '1' : '0'], ['Earnings', `₹${earnings}`], ['Rating', '4.9 ★']].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 font-display text-2xl font-800">{value}</p></div>)}
    </div>
    {alert && <button onClick={onOpenAlerts} className="w-full rounded-2xl border border-red-400/40 bg-red-500/10 p-5 text-left transition hover:bg-red-500/20"><p className="text-xs font-700 uppercase tracking-wider text-red-300">New emergency request</p><p className="mt-2 font-display text-xl font-800">Electrical emergency near Gaur City 2</p><p className="mt-1 text-sm text-slate-300">Tap to review the request before the 45-second response window ends.</p></button>}
    {active && <button onClick={onOpenActive} className="w-full rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-left"><p className="text-xs font-700 uppercase tracking-wider text-emerald-300">Active job</p><p className="mt-2 font-display text-xl font-800">{job.service.replace('-', ' ')} · {job.location}</p><p className="mt-1 text-sm text-slate-300">Current status: {job.status}</p></button>}
    {!alert && !active && <div className="rounded-2xl border border-dashed border-slate-700 p-12 text-center text-slate-400">You are online and ready for the next dispatch.</div>}
  </div>;
}
