import { useState } from 'react';
import type { Screen } from '../../types/navigation';
import DisputeMediationPanel from './DisputeMediationPanel';
import TechnicianComplianceRegistry from './TechnicianComplianceRegistry';
import OperationsMetricsView from './OperationsMetricsView';
import {
  mockAdminDisputes,
  mockComplianceRegistry,
  mockCollusionAnomalies,
} from '../../fixtures/admin.fixture';

type AdminTab = 'mediator' | 'compliance' | 'metrics';

interface AdminDashboardProps {
  navigate: (s: Screen) => void;
  onBack?: () => void;
}

export default function AdminDashboard({ navigate, onBack }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('mediator');

  const pendingDisputesCount = mockAdminDisputes.filter((d) => d.status === 'under_review').length;
  const fatigueAlertsCount = mockComplianceRegistry.filter(
    (t) => t.isThrottled || t.activeMinutes >= t.heatAdjustedCapMinutes
  ).length;
  const collusionAnomaliesCount = mockCollusionAnomalies.filter((a) => a.status === 'open').length;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('home');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-700 text-white shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-800 text-base text-white">SewaSync Ops Control</h1>
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-[10px] font-700 uppercase">
                  Live System
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Supervisor: <span className="text-slate-300 font-medium">Azaan Sheikh</span> · Role: <span className="text-blue-500 font-medium">super_admin</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-700 text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Exit Console</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Operations Body */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Quick-Access Banners */}
        <div className="grid grid-cols-3 gap-4">
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
                {pendingDisputesCount} Active
              </span>
            </div>
            <p className="font-display font-800 text-xl text-white mt-1">Escrow &amp; Disputes</p>
            <p className="text-xs text-slate-400 mt-1">3 disputes pending arbitration</p>
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
                {fatigueAlertsCount} Flag
              </span>
            </div>
            <p className="font-display font-800 text-xl text-white mt-1">KYC &amp; Fatigue Registry</p>
            <p className="text-xs text-slate-400 mt-1">4 verified technicians active</p>
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
              <span className="rounded-full bg-red-500/10 text-red-500 px-2 py-0.5 text-[10px] font-700">
                {collusionAnomaliesCount} Anomaly
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
            <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-medium text-slate-300">
              {mockAdminDisputes.length}
            </span>
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
            <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-medium text-slate-300">
              {mockComplianceRegistry.length}
            </span>
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
            <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-medium text-slate-300">
              Metrics
            </span>
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
            SewaSync Operations Platform · Immutable Audit Log · All operator actions recorded into <code className="text-slate-400 font-medium">admin_actions</code> with mandatory justification.
          </p>
        </footer>
      </main>
    </div>
  );
}
