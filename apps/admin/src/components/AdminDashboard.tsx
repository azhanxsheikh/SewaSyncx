import { useEffect, useState, useCallback } from 'react';
import DisputeMediationPanel from './DisputeMediationPanel';
import TechnicianComplianceRegistry from './TechnicianComplianceRegistry';
import OperationsMetricsView from './OperationsMetricsView';
import { supabase } from '../../../../packages/shared/src/lib/supabase';
import { useAuth } from '../../../../packages/shared/src/auth';
import { useAdminRealtime } from '../hooks/useAdminRealtime';

export type AdminTab = 'mediator' | 'compliance' | 'metrics';

interface AdminDashboardProps {
  onBack?: () => void;
}

interface OverviewMetrics {
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  totalUsers: number;
  totalInvoices: number;
  totalRevenue: number;
  pendingDisputes: number;
  loading: boolean;
}

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { user, role, staffRole, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('mediator');

  const [metrics, setMetrics] = useState<OverviewMetrics>({
    totalRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    totalUsers: 0,
    totalInvoices: 0,
    totalRevenue: 0,
    pendingDisputes: 0,
    loading: true,
  });

  const loadLiveMetrics = useCallback(async () => {
    try {
      const [reqRes, usersRes, invRes, dispRes] = await Promise.all([
        supabase.from('requests').select('status, final_price, estimated_total'),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('total'),
        supabase.from('disputes').select('status'),
      ]);

      const requests = reqRes.data || [];
      const nonTerminal = ['pending', 'accepted', 'en_route', 'arrived', 'in_progress'];
      const activeRequests = requests.filter((r) => nonTerminal.includes(r.status)).length;
      const completedRequests = requests.filter((r) => r.status === 'completed').length;

      const totalUsers = usersRes.count ?? 0;
      const invoices = invRes.data || [];
      const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

      const disputes = dispRes.data || [];
      const pendingDisputes = disputes.filter((d) => d.status === 'under_review' || d.status === 'open').length;

      setMetrics({
        totalRequests: requests.length,
        activeRequests,
        completedRequests,
        totalUsers,
        totalInvoices: invoices.length,
        totalRevenue,
        pendingDisputes,
        loading: false,
      });
    } catch (err) {
      console.error('[admin] failed to fetch live overview metrics:', err);
      setMetrics((m) => ({ ...m, loading: false }));
    }
  }, []);

  useEffect(() => {
    void loadLiveMetrics();
  }, [loadLiveMetrics]);

  // Realtime subscription via useAdminRealtime
  useAdminRealtime({
    tables: ['requests', 'disputes', 'invoices'],
    onChange: () => {
      void loadLiveMetrics();
    },
  });

  const supervisorName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Azaan Sheikh';
  const displayRole = staffRole || role || 'super_admin';

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center font-700 text-white shadow-xs">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-800 text-base text-[#0B132B]">SewaSync Ops Control</h1>
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-700 uppercase">
                  Port 3003 · Live
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Supervisor: <span className="text-slate-800 font-semibold">{supervisorName}</span> · Role:{' '}
                <span className="text-sky-600 font-semibold uppercase">{displayRole}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void signOut()}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-700 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-xs"
            >
              <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Sign Out</span>
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-700 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
              >
                Back
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Operations Body */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Top 4 KPI Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500">Total System Requests</p>
            <p className="font-display font-900 text-3xl text-slate-900 mt-1">
              {metrics.loading ? '—' : metrics.totalRequests}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {metrics.activeRequests} active · {metrics.completedRequests} completed
            </p>
          </div>
          <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500">Registered Users</p>
            <p className="font-display font-900 text-3xl text-slate-900 mt-1">
              {metrics.loading ? '—' : metrics.totalUsers}
            </p>
            <p className="text-xs text-emerald-600 mt-1 font-semibold">Verified participants</p>
          </div>
          <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500">Settled Invoices</p>
            <p className="font-display font-900 text-3xl text-slate-900 mt-1">
              {metrics.loading ? '—' : metrics.totalInvoices}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">₹{metrics.totalRevenue.toFixed(0)} total volume</p>
          </div>
          <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-5">
            <p className="text-xs font-semibold text-slate-500">Pending Disputes</p>
            <p className="font-display font-900 text-3xl text-amber-600 mt-1">
              {metrics.loading ? '—' : metrics.pendingDisputes}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">Escrow arbitration</p>
          </div>
        </div>

        {/* Unified Module Selector Cards (Redundancies eliminated: acts as primary navigation) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('mediator')}
            className={`p-5 rounded-2xl text-left transition-all cursor-pointer ${
              activeTab === 'mediator'
                ? 'bg-[#0B132B] text-white border-2 border-sky-400 shadow-md ring-2 ring-sky-400/20'
                : 'bg-white text-slate-800 border border-slate-200 hover:border-sky-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'mediator' ? 'text-sky-300' : 'text-slate-500'}`}>
                Module 1 · The Mediator
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                  activeTab === 'mediator'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {metrics.pendingDisputes} Pending
              </span>
            </div>
            <p className={`font-display font-800 text-xl mt-2 ${activeTab === 'mediator' ? 'text-white' : 'text-[#0B132B]'}`}>
              Escrow &amp; Disputes
            </p>
            <p className={`text-xs mt-1 ${activeTab === 'mediator' ? 'text-slate-300' : 'text-slate-500'}`}>
              Arbitration &amp; dual-party timeline reconstruction
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('compliance')}
            className={`p-5 rounded-2xl text-left transition-all cursor-pointer ${
              activeTab === 'compliance'
                ? 'bg-[#0B132B] text-white border-2 border-sky-400 shadow-md ring-2 ring-sky-400/20'
                : 'bg-white text-slate-800 border border-slate-200 hover:border-sky-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'compliance' ? 'text-sky-300' : 'text-slate-500'}`}>
                Module 2 · The Controller
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                  activeTab === 'compliance'
                    ? 'bg-sky-400/20 text-sky-200 border-sky-400/30'
                    : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}
              >
                Audit Registry
              </span>
            </div>
            <p className={`font-display font-800 text-xl mt-2 ${activeTab === 'compliance' ? 'text-white' : 'text-[#0B132B]'}`}>
              KYC &amp; Fatigue Registry
            </p>
            <p className={`text-xs mt-1 ${activeTab === 'compliance' ? 'text-slate-300' : 'text-slate-500'}`}>
              Aadhaar, tooling &amp; dynamic shift caps
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`p-5 rounded-2xl text-left transition-all cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-[#0B132B] text-white border-2 border-sky-400 shadow-md ring-2 ring-sky-400/20'
                : 'bg-white text-slate-800 border border-slate-200 hover:border-sky-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${activeTab === 'metrics' ? 'text-sky-300' : 'text-slate-500'}`}>
                Module 3 · The Analyzer
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                  activeTab === 'metrics'
                    ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                Live Data
              </span>
            </div>
            <p className={`font-display font-800 text-xl mt-2 ${activeTab === 'metrics' ? 'text-white' : 'text-[#0B132B]'}`}>
              Fares &amp; Collusion Guard
            </p>
            <p className={`text-xs mt-1 ${activeTab === 'metrics' ? 'text-slate-300' : 'text-slate-500'}`}>
              Real-time fare variance &amp; pairwise anomaly audits
            </p>
          </button>
        </div>

        {/* Active Pillar Panel */}
        <div className="transition-opacity duration-200">
          {activeTab === 'mediator' && <DisputeMediationPanel />}
          {activeTab === 'compliance' && <TechnicianComplianceRegistry />}
          {activeTab === 'metrics' && <OperationsMetricsView />}
        </div>

        {/* Global Operational Security Notice */}
        <footer className="border-t border-slate-200 pt-4 text-center">
          <p className="text-xs text-slate-500">
            SewaSync Operations Platform · Immutable Audit Log · All operator actions recorded into{' '}
            <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md font-mono text-[11px]">admin_actions</code> with mandatory justification.
          </p>
        </footer>
      </main>
    </div>
  );
}
