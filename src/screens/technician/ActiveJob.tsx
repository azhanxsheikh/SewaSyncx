import { useDispatch } from '../../context/DispatchContext';
import type { ExecutionStep, JobStatus } from '../../types/dispatch';

const steps: { id: ExecutionStep; label: string; detail: string }[] = [
  { id: 'accepted', label: 'Accepted', detail: 'Job accepted' },
  { id: 'en-route', label: 'En route', detail: 'Heading to customer' },
  { id: 'arrived', label: 'Arrived', detail: 'At the service address' },
  { id: 'in-progress', label: 'Working', detail: 'Repair in progress' },
  { id: 'completed', label: 'Completed', detail: 'Close out the job' },
];

export default function ActiveJob() {
  const { job, updateJobStatus } = useDispatch();
  if (!job || !['accepted', 'en-route', 'arrived', 'in-progress'].includes(job.status)) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">Accept a dispatch to start a job.</div>;
  const current = steps.findIndex(step => step.id === job.executionStep);
  const next = steps[Math.min(current + 1, steps.length - 1)];
  const statusForStep: Record<ExecutionStep, JobStatus> = { accepted: 'ACCEPTED', 'en-route': 'ON_THE_WAY', arrived: 'ARRIVED', 'in-progress': 'IN_PROGRESS', completed: 'COMPLETED' };
  return <div className="mx-auto max-w-3xl space-y-6"><div><p className="text-sm text-emerald-300">Active job · {job.id}</p><h1 className="mt-1 font-display text-3xl font-800 capitalize">{job.service.replace('-', ' ')} emergency</h1><p className="mt-1 text-slate-400">{job.location} · {job.customerName}</p></div><div className="grid gap-6 lg:grid-cols-[1fr_280px]"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><p className="mb-5 font-display text-lg font-800">Execution console</p><div className="space-y-1">{steps.map((step, index) => <div key={step.id} className="flex gap-4"><div className="flex flex-col items-center"><div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-700 ${index <= current ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>{index < current ? '✓' : index + 1}</div>{index < steps.length - 1 && <div className={`h-10 w-0.5 ${index < current ? 'bg-emerald-500' : 'bg-slate-800'}`} />}</div><div className="pb-6"><p className={`font-700 ${index === current ? 'text-emerald-300' : index < current ? 'text-slate-200' : 'text-slate-500'}`}>{step.label}</p><p className="text-sm text-slate-500">{step.detail}</p></div></div>)}</div><button onClick={() => updateJobStatus(statusForStep[next.id])} disabled={current >= steps.length - 1} className="w-full rounded-xl bg-emerald-500 py-3 font-700 text-white disabled:cursor-not-allowed disabled:bg-slate-700">{current >= steps.length - 1 ? 'Job complete' : `Mark as ${next.label}`}</button></div><aside className="space-y-4"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs text-slate-500">Customer contact</p><p className="mt-2 font-700">{job.customerName}</p><p className="mt-1 text-sm text-slate-400">{job.customerPhone}</p><a href={`tel:${job.customerPhone}`} className="mt-4 block rounded-lg bg-slate-800 py-2 text-center text-sm font-600">Call customer</a></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><p className="text-xs text-slate-500">Job estimate</p><p className="mt-2 font-display text-2xl font-800">₹{job.estimatedTotal}</p></div></aside></div></div>;
}
