import { useState } from 'react';
import {
  mockAdminDisputes,
  type AdminDisputeRecord,
  type DisputePriority,
} from '../../fixtures/admin.fixture';

type ArbitrationAction = 'release_escrow' | 'force_refund' | 'split_payment' | 'reassign_worker';

export default function DisputeMediationPanel() {
  const [disputes, setDisputes] = useState<AdminDisputeRecord[]>(mockAdminDisputes);
  const [selectedId, setSelectedId] = useState<string>(mockAdminDisputes[0]?.id ?? '');
  const [filterPriority, setFilterPriority] = useState<DisputePriority | 'all'>('all');
  const [activeModalAction, setActiveModalAction] = useState<ArbitrationAction | null>(null);
  const [justification, setJustification] = useState('');
  const [splitAmount, setSplitAmount] = useState('500');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const filteredDisputes = disputes.filter(
    (d) => filterPriority === 'all' || d.priority === filterPriority,
  );

  const selectedDispute = disputes.find((d) => d.id === selectedId) || disputes[0];

  const handleOpenAction = (action: ArbitrationAction) => {
    setActiveModalAction(action);
    setJustification('');
    if (selectedDispute) {
      setSplitAmount(String(Math.round(selectedDispute.escrowAmount / 2)));
    }
  };

  const handleExecuteAction = () => {
    if (!justification.trim() || !selectedDispute) return;

    let updatedStatus = selectedDispute.status;
    let actionLabel = '';

    if (activeModalAction === 'release_escrow') {
      updatedStatus = 'resolved_technician_favor';
      actionLabel = `Escrow ₹${selectedDispute.escrowAmount} released to technician ${selectedDispute.technicianName}.`;
    } else if (activeModalAction === 'force_refund') {
      updatedStatus = 'resolved_client_favor';
      actionLabel = `Full refund of ₹${selectedDispute.escrowAmount} credited to ${selectedDispute.clientName}.`;
    } else if (activeModalAction === 'split_payment') {
      updatedStatus = 'resolved_split';
      actionLabel = `Split settlement applied: ₹${splitAmount} to client, ₹${selectedDispute.escrowAmount - Number(splitAmount)} to technician.`;
    } else if (activeModalAction === 'reassign_worker') {
      actionLabel = `Worker reassigned. Successor dispatch initiated for request ${selectedDispute.requestId}.`;
    }

    setDisputes((prev) =>
      prev.map((item) =>
        item.id === selectedDispute.id
          ? {
              ...item,
              status: updatedStatus,
            }
          : item,
      ),
    );

    setActionSuccessMsg(`Action executed: ${actionLabel} (Audit ID: adm-${Date.now().toString().slice(-4)})`);
    setActiveModalAction(null);
    setJustification('');
  };

  const getPriorityBadgeClass = (priority: DisputePriority) => {
    if (priority === 'critical') return 'bg-red-500/10 text-red-500 border-red-500';
    if (priority === 'high') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (priority === 'medium') return 'bg-blue-50 text-blue-600 border-blue-200';
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-800 text-white">The Mediator — Dispute Arbitration</h2>
            <p className="text-sm text-slate-400">
              Escalation inbox, dual-party timeline reconstruction, and audited escrow resolution.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFilterPriority(p)}
                className={`rounded-xl px-3 py-1.5 text-xs font-700 uppercase transition-colors ${
                  filterPriority === p
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="rounded-xl border border-emerald-400 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center justify-between">
          <span>✓ {actionSuccessMsg}</span>
          <button type="button" onClick={() => setActionSuccessMsg(null)} className="text-slate-400 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Main layout: Queue vs Detailed Workbench */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: Active Disputes Queue */}
        <div className="space-y-3 lg:w-52 shrink-0">
          <p className="text-xs font-700 text-slate-400 uppercase tracking-wider">
            Active Queue ({filteredDisputes.length})
          </p>
          <div className="space-y-2">
            {filteredDisputes.map((dispute) => (
              <div
                key={dispute.id}
                onClick={() => setSelectedId(dispute.id)}
                className={`cursor-pointer rounded-2xl border p-4 transition-colors ${
                  dispute.id === selectedDispute?.id
                    ? 'border-red-500 bg-slate-900'
                    : 'border-slate-800 bg-slate-950 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-700 uppercase ${getPriorityBadgeClass(
                      dispute.priority,
                    )}`}
                  >
                    {dispute.priority}
                  </span>
                  <span className="text-xs text-slate-500">{dispute.createdAt}</span>
                </div>
                <p className="font-display font-700 text-white text-sm capitalize">
                  {dispute.reasonCategory.replace(/_/g, ' ')}
                </p>
                <p className="mt-1 text-xs text-slate-400 truncate">{dispute.description}</p>
                <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2 text-xs text-slate-500">
                  <span>{dispute.clientName}</span>
                  <span className="font-700 text-slate-300">₹{dispute.escrowAmount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Comparative Chronological View & Arbitration Workbench */}
        {selectedDispute ? (
          <div className="flex-1 min-w-0 space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-700 text-emerald-300">CASE #{selectedDispute.id}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-xs text-slate-400">Request {selectedDispute.requestId}</span>
                </div>
                <h3 className="mt-1 font-display text-xl font-800 text-white capitalize">
                  {selectedDispute.reasonCategory.replace(/_/g, ' ')} · {selectedDispute.serviceCategory}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Escrow Balance</p>
                <p className="font-display text-2xl font-800 text-amber-400">₹{selectedDispute.escrowAmount}</p>
              </div>
            </div>

            {/* Parties Card */}
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-800 p-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Client Statement</p>
                <p className="font-700 text-white mt-0.5">{selectedDispute.clientName}</p>
                <p className="text-xs text-slate-400">{selectedDispute.clientPhone}</p>
                <p className="mt-2 text-xs text-slate-300">"{selectedDispute.description}"</p>
              </div>
              <div className="border-t border-slate-700 pt-3">
                <p className="text-xs text-slate-500">Assigned Technician</p>
                <p className="font-700 text-white mt-0.5">{selectedDispute.technicianName}</p>
                <p className="text-xs text-slate-400">{selectedDispute.technicianPhone}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Estimated: ₹{selectedDispute.estimatedPrice} · Realized: ₹{selectedDispute.finalPrice}
                </p>
              </div>
            </div>

            {/* Comparative Chronological Timeline */}
            <div>
              <p className="mb-3 font-display text-sm font-700 text-white">
                Dual-Party Chronological Reconstruction
              </p>
              <div className="space-y-3">
                {selectedDispute.events.map((event) => (
                  <div
                    key={event.id}
                    className="flex gap-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm"
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-display font-800 text-xs text-slate-400">{event.timestamp}</span>
                      <span className="mt-1 text-[10px] uppercase text-slate-500">{event.lane}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-700 text-white">{event.title}</p>
                        {event.badge && (
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                            {event.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pre & Post Work Evidence Photos */}
            {(selectedDispute.prePhotoUrl || selectedDispute.postPhotoUrl) && (
              <div>
                <p className="mb-2 font-display text-sm font-700 text-white">On-Site Media Evidence</p>
                <div className="grid grid-cols-2 gap-4">
                  {selectedDispute.prePhotoUrl && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <p className="text-xs text-slate-400 mb-2">Pre-Work Site Inspection</p>
                      <img
                        src={selectedDispute.prePhotoUrl}
                        alt="Pre-work"
                        className="h-24 w-full rounded-lg object-cover"
                      />
                      <p className="mt-2 text-[10px] text-emerald-400">✓ EXIF Verified (24m delta)</p>
                    </div>
                  )}
                  {selectedDispute.postPhotoUrl && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <p className="text-xs text-slate-400 mb-2">Post-Work Completion Photo</p>
                      <img
                        src={selectedDispute.postPhotoUrl}
                        alt="Post-work"
                        className="h-24 w-full rounded-lg object-cover"
                      />
                      <p className="mt-2 text-[10px] text-amber-400">pHash Hamming Dist: 18</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="border-t border-slate-800 pt-4">
              <p className="text-xs font-700 text-slate-500 uppercase mb-3">Arbitration Resolution Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAction('release_escrow')}
                  className="rounded-xl bg-emerald-500 py-2.5 text-center text-xs font-700 text-white hover:bg-emerald-600 transition-colors"
                >
                  Release Escrow
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAction('force_refund')}
                  className="rounded-xl bg-red-500 py-2.5 text-center text-xs font-700 text-white hover:bg-red-600 transition-colors"
                >
                  Force Refund
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAction('split_payment')}
                  className="rounded-xl bg-blue-600 py-2.5 text-center text-xs font-700 text-white hover:bg-blue-700 transition-colors"
                >
                  Split Payment
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAction('reassign_worker')}
                  className="rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-center text-xs font-700 text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Reassign Worker
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Mandatory Justification & Execution Modal */}
      {activeModalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase">Audit Override Confirmation</p>
                <h3 className="font-display text-lg font-800 text-white capitalize">
                  {activeModalAction.replace(/_/g, ' ')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalAction(null)}
                className="text-slate-400 text-sm"
              >
                ✕
              </button>
            </div>

            {activeModalAction === 'split_payment' && selectedDispute && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Client Refund Amount (₹ out of ₹{selectedDispute.escrowAmount})
                </label>
                <input
                  type="number"
                  min="0"
                  max={selectedDispute.escrowAmount}
                  value={splitAmount}
                  onChange={(e) => setSplitAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:outline-none text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Technician will receive remainder: ₹
                  {Math.max(0, selectedDispute.escrowAmount - Number(splitAmount))}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Mandatory Administrative Justification *
              </label>
              <textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="State verified rationale for audit record..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:outline-none text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                Logged in immutable table admin_actions with actor role.
              </p>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveModalAction(null)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={!justification.trim()}
                className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-700 text-white disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                Confirm & Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
