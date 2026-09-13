import { useState } from 'react';
import {
  mockComplianceRegistry,
  type TechnicianComplianceItem,
} from '../../../../src/fixtures/admin.fixture';

export default function TechnicianComplianceRegistry() {
  const [registry, setRegistry] = useState<TechnicianComplianceItem[]>(mockComplianceRegistry || []);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterThrottledOnly, setFilterThrottledOnly] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const categories = ['all', 'Electrical', 'Plumbing', 'Appliances'];

  const safeRegistry = registry || [];
  const filteredItems = safeRegistry.filter((item) => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    if (filterThrottledOnly && !item.isThrottled) return false;
    return true;
  });

  const toggleThrottle = (id: string) => {
    setRegistry((prev) =>
      (prev || []).map((item) => {
        if (item.id === id) {
          const nextState = !item.isThrottled;
          const reason = nextState ? 'Admin manual suspension applied' : undefined;
          setNotification(
            `Technician ${item.name}: Dispatch ${nextState ? 'THROTTLED (suspended)' : 'RESTORED (active)'}.`,
          );
          return {
            ...item,
            isThrottled: nextState,
            throttleReason: reason,
          };
        }
        return item;
      }),
    );
  };

  const totalTechnicians = safeRegistry.length;
  const throttledCount = safeRegistry.filter((t) => t.isThrottled).length;
  const compliantCount = safeRegistry.filter(
    (t) => t.aadhaarStatus === 'verified' && t.policeCheckStatus === 'verified' && t.toolAttestationStatus === 'certified',
  ).length;

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-800 text-white">The Controller — Compliance & Fatigue</h2>
            <p className="text-sm text-slate-400">
              Statutory Aadhaar/KYC token registry, mandatory tooling audit, and live shift fatigue monitor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-700 capitalize transition-colors ${
                  filterCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Global Compliance Stats Cards */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <p className="text-xs text-slate-500">Active Register</p>
            <p className="font-display font-800 text-xl text-white mt-1">{totalTechnicians}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <p className="text-xs text-slate-500">Fully Compliant</p>
            <p className="font-display font-800 text-xl text-emerald-400 mt-1">{compliantCount}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <p className="text-xs text-slate-500">Throttled / Suspended</p>
            <p className="font-display font-800 text-xl text-red-400 mt-1">{throttledCount}</p>
          </div>
        </div>
      </div>

      {notification && (
        <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-3 text-xs text-blue-300 flex items-center justify-between">
          <span>{notification}</span>
          <button type="button" onClick={() => setNotification(null)} className="text-slate-400">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Options */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-slate-500">Quick Filters:</span>
        <button
          type="button"
          onClick={() => setFilterThrottledOnly(!filterThrottledOnly)}
          className={`rounded-lg px-2.5 py-1 font-600 transition-colors ${
            filterThrottledOnly ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-slate-900 text-slate-400 border border-slate-800'
          }`}
        >
          {filterThrottledOnly ? 'Showing Throttled Only' : 'Show Throttled Only'}
        </button>
      </div>

      {/* Technician Cards */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-400">
            No technicians match current compliance filters.
          </div>
        ) : (
          filteredItems.map((tech) => {
            const dutyPercent = Math.min(100, Math.round((tech.activeMinutes / tech.heatAdjustedCapMinutes) * 100));
            const isNearCap = dutyPercent >= 80;

            return (
              <div
                key={tech.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4"
              >
                {/* Row 1: Technician basic info & toggle */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 font-display font-800 text-white">
                      {tech.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-display font-700 text-white text-base">{tech.name}</p>
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                          {tech.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {tech.phone} · ⭐ {tech.rating} ({tech.totalJobs} jobs)
                      </p>
                    </div>
                  </div>

                  {/* Dispatch Status Toggle Switch */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-700 text-white">
                        {tech.isThrottled ? 'Dispatch Blocked' : 'Dispatch Active'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {tech.isThrottled ? tech.throttleReason || 'Manual throttle' : 'Eligible for matching'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleThrottle(tech.id)}
                      className={`rounded-xl px-3 py-2 text-xs font-700 transition-colors ${
                        tech.isThrottled
                          ? 'bg-red-500 text-white'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {tech.isThrottled ? 'LIFT BLOCK' : 'APPLY BLOCK'}
                    </button>
                  </div>
                </div>

                {/* Row 2: Verification Status Badges */}
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-1">Aadhaar (UIDAI Token)</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-600 ${
                        tech.aadhaarStatus === 'verified'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {tech.aadhaarStatus === 'verified' ? '✓ Verified (Tokenized)' : 'Pending'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1">Police Background Verification</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-600 ${
                        tech.policeCheckStatus === 'verified'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {tech.policeCheckStatus === 'verified' ? '✓ Cleared' : 'In Progress'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1">Physical Tool Attestation</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-600 ${
                        tech.toolAttestationStatus === 'certified'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {tech.toolAttestationStatus === 'certified' ? '✓ Certified On-Site' : 'Expired'}
                    </span>
                  </div>
                </div>

                {/* Row 3: Live Fatigue & Duty-Time Tracker */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-600 text-slate-300">
                      Fatigue Monitor (Consecutive Shift Minutes)
                    </span>
                    <span className={isNearCap ? 'text-amber-400 font-700' : 'text-slate-400'}>
                      {tech.activeMinutes} / {tech.heatAdjustedCapMinutes} min (Cap adjusted for extreme heat)
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        dutyPercent > 90
                          ? 'bg-red-500'
                          : dutyPercent > 70
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${dutyPercent}%` }}
                    />
                  </div>

                  {isNearCap && (
                    <p className="text-[11px] text-amber-400 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>
                        Fatigue warning: Approaching mandatory 45-minute cooling rest interval per cooperative bylaws.
                      </span>
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
