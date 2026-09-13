import { useState } from 'react';
import {
  mockComplianceRegistry,
  type TechnicianComplianceItem,
} from '../../fixtures/admin.fixture';

export default function TechnicianComplianceRegistry() {
  const [registry, setRegistry] = useState<TechnicianComplianceItem[]>(mockComplianceRegistry);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterThrottledOnly, setFilterThrottledOnly] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const categories = ['all', 'Electrical', 'Plumbing', 'Appliances'];

  const filteredItems = registry.filter((item) => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    if (filterThrottledOnly && !item.isThrottled) return false;
    return true;
  });

  const toggleThrottle = (id: string) => {
    setRegistry((prev) =>
      prev.map((item) => {
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

  const totalTechnicians = registry.length;
  const throttledCount = registry.filter((t) => t.isThrottled).length;
  const compliantCount = registry.filter(
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
                className={`rounded-xl px-3 py-1.5 text-xs font-700 uppercase transition-colors ${
                  filterCategory === cat
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {notification && (
        <div className="rounded-xl border border-emerald-400 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center justify-between">
          <span>✓ {notification}</span>
          <button type="button" onClick={() => setNotification(null)} className="text-slate-400 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs text-slate-500">Total Registered</p>
          <p className="mt-1 font-display text-2xl font-800 text-white">{totalTechnicians}</p>
          <p className="mt-1 text-xs text-slate-400">Active roster</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs text-slate-500">Fully Compliant</p>
          <p className="mt-1 font-display text-2xl font-800 text-emerald-300">
            {compliantCount} / {totalTechnicians}
          </p>
          <p className="mt-1 text-xs text-slate-400">KYC + Tools + Police</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs text-slate-500">Throttled / Gated</p>
          <p className="mt-1 font-display text-2xl font-800 text-amber-400">{throttledCount}</p>
          <p className="mt-1 text-xs text-slate-400">Fatigue or audit lapse</p>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-700 text-slate-400 uppercase tracking-wider">
          Compliance & Shift Registry ({filteredItems.length})
        </p>
        <button
          type="button"
          onClick={() => setFilterThrottledOnly(!filterThrottledOnly)}
          className={`rounded-xl px-3 py-1.5 text-xs font-700 transition-colors ${
            filterThrottledOnly
              ? 'bg-amber-500 text-white'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
          }`}
        >
          {filterThrottledOnly ? 'Showing Throttled Only' : 'Show Throttled Only'}
        </button>
      </div>

      {/* Technician Cards */}
      <div className="space-y-3">
        {filteredItems.map((tech) => {
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
                {/* Aadhaar eKYC */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-slate-500 mb-1">Aadhaar eKYC (Tokenized)</p>
                  <p className="font-700 text-white">{tech.aadhaarMasked}</p>
                  <span className="mt-2 block text-[10px] text-emerald-400">
                    ✓ Statutory Masked Token
                  </span>
                </div>

                {/* Police Check */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-slate-500 mb-1">Police Background Check</p>
                  <p className="font-700 text-white">
                    {tech.policeCheckStatus === 'verified' ? 'Verified Clearance' : 'Pending / Expired'}
                  </p>
                  <span
                    className={`mt-2 block text-[10px] ${
                      tech.policeCheckStatus === 'verified' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    Expires: {tech.policeCheckExpiry}
                  </span>
                </div>

                {/* Tooling Audit */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-slate-500 mb-1">Tool Audit Certification</p>
                  <p className="font-700 text-white">
                    {tech.toolCertifiedCount} / {tech.toolRequiredCount} Tools Attested
                  </p>
                  <span
                    className={`mt-2 block text-[10px] ${
                      tech.toolAttestationStatus === 'certified' ? 'text-emerald-400' : 'text-red-500'
                    }`}
                  >
                    {tech.toolAttestationStatus === 'certified'
                      ? '✓ Category Certified'
                      : '⚠ Mandatory Tools Expired'}
                  </span>
                </div>
              </div>

              {/* Row 3: Live Fatigue & Shift Monitor */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-700 text-white">Daily Fatigue Monitor: </span>
                    <span className="text-slate-400">
                      {Math.floor(tech.activeMinutes / 60)}h {tech.activeMinutes % 60}m active / {Math.floor(tech.heatAdjustedCapMinutes / 60)}h heat cap
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">Continuous Streak: {tech.streakMinutes}m</span>
                    <span
                      className={`font-700 ${
                        isNearCap ? 'text-amber-400' : 'text-emerald-300'
                      }`}
                    >
                      {dutyPercent}% of limit
                    </span>
                  </div>
                </div>

                {/* Visual meter bar using standard bg tokens */}
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full ${
                      dutyPercent >= 100
                        ? 'bg-red-500'
                        : isNearCap
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${dutyPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
