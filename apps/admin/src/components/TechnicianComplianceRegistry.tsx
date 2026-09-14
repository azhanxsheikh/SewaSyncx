import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../../../packages/shared/src/lib/supabase';
import { useAdminRealtime } from '../hooks/useAdminRealtime';

export interface TechnicianComplianceItem {
  id: string;
  name: string;
  phone: string;
  category: string;
  categories: string[];
  identityVerified: boolean;
  skillVerified: boolean;
  backgroundChecked: boolean;
  rating: number;
  reviewCount: number;
  completedJobsCount: number;
  isOnline: boolean;
  activeMinutes: number;
  heatAdjustedCapMinutes: number;
  throttleReason?: string;
}

export default function TechnicianComplianceRegistry() {
  const [registry, setRegistry] = useState<TechnicianComplianceItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['all']);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterThrottledOnly, setFilterThrottledOnly] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Pagination state (10 items / page)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Fatigue Cooldown Timer (45 minutes = 2700 seconds countdown)
  const [cooldownSeconds, setCooldownSeconds] = useState(45 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 45 * 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const loadTechnicians = useCallback(async () => {
    try {
      // 1. Fetch technician profiles strictly from public.technician_profiles
      const { data: tpRows, error: tpErr } = await supabase
        .from('technician_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (tpErr) throw tpErr;
      if (!tpRows || tpRows.length === 0) {
        setRegistry([]);
        setLoading(false);
        return;
      }

      const techIds = tpRows.map((t) => t.id);

      // 2. Fetch users, categories mapping, service categories, requests, and authentic reviews
      const [
        { data: userRows },
        { data: techCatRows },
        { data: catRows },
        { data: reqRows },
        { data: reviewRows },
      ] = await Promise.all([
        supabase.from('users').select('id, name, phone').in('id', techIds),
        supabase.from('technician_categories').select('technician_id, category_id').in('technician_id', techIds),
        supabase.from('service_categories').select('id, name'),
        supabase
          .from('requests')
          .select('id, technician_id, status, accepted_at, completed_at, created_at')
          .in('technician_id', techIds),
        supabase
          .from('reviews')
          .select('technician_id, rating')
          .in('technician_id', techIds),
      ]);

      const userMap = new Map((userRows || []).map((u) => [u.id, u]));
      const catMap = new Map((catRows || []).map((c) => [c.id, c.name]));

      // Category list for filter pills
      const availableCategories = ['all', ...(catRows || []).map((c) => c.name)];
      setCategories(availableCategories);

      // Map categories per technician (render all registered categories)
      const techToCatsMap = new Map<string, string[]>();
      (techCatRows || []).forEach((tc) => {
        const catName = catMap.get(tc.category_id);
        if (catName) {
          const existing = techToCatsMap.get(tc.technician_id) || [];
          if (!existing.includes(catName)) {
            existing.push(catName);
          }
          techToCatsMap.set(tc.technician_id, existing);
        }
      });

      // Map authentic reviews per technician strictly from public.reviews
      const techToReviewsMap = new Map<string, number[]>();
      (reviewRows || []).forEach((r) => {
        const list = techToReviewsMap.get(r.technician_id) || [];
        list.push(r.rating);
        techToReviewsMap.set(r.technician_id, list);
      });

      // Today's midnight timestamp for active shift minutes calculation
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartTime = todayStart.getTime();

      const items: TechnicianComplianceItem[] = tpRows.map((tp) => {
        const user = userMap.get(tp.id);
        const assignedCats = techToCatsMap.get(tp.id) || [];
        const primaryCat = assignedCats[0] || 'General Service';

        // Authentic completed jobs count
        const techRequests = (reqRows || []).filter((r) => r.technician_id === tp.id);
        const completedJobsCount = techRequests.filter((r) => r.status === 'completed').length;

        // Authentic rating calculation strictly from public.reviews
        const reviews = techToReviewsMap.get(tp.id) || [];
        const reviewCount = reviews.length;
        const rating =
          reviewCount > 0
            ? Number((reviews.reduce((a, b) => a + b, 0) / reviewCount).toFixed(1))
            : 0;

        // Dynamic shift duration from today's active duty session
        let activeMinutes = 0;
        if (tp.is_online) {
          for (const req of techRequests) {
            if (!req.accepted_at) continue;
            const acceptedTime = new Date(req.accepted_at).getTime();
            // Only count work that started today
            if (acceptedTime < todayStartTime) continue;

            const endTime = req.completed_at ? new Date(req.completed_at).getTime() : Date.now();
            const durationMins = Math.max(0, Math.round((endTime - acceptedTime) / 60000));
            activeMinutes += durationMins;
          }
        }

        return {
          id: tp.id,
          name: user?.name || `Technician (${tp.id.slice(0, 8)})`,
          phone: user?.phone || '+91-XXXXXXXXXX',
          category: primaryCat,
          categories: assignedCats.length > 0 ? assignedCats : [primaryCat],
          identityVerified: Boolean(tp.identity_verified),
          skillVerified: Boolean(tp.skill_verified),
          backgroundChecked: Boolean(tp.background_checked),
          rating,
          reviewCount,
          completedJobsCount,
          isOnline: Boolean(tp.is_online),
          activeMinutes,
          heatAdjustedCapMinutes: 480, // 8-hour shift cap
          throttleReason: !tp.is_online ? 'Manual administrator throttle' : undefined,
        };
      });

      setRegistry(items);
    } catch (err) {
      console.error('Failed to load technician compliance registry:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians]);

  // Subscribe to real-time changes
  useAdminRealtime({
    tables: ['technician_profiles', 'requests'],
    onChange: () => {
      loadTechnicians();
    },
  });

  const toggleThrottle = async (id: string) => {
    const tech = registry.find((t) => t.id === id);
    if (!tech) return;

    const nextState = !tech.isOnline;

    // Optimistically update local state
    setRegistry((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              isOnline: nextState,
              activeMinutes: !nextState ? 0 : item.activeMinutes,
              throttleReason: !nextState ? 'Admin manual suspension applied' : undefined,
            }
          : item,
      ),
    );

    setNotification(
      `Technician ${tech.name}: Dispatch ${nextState ? 'RESTORED (active)' : 'THROTTLED (suspended)'}.`,
    );

    try {
      const { error } = await supabase
        .from('technician_profiles')
        .update({ is_online: nextState })
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Failed to update technician dispatch state:', err);
      setNotification(`Error toggling dispatch state for ${tech.name}. Reverting...`);
      // Rollback
      setRegistry((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isOnline: tech.isOnline } : item)),
      );
    }
  };

  const safeRegistry = registry || [];
  const filteredItems = useMemo(() => {
    return safeRegistry.filter((item) => {
      if (filterCategory !== 'all') {
        const matchesCategory =
          item.category.toLowerCase() === filterCategory.toLowerCase() ||
          item.categories.some((c) => c.toLowerCase() === filterCategory.toLowerCase());
        if (!matchesCategory) return false;
      }
      if (filterThrottledOnly && item.isOnline) return false;
      return true;
    });
  }, [safeRegistry, filterCategory, filterThrottledOnly]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, filterThrottledOnly]);

  // Pagination calculations (10 items / page)
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const totalTechnicians = safeRegistry.length;
  const throttledCount = safeRegistry.filter((t) => !t.isOnline).length;
  const compliantCount = safeRegistry.filter(
    (t) => t.identityVerified && t.skillVerified && t.backgroundChecked,
  ).length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-sky-600 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">Loading compliance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-800 text-[#0B132B]">The Controller — Compliance &amp; Fatigue</h2>
            <p className="text-sm text-slate-500">
              Statutory Aadhaar/KYC token registry, mandatory tooling audit, and live shift fatigue monitor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-700 capitalize transition-colors shadow-sm ${
                  filterCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-[#0B132B] text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Global Compliance Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Register</p>
            <p className="font-display font-800 text-2xl text-[#0B132B] mt-1">{totalTechnicians}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fully Compliant</p>
            <p className="font-display font-800 text-2xl text-emerald-600 mt-1">{compliantCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Throttled / Suspended</p>
            <p className="font-display font-800 text-2xl text-rose-600 mt-1">{throttledCount}</p>
          </div>
        </div>
      </div>

      {notification && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3.5 text-xs font-medium text-sky-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sky-600 font-bold">ℹ</span>
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Options & Pagination Header */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 font-semibold">Quick Filters:</span>
          <button
            type="button"
            onClick={() => setFilterThrottledOnly(!filterThrottledOnly)}
            className={`rounded-xl px-3 py-1.5 font-bold transition-colors shadow-sm ${
              filterThrottledOnly
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {filterThrottledOnly ? 'Showing Throttled Only' : 'Show Throttled Only'}
          </button>
        </div>

        <span className="text-slate-500 font-semibold">
          Showing {filteredItems.length} technician{filteredItems.length === 1 ? '' : 's'} (Page {currentPage} of {totalPages})
        </span>
      </div>

      {/* Technician Cards */}
      <div className="space-y-4">
        {paginatedItems.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 font-medium">
            No technicians match the current compliance filters.
          </div>
        ) : (
          paginatedItems.map((tech) => {
            const dutyPercent = !tech.isOnline
              ? 0
              : Math.min(100, Math.round((tech.activeMinutes / tech.heatAdjustedCapMinutes) * 100));
            const isNearCap = tech.isOnline && (dutyPercent >= 80 || tech.activeMinutes > 420);

            return (
              <div
                key={tech.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors"
              >
                {/* Row 1: Technician basic info & toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B132B] font-display font-800 text-white text-base shadow-sm">
                      {tech.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display font-700 text-[#0B132B] text-base">{tech.name}</p>
                        {/* High-contrast badges for ALL registered categories */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {tech.categories.map((catName) => (
                            <span
                              key={catName}
                              className="rounded-full bg-[#0B132B] text-white border border-[#0B132B] px-2.5 py-0.5 text-[11px] font-bold shadow-xs"
                            >
                              {catName}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Clean authentic metrics: rating or No reviews yet badge, and real completed jobs */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                        <span>{tech.phone}</span>
                        <span>·</span>
                        {tech.reviewCount > 0 ? (
                          <span className="font-semibold text-slate-800">
                            ★ {tech.rating.toFixed(1)} ({tech.reviewCount} {tech.reviewCount === 1 ? 'review' : 'reviews'})
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">No reviews yet</span>
                        )}
                        <span>·</span>
                        <span>{tech.completedJobsCount} {tech.completedJobsCount === 1 ? 'completed job' : 'completed jobs'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dispatch Status Toggle Switch */}
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <p className={`text-xs font-bold ${tech.isOnline ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {tech.isOnline ? 'Dispatch Active' : 'Dispatch Blocked'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {tech.isOnline ? 'Eligible for matching' : tech.throttleReason || 'Manual throttle'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleThrottle(tech.id)}
                      className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-colors shadow-sm ${
                        tech.isOnline
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {tech.isOnline ? 'APPLY BLOCK' : 'LIFT BLOCK'}
                    </button>
                  </div>
                </div>

                {/* Row 2: Verification Status Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block mb-1">Aadhaar (UIDAI Token)</span>
                    {tech.identityVerified ? (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-600">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="text-amber-700 bg-amber-50 border border-amber-200 inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-600">
                        ⏳ Pending Verification
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 font-semibold block mb-1">Police Background Verification</span>
                    {tech.backgroundChecked ? (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-600">
                        ✓ Cleared
                      </span>
                    ) : (
                      <span className="text-slate-600 bg-slate-100 border border-slate-200 inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-600">
                        Not Submitted
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 font-semibold block mb-1">Physical Tool Attestation</span>
                    {tech.skillVerified ? (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-600">
                        ✓ Certified On-Site
                      </span>
                    ) : (
                      <span className="text-slate-600 bg-slate-100 border border-slate-200 inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-600">
                        Unverified
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 3: Live Fatigue & Duty-Time Tracker with Real Shift Minutes */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0B132B]">
                      Fatigue Monitor (Consecutive Shift Minutes)
                    </span>
                    <span className={`font-semibold ${!tech.isOnline ? 'text-slate-400 font-medium' : isNearCap ? 'text-amber-700 font-bold' : 'text-slate-500'}`}>
                      {!tech.isOnline
                        ? '0 / 480 min (Offline)'
                        : `${tech.activeMinutes} / ${tech.heatAdjustedCapMinutes} min`}
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        !tech.isOnline
                          ? 'bg-slate-300'
                          : dutyPercent > 90 || tech.activeMinutes > 420
                          ? 'bg-rose-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${!tech.isOnline ? 0 : Math.max(0, dutyPercent)}%` }}
                    />
                  </div>

                  {/* Active Cooldown Timer (only when duty > 420 min or near cap while online) */}
                  {isNearCap && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 font-semibold flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-600 font-bold text-sm">⏱</span>
                        <span>
                          Cooling rest active:{' '}
                          <span className="font-mono font-bold text-amber-950">{formatTimer(cooldownSeconds)}</span>{' '}
                          remaining before next dispatch eligibility
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded font-bold uppercase">
                        Bylaw Mandate
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <span className="text-xs font-semibold text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
