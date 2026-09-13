import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from '../../context/DispatchContext';
import { formatJobId } from './ActiveJob';
import { useAuth } from '../../../packages/shared/src/auth';
import { supabase } from '../../lib/supabaseClient';

interface Props {
  onOpenAlerts: () => void;
  onOpenActive: () => void;
}

export default function TechDashboard({ onOpenAlerts, onOpenActive }: Props) {
  const { job, technicianOnline, setTechOnline } = useDispatch();
  const { userId, user } = useAuth();

  const [techName, setTechName] = useState<string>('Technician');
  const [todayJobsCount, setTodayJobsCount] = useState<number>(0);
  const [todayEarnings, setTodayEarnings] = useState<number>(0);
  const [ratingDisplay, setRatingDisplay] = useState<string>('New Worker');
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);

  // Formatted date: e.g. "Sunday, September 13, 2026"
  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const alert = job?.status === 'requested' || job?.status === 'searching';
  const active = Boolean(job && ['accepted', 'en-route', 'en_route', 'arrived', 'in-progress', 'in_progress'].includes(job.status));

  // Query live technician stats from Supabase
  useEffect(() => {
    let activeEffect = true;
    if (!userId) return;
    const activeUid: string = userId;

    async function fetchDashboardStats() {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();

        // 1. Fetch Technician Name
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', activeUid)
          .maybeSingle();

        if (activeEffect && userData?.name) {
          setTechName(userData.name);
        } else if (activeEffect && (user?.user_metadata?.full_name || user?.user_metadata?.name)) {
          setTechName(String(user?.user_metadata?.full_name || user?.user_metadata?.name));
        } else if (activeEffect && user?.email) {
          setTechName(user.email.split('@')[0]);
        }

        // 2. Count Today's Jobs (technician_id = auth.uid() and created_at >= CURRENT_DATE)
        const { count: jobsCount, error: jobsErr } = await supabase
          .from('requests')
          .select('*', { count: 'exact', head: true })
          .eq('technician_id', activeUid)
          .gte('created_at', todayIso);

        if (jobsErr) {
          console.warn('[dashboard] error querying today jobs:', jobsErr.message);
        }

        // 3. Earnings: invoices has no technician_id column of its own
        // (docs/DATABASE.md §5) — reach it through requests.technician_id.
        const { data: invoiceRows, error: earningsErr } = await supabase
          .from('invoices')
          .select('total, requests!inner(technician_id)')
          .eq('requests.technician_id', activeUid);

        if (earningsErr) {
          console.warn('[dashboard] error querying today earnings:', earningsErr.message);
        }

        const totalEarned = (invoiceRows || []).reduce((sum, inv) => {
          return sum + Number(inv.total || 0);
        }, 0);

        // 4. Rating from technician_profiles (Bayesian rating, fall back to "New Worker" if review_count is 0)
        const { data: profileData, error: profileErr } = await supabase
          .from('technician_profiles')
          .select('rating, review_count, is_online')
          .eq('id', activeUid)
          .maybeSingle();

        if (profileErr) {
          console.warn('[dashboard] error querying technician profile:', profileErr.message);
        }

        if (activeEffect) {
          setTodayJobsCount(jobsCount ?? 0);
          setTodayEarnings(totalEarned);

          if (profileData && profileData.review_count > 0) {
            setRatingDisplay(`${Number(profileData.rating).toFixed(1)} ★`);
          } else {
            setRatingDisplay('New Worker');
          }

          if (profileData && typeof profileData.is_online === 'boolean') {
            setTechOnline(profileData.is_online);
          }

          setIsLoadingStats(false);
        }
      } catch (err) {
        console.error('[dashboard] error fetching live stats:', err);
      }
    }

    void fetchDashboardStats();

    // Subscribe to requests changes to auto-refresh stats
    const channel = supabase
      .channel(`dashboard-stats-${activeUid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        void fetchDashboardStats();
      })
      .subscribe();

    return () => {
      activeEffect = false;
      void supabase.removeChannel(channel);
    };
  }, [userId, user, setTechOnline]);

  const handleToggleOnline = async () => {
    const nextOnline = !technicianOnline;
    setTechOnline(nextOnline);
    if (userId) {
      await supabase
        .from('technician_profiles')
        .update({ is_online: nextOnline, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }
  };

  const displayName = useMemo(() => {
    const raw = techName && techName !== 'Technician'
      ? techName
      : user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Technician';
    return String(raw).split(' ')[0];
  }, [techName, user]);

  return (
    <div className="space-y-6">
      {/* Header Greeting & Real Date */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{formattedDate}</p>
          <h1 className="mt-1 font-display text-3xl font-800 text-slate-900">
            {greeting}, {displayName}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleToggleOnline}
          className={`tech-online-pulse rounded-full px-4 py-2 text-sm font-700 shadow-md transition-all active:scale-95 ${
            technicianOnline
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
        >
          {technicianOnline ? '● Online' : '○ Offline'}
        </button>
      </div>

      {/* Live Authentic Aggregation Counters */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300">
          <p className="text-sm text-slate-500 font-medium">Today&apos;s jobs</p>
          <p className="mt-2 font-display text-2xl font-800 text-slate-900">
            {isLoadingStats ? (
              <span className="inline-block h-7 w-12 bg-slate-100 rounded animate-pulse" />
            ) : (
              todayJobsCount + (active ? 1 : 0)
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300">
          <p className="text-sm text-slate-500 font-medium">Earnings</p>
          <p className="mt-2 font-display text-2xl font-800 text-emerald-600">
            {isLoadingStats ? (
              <span className="inline-block h-7 w-16 bg-slate-100 rounded animate-pulse" />
            ) : (
              `₹${todayEarnings}`
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300">
          <p className="text-sm text-slate-500 font-medium">Rating</p>
          <p className="mt-2 font-display text-2xl font-800 text-amber-500">
            {isLoadingStats ? (
              <span className="inline-block h-7 w-20 bg-slate-100 rounded animate-pulse" />
            ) : (
              ratingDisplay
            )}
          </p>
        </div>
      </div>

      {/* New Emergency Request Banner */}
      {alert && (
        <button
          type="button"
          onClick={onOpenAlerts}
          className="w-full rounded-2xl border border-red-200 bg-red-50 p-5 text-left transition hover:bg-red-100/70 shadow-sm active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-700 uppercase tracking-wider text-red-700">
              New emergency dispatch request
            </p>
            <span className="animate-ping h-2 w-2 rounded-full bg-red-500" />
          </div>
          <p className="mt-2 font-display text-xl font-800 text-slate-900 capitalize">
            {job.service.replace('-', ' ')} emergency near {job.location.split(',')[0]}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Tap to open the Pre-Acceptance Inspection Drawer before the 45-second window expires.
          </p>
        </button>
      )}

      {/* Active Job Quick Navigation Banner */}
      {active && job && (
        <button
          type="button"
          onClick={onOpenActive}
          className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left transition hover:bg-emerald-100/70 shadow-sm active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-700 uppercase tracking-wider text-emerald-700">
              Active job · {formatJobId(job.id)}
            </p>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="mt-2 font-display text-xl font-800 text-slate-900 capitalize">
            {job.service.replace('-', ' ')} · {job.location}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Current status: <strong className="text-emerald-700 uppercase text-xs">{job.status}</strong>
          </p>
        </button>
      )}

      {/* Standby Empty State */}
      {!alert && !active && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
          <p className="text-3xl mb-2">📡</p>
          <p className="font-semibold text-slate-800">You are online and ready for the next dispatch.</p>
          <p className="text-xs text-slate-500 mt-1">
            New emergency requests within your 10 km operating zone will appear here immediately.
          </p>
        </div>
      )}
    </div>
  );
}
