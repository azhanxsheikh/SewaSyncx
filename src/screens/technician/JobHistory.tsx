import { useState } from 'react';
import { technicianHistoryFilters } from '../../fixtures/technicians.fixture';
import { useTechnicianHistory } from '../../hooks/useTechnicianHistory';
import { formatJobId } from './ActiveJob';

export default function JobHistory() {
  const { history } = useTechnicianHistory();
  const [filter, setFilter] = useState('All');
  const filtered = history.filter(item => filter === 'All' || item.status === filter);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Your completed work</p>
        <h1 className="mt-1 font-display text-3xl font-800">Job history</h1>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {technicianHistoryFilters.map(item => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`rounded-full px-4 py-2 text-sm font-600 shrink-0 ${filter === item ? 'bg-red-500 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        {filtered.length ? (
          filtered.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-4 border-b border-slate-800 p-5 last:border-0">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-700">{item.service}</p>
                  <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                    {formatJobId(item.id)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{item.customer} · {item.date}</p>
              </div>
              <div className="text-right">
                <p className="font-700">{item.amount}</p>
                <p className={`mt-1 text-xs ${item.status === 'Completed' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {item.status}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="p-8 text-center text-slate-400">No {filter.toLowerCase()} jobs yet.</p>
        )}
      </div>
    </div>
  );
}
