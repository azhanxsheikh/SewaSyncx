import { useEffect, useState } from 'react';
import DisputeMediationPanel from './DisputeMediationPanel';
import TechnicianComplianceRegistry from './TechnicianComplianceRegistry';
import OperationsMetricsView from './OperationsMetricsView';
import { supabase } from '../../../../packages/shared/src/lib/supabase';
import { useAuth } from '../../../../packages/shared/src/auth';

type AdminTab = 'mediator' | 'compliance' | 'metrics';

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

  useEffect(() => {
    let cancelled = false;

    async function loadLiveMetrics() {
      try {
        const [reqRes, usersRes, invRes, dispRes] = await Promise.all([
          supabase.from('requests').select('status, final_price, estimated_total'),
          supabase.from('users').select('id', { count: 'exact', head: true }),
          supabase.from('invoices').select('total'),
          supabase.from('disputes').select('status'),
        ]);

        if (cancelled) return;

        const requests = reqRes.data || [];
        const nonTerminal = ['pending', 'accepted', 'en_route', 'arrived', 'in_progress'];
        const activeRequests = requests.filter((r) => nonTerminal.includes(r.status)).length;
        const completedRequests = requests.filter((r) => r.status === 'completed').length;

        const totalUsers = usersRes.count ?? 0;
        const invoices = invRes.data || [];
        const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);

        const disputes = dispRes.data || [];
        const pendingDisputes = disputes.filter((d) => d.status === 'under_review').length;

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
        if (!cancelled) setMetrics((m) => ({ ...m, loading: false }));
      }
    }

    void loadLiveMetrics();

    // Listen to changes on requests, invoices, and disputes
    const channel = supabase
      .channel('admin-overview-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        void loadLiveMetrics();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        void loadLiveMetrics();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, () => {
        void loadLiveMetrics();
      })
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  const supervisorName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Azaan Sheikh';
  const displayRole = staffRole || role || 'super_admin';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-700 text-white shadow-sm">
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
                <h1 className="font-display font-800 text-base text-white">SewaSync Ops Control</h1>
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] font-700 uppercase">
                  Port 3003 · Isolated
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Supervisor: <span className="text-slate-300 font-medium">{supervisorName}</span> · Role:{' '}
                <span className="text-blue-500 font-medium">{displayRole}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void signOut()}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-700 text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-700 text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Operations Body */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Real Overview Metric Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Total System Requests</p>
            <p className="font-display font-800 text-2xl text-white mt-1">
              {metrics.loading ? '—' : metrics.totalRequests}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {metrics.activeRequests} active · {metrics.completedRequests} completed
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Registered Users</p>
            <p className="font-display font-800 text-2xl text-white mt-1">
              {metrics.loading ? '—' : metrics.totalUsers}
            </p>
            <p className="text-[11px] text-emerald-400 mt-0.5">Verified participants</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Settled Invoices</p>
            <p className="font-display font-800 text-2xl text-white mt-1">
              {metrics.loading ? '—' : metrics.totalInvoices}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">₹{metrics.totalRevenue.toFixed(0)} total volume</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Pending Disputes</p>
            <p className="font-display font-800 text-2xl text-amber-400 mt-1">
              {metrics.loading ? '—' : metrics.pendingDisputes}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Escrow arbitration</p>
          </div>
        </div>

        {/* KPI Quick-Access Banners */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab('mediator')}
            className={`p-4 rounded-2xl border text-left transition-colors ${
              activeTab === 'mediator'
                ? 'border-blue-600 bg-slate-900 shadow-sm'
                : 'border-slate-800 bg-slate-900/95 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">The Mediator</span>
              <span className="rounded-full bg-red-500/10 text-red-500 px-2 py-0.5 text-[10px] font-700">
                {metrics.pendingDisputes} Pending
              </span>
            </div>
            <p className="font-display font-800 text-xl text-white mt-1">Escrow &amp; Disputes</p>
            <p className="text-xs text-slate-400 mt-1">Arbitration &amp; liability determination</p>
          </button>

          <button
            onClick={() => setActiveTab('compliance')}
            className={`p-4 rounded-2xl border text-left transition-colors ${
              activeTab === 'compliance'
                ? 'border-blue-600 bg-slate-900 shadow-sm'
                : 'border-slate-800 bg-slate-900/95 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">The Controller</span>
              <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-700">
                Audit Registry
              </span>
            </div>
            <p className="font-display font-800 text-xl text-white mt-1">KYC &amp; Fatigue Registry</p>
            <p className="text-xs text-slate-400 mt-1">Aadhaar, tooling &amp; shift caps</p>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`p-4 rounded-2xl border text-left transition-colors ${
              activeTab === 'metrics'
                ? 'border-blue-600 bg-slate-900 shadow-sm'
                : 'border-slate-800 bg-slate-900/95 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">The Analyzer</span>
              <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] font-700">
                Live Data
              </span>
            </div>
            <p className="font-display font-800 text-xl text-white mt-1">Fares &amp; Collusion Guard</p>
            <p className="text-xs text-slate-400 mt-1">Fare variance &amp; photo audits</p>
          </button>
        </div>

        {/* Pillar Tab Controls */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab('mediator')}
            className={`px-4 py-2.5 rounded-xl text-xs font-700 transition-colors flex items-center gap-2 ${
              activeTab === 'mediator'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>⚖️</span>
            <span>1. The Mediator (Disputes)</span>
          </button>

          <button
            onClick={() => setActiveTab('compliance')}
            className={`px-4 py-2.5 rounded-xl text-xs font-700 transition-colors flex items-center gap-2 ${
              activeTab === 'compliance'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>🛡️</span>
            <span>2. The Controller (Compliance &amp; Fatigue)</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2.5 rounded-xl text-xs font-700 transition-colors flex items-center gap-2 ${
              activeTab === 'metrics'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <span>📊</span>
            <span>3. The Analyzer &amp; Business Guard</span>
          </button>
        </div>

        {/* Active Pillar Panel */}
        <div>
          {activeTab === 'mediator' && <DisputeMediationPanel />}
          {activeTab === 'compliance' && <TechnicianComplianceRegistry />}
          {activeTab === 'metrics' && <OperationsMetricsView />}
        </div>

        {/* Global Operational Security Notice */}
        <footer className="border-t border-slate-800 pt-4 text-center">
          <p className="text-xs text-slate-500">
            SewaSync Operations Platform · Immutable Audit Log · All operator actions recorded into{' '}
            <code className="text-slate-400 font-medium">admin_actions</code> with mandatory justification.
          </p>
        </footer>
      </main>
    </div>
  );
}
