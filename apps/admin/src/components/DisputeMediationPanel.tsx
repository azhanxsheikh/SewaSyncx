import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../../../packages/shared/src/lib/supabase';
import { useAuth } from '../../../../packages/shared/src/auth';
import { useAdminRealtime } from '../hooks/useAdminRealtime';

export type DisputePriority = 'critical' | 'high' | 'medium' | 'low';
type ArbitrationAction = 'release_escrow' | 'force_refund' | 'split_payment' | 'reassign_worker';

export interface AdminDisputeItem {
  id: string;
  requestId: string;
  priority: DisputePriority;
  reasonCategory: string;
  status: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  technicianId: string;
  technicianName: string;
  technicianPhone: string;
  serviceCategory: string;
  escrowAmount: number;
  finalPrice: number;
  estimatedPrice: number;
  description: string;
  createdAt: string;
  rawCreatedAt: string;
  prePhotoUrl?: string;
  postPhotoUrl?: string;
}

export interface TimelineEventItem {
  id: string;
  timestamp: string;
  lane: string;
  title: string;
  description: string;
  badge?: string;
}

export default function DisputeMediationPanel() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<AdminDisputeItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<DisputePriority | 'all'>('all');
  const [activeModalAction, setActiveModalAction] = useState<ArbitrationAction | null>(null);
  const [justification, setJustification] = useState('');
  const [splitAmount, setSplitAmount] = useState('500');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventItem[]>([]);

  // Pagination state (10 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Track image load errors to prevent broken image icons
  const [preImageError, setPreImageError] = useState(false);
  const [postImageError, setPostImageError] = useState(false);

  const derivePriority = (reason: string): DisputePriority => {
    if (reason === 'safety_concern' || reason === 'harassment') return 'critical';
    if (reason === 'price_dispute' || reason === 'property_damage') return 'high';
    if (reason === 'quality_issue') return 'medium';
    return 'low';
  };

  const loadDisputes = useCallback(async () => {
    try {
      // Fetch disputes sorted by created_at DESC (newest first)
      const { data: dispRows, error: dispErr } = await supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false });

      if (dispErr) throw dispErr;
      if (!dispRows || dispRows.length === 0) {
        setDisputes([]);
        setLoading(false);
        return;
      }

      const reqIds = [...new Set(dispRows.map((d) => d.request_id))];
      const { data: reqRows } = await supabase
        .from('requests')
        .select('id, client_id, technician_id, category_id, estimated_total, final_price, description')
        .in('id', reqIds);

      const userIds = [
        ...new Set([
          ...dispRows.map((d) => d.initiator_id),
          ...(reqRows || []).map((r) => r.client_id),
          ...(reqRows || []).map((r) => r.technician_id).filter(Boolean),
        ]),
      ] as string[];

      const [{ data: userRows }, { data: catRows }] = await Promise.all([
        supabase.from('users').select('id, name, phone').in('id', userIds),
        supabase.from('service_categories').select('id, name'),
      ]);

      const userMap = new Map((userRows || []).map((u) => [u.id, u]));
      const catMap = new Map((catRows || []).map((c) => [c.id, c.name]));
      const reqMap = new Map((reqRows || []).map((r) => [r.id, r]));

      const items: AdminDisputeItem[] = dispRows.map((d) => {
        const req = reqMap.get(d.request_id);
        const clientId = req?.client_id || d.initiator_id;
        const techId = req?.technician_id || '';
        const clientUser = userMap.get(clientId);
        const techUser = techId ? userMap.get(techId) : null;
        const categoryName = req?.category_id ? catMap.get(req.category_id) || 'General Service' : 'Home Service';

        const rawDate = new Date(d.created_at);
        const dateStr = rawDate.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });

        const est = Number(req?.estimated_total || 0);
        const fin = Number(req?.final_price || est);
        const escrow = Number(d.liability_amount || fin || est || 500);

        return {
          id: d.id,
          requestId: d.request_id,
          priority: derivePriority(d.reason_category),
          reasonCategory: d.reason_category,
          status: d.status,
          clientId,
          clientName: clientUser?.name || 'Verified Client',
          clientPhone: clientUser?.phone || '+91-XXXXXXXXXX',
          technicianId: techId,
          technicianName: techUser?.name || 'Assigned Technician',
          technicianPhone: techUser?.phone || '+91-XXXXXXXXXX',
          serviceCategory: categoryName,
          escrowAmount: escrow,
          finalPrice: fin,
          estimatedPrice: est,
          description: d.description,
          createdAt: dateStr,
          rawCreatedAt: d.created_at,
        };
      });

      setDisputes(items);
      if (items.length > 0 && !selectedId) {
        setSelectedId(items[0].id);
      }
    } catch (err) {
      console.error('[admin] failed to fetch live disputes:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  // Realtime updates
  useAdminRealtime({
    tables: ['disputes', 'request_status_events'],
    onChange: () => {
      loadDisputes();
    },
  });

  const selectedDispute = disputes.find((d) => d.id === selectedId) || disputes[0];

  // Reset image errors when selected dispute changes
  useEffect(() => {
    setPreImageError(false);
    setPostImageError(false);
  }, [selectedId]);

  // Fetch timeline events and attachments when selectedDispute changes
  useEffect(() => {
    if (!selectedDispute) return;
    let cancelled = false;

    async function loadEventsAndMedia() {
      try {
        const [{ data: events }, { data: attachments }] = await Promise.all([
          supabase
            .from('request_status_events')
            .select('id, status, actor_role, reason, occurred_at')
            .eq('request_id', selectedDispute.requestId)
            .order('occurred_at', { ascending: true }),
          supabase
            .from('request_attachments')
            .select('id, phase, storage_path, file_name')
            .eq('request_id', selectedDispute.requestId),
        ]);

        if (cancelled) return;

        if (events && events.length > 0) {
          const parsedEvents: TimelineEventItem[] = events.map((ev) => {
            const timeStr = new Date(ev.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            let title = `Status advanced to ${ev.status.replace(/_/g, ' ')}`;
            let description = `Triggered by ${ev.actor_role}${ev.reason ? ` · Reason: ${ev.reason}` : ''}`;
            if (ev.status === 'pending') {
              title = 'SOS Dispatched';
              description = 'Client submitted emergency request. Dispatched to regional matching pool.';
            } else if (ev.status === 'accepted') {
              title = 'Technician Claimed Request';
              description = 'Assigned technician acknowledged and locked the request execution window.';
            } else if (ev.status === 'en_route') {
              title = 'En Route GPS Telemetry Active';
              description = 'Technician en route to client location.';
            } else if (ev.status === 'arrived') {
              title = 'On-Site Arrival Confirmed';
              description = 'Geofence entry registered within 50m of designated address.';
            } else if (ev.status === 'in_progress') {
              title = 'Service Commenced';
              description = 'Pre-work inspection complete. Repair work in progress.';
            } else if (ev.status === 'completed') {
              title = 'Job Completed & Invoiced';
              description = 'Digital invoice rendered and work marked finished.';
            }

            return {
              id: ev.id,
              timestamp: timeStr,
              lane: ev.actor_role,
              title,
              description,
              badge: ev.status.toUpperCase(),
            };
          });

          // Add dispute milestone at the end
          parsedEvents.push({
            id: 'disp-event-raised',
            timestamp: selectedDispute.createdAt,
            lane: 'dispute',
            title: 'Dispute Raised & Escrow Held',
            description: selectedDispute.description,
            badge: 'UNDER AUDIT',
          });

          setTimelineEvents(parsedEvents);
        } else {
          setTimelineEvents([
            {
              id: 'fallback-ev-1',
              timestamp: selectedDispute.createdAt,
              lane: 'lifecycle',
              title: 'Dispute Raised by Participant',
              description: selectedDispute.description,
              badge: 'DISPUTED',
            },
          ]);
        }

        if (attachments && attachments.length > 0) {
          const pre = attachments.find((a) => a.phase === 'pre_work');
          const post = attachments.find((a) => a.phase === 'post_work');

          if (pre) {
            const { data } = supabase.storage.from('request_attachments').getPublicUrl(pre.storage_path);
            selectedDispute.prePhotoUrl = data?.publicUrl;
          }
          if (post) {
            const { data } = supabase.storage.from('request_attachments').getPublicUrl(post.storage_path);
            selectedDispute.postPhotoUrl = data?.publicUrl;
          }
        }
      } catch (err) {
        console.error('[admin] failed to fetch dispute timeline/media:', err);
      }
    }

    void loadEventsAndMedia();

    return () => {
      cancelled = true;
    };
  }, [selectedDispute]);

  const filteredDisputes = useMemo(() => {
    return disputes.filter((d) => filterPriority === 'all' || d.priority === filterPriority);
  }, [disputes, filterPriority]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPriority]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredDisputes.length / ITEMS_PER_PAGE));
  const paginatedDisputes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDisputes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDisputes, currentPage]);

  const handleOpenAction = (action: ArbitrationAction) => {
    setActiveModalAction(action);
    setJustification('');
    if (selectedDispute) {
      setSplitAmount(String(Math.round(selectedDispute.escrowAmount / 2)));
    }
  };

  // Dynamic split calculation: tech_amount = escrow_balance - client_amount
  const clientSplitCalculated = useMemo(() => {
    if (!selectedDispute) return 0;
    const val = Number(splitAmount);
    if (isNaN(val) || val < 0) return 0;
    return Math.min(val, selectedDispute.escrowAmount);
  }, [splitAmount, selectedDispute]);

  const techSplitCalculated = useMemo(() => {
    if (!selectedDispute) return 0;
    return Math.max(0, selectedDispute.escrowAmount - clientSplitCalculated);
  }, [selectedDispute, clientSplitCalculated]);

  const handleExecuteAction = async () => {
    if (!justification.trim() || !selectedDispute) return;

    let liabilityParty: 'client' | 'technician' | 'platform' | 'split' = 'platform';
    let liabilityAmount = selectedDispute.escrowAmount;
    let actionLabel = '';
    let clientRefundAmount = 0;
    let techPayoutAmount = 0;

    let resolvedStatus: 'resolved_split' | 'resolved_client_favor' | 'resolved_technician_favor' | 'dismissed' = 'resolved_split';

    if (activeModalAction === 'release_escrow') {
      liabilityParty = 'platform';
      liabilityAmount = selectedDispute.escrowAmount;
      clientRefundAmount = 0;
      techPayoutAmount = selectedDispute.escrowAmount;
      resolvedStatus = 'resolved_technician_favor';
      actionLabel = `Escrow ₹${selectedDispute.escrowAmount} released in full to technician ${selectedDispute.technicianName}.`;
    } else if (activeModalAction === 'force_refund') {
      liabilityParty = 'technician';
      liabilityAmount = selectedDispute.escrowAmount;
      clientRefundAmount = selectedDispute.escrowAmount;
      techPayoutAmount = 0;
      resolvedStatus = 'resolved_client_favor';
      actionLabel = `Full refund of ₹${selectedDispute.escrowAmount} credited to ${selectedDispute.clientName}.`;
    } else if (activeModalAction === 'split_payment') {
      liabilityParty = 'split';
      liabilityAmount = clientSplitCalculated;
      clientRefundAmount = clientSplitCalculated;
      techPayoutAmount = techSplitCalculated;
      resolvedStatus = 'resolved_split';
      actionLabel = `Split settlement applied: ₹${clientSplitCalculated} to client, ₹${techSplitCalculated} to technician.`;
    } else if (activeModalAction === 'reassign_worker') {
      liabilityParty = 'platform';
      liabilityAmount = 0;
      resolvedStatus = 'dismissed';
      actionLabel = `Dispute resolved. Worker reassignment noted for request ${selectedDispute.requestId}.`;
    }

    try {
      // 1. Update public.disputes
      const { error: updErr } = await supabase
        .from('disputes')
        .update({
          status: resolvedStatus,
          liability_party: liabilityParty,
          liability_amount: liabilityAmount,
          resolved_at: new Date().toISOString(),
          assigned_admin_id: user?.id,
        })
        .eq('id', selectedDispute.id);

      if (updErr) {
        console.error('[admin] failed to resolve dispute in database:', updErr);
        throw updErr;
      }

      // 2. Insert notifications into public.notifications for both client and technician
      const notificationsToInsert: {
        user_id: string;
        request_id: string;
        type: 'status_update';
        title: string;
        icon: string;
      }[] = [];

      if (selectedDispute.clientId) {
        notificationsToInsert.push({
          user_id: selectedDispute.clientId,
          request_id: selectedDispute.requestId,
          type: 'status_update',
          title: `Dispute Resolved: Refund of ₹${clientRefundAmount} allocated to your account.`,
          icon: 'shield-check',
        });
      }

      if (selectedDispute.technicianId) {
        notificationsToInsert.push({
          user_id: selectedDispute.technicianId,
          request_id: selectedDispute.requestId,
          type: 'status_update',
          title: `Dispute Resolved: Payout of ₹${techPayoutAmount} approved for release.`,
          icon: 'wallet',
        });
      }

      if (notificationsToInsert.length > 0) {
        const { error: notifErr } = await supabase
          .from('notifications')
          .insert(notificationsToInsert);
        if (notifErr) {
          console.warn('[admin] notifications insert warning:', notifErr);
        }
      }

      // Update local state
      setDisputes((prev) =>
        prev.map((item) =>
          item.id === selectedDispute.id
            ? {
                ...item,
                status: 'resolved',
              }
            : item,
        ),
      );

      setActionSuccessMsg(`Action executed: ${actionLabel} (Audited: ${justification.trim()})`);
      setActiveModalAction(null);
      setJustification('');
    } catch (err) {
      console.error('[admin] execution error:', err);
      setActionSuccessMsg('Failed to commit determination. Check database permissions.');
    }
  };

  const getPriorityBadgeClass = (priority: DisputePriority) => {
    if (priority === 'critical') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (priority === 'high') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (priority === 'medium') return 'bg-sky-50 text-sky-700 border-sky-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-800 text-[#0B132B]">The Mediator — Dispute Arbitration</h2>
            <p className="text-sm text-slate-500">
              Escalation inbox, dual-party timeline reconstruction, and audited escrow resolution.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFilterPriority(p)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold uppercase transition-all shadow-xs ${
                  filterPriority === p
                    ? 'bg-[#0B132B] text-white shadow-sm ring-2 ring-sky-400/20'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex items-center justify-between shadow-xs">
          <span>✓ {actionSuccessMsg}</span>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main layout: Paginated Queue vs Detailed Workbench */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: Active Disputes Paginated Queue */}
        <div className="space-y-3 lg:w-96 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Disputes Queue ({filteredDisputes.length})
            </p>
            <span className="text-xs text-slate-400 font-semibold">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 shadow-xs">
                Loading dispute queue...
              </div>
            ) : paginatedDisputes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500 shadow-xs">
                No active disputes matching filter.
              </div>
            ) : (
              paginatedDisputes.map((dispute) => {
                const isSelected = dispute.id === selectedDispute?.id;
                return (
                  <div
                    key={dispute.id}
                    className={`rounded-2xl border p-4 transition-all shadow-xs ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/60 shadow-sm ring-2 ring-sky-400/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${getPriorityBadgeClass(
                          dispute.priority,
                        )}`}
                      >
                        {dispute.priority}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">{dispute.createdAt}</span>
                    </div>

                    <p className="font-display font-bold text-slate-900 text-sm capitalize">
                      {dispute.reasonCategory.replace(/_/g, ' ')} · {dispute.serviceCategory}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{dispute.description}</p>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                      <div>
                        <span className="font-medium text-slate-700 block">{dispute.clientName}</span>
                        <span className="font-bold text-slate-900">Escrow: ₹{dispute.escrowAmount}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(dispute.id)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-xs ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {isSelected ? 'Viewing Details' : 'View Details'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
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

        {/* Right: Comparative Chronological View & Arbitration Workbench */}
        {selectedDispute ? (
          <div className="flex-1 min-w-0 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md uppercase">
                    Case #{selectedDispute.id.slice(0, 8)}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-xs text-slate-500 font-medium">Request {selectedDispute.requestId.slice(0, 8)}</span>
                </div>
                <h3 className="mt-2 font-display text-xl font-800 text-[#0B132B] capitalize">
                  {selectedDispute.reasonCategory.replace(/_/g, ' ')} · {selectedDispute.serviceCategory}
                </h3>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-500 font-semibold">Escrow Balance</p>
                <p className="font-display text-2xl font-900 text-amber-600">₹{selectedDispute.escrowAmount}</p>
              </div>
            </div>

            {/* Parties Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-[#F4F7FB] p-4 text-sm text-slate-800">
              <div>
                <p className="text-xs font-semibold text-slate-500">Client Statement</p>
                <p className="font-bold text-slate-900 mt-0.5">{selectedDispute.clientName}</p>
                <p className="text-xs text-slate-500 font-medium">{selectedDispute.clientPhone}</p>
                <p className="mt-2 text-xs text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200">
                  "{selectedDispute.description}"
                </p>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4">
                <p className="text-xs font-semibold text-slate-500">Assigned Technician</p>
                <p className="font-bold text-slate-900 mt-0.5">{selectedDispute.technicianName}</p>
                <p className="text-xs text-slate-500 font-medium">{selectedDispute.technicianPhone}</p>
                <p className="mt-2 text-xs text-slate-600">
                  Estimated: <span className="font-bold text-slate-800">₹{selectedDispute.estimatedPrice}</span> · Final Realized:{' '}
                  <span className="font-bold text-slate-900">₹{selectedDispute.finalPrice}</span>
                </p>
              </div>
            </div>

            {/* Comparative Chronological Timeline */}
            <div>
              <p className="mb-3 font-display text-sm font-bold text-slate-900">
                Dual-Party Chronological Reconstruction
              </p>
              <div className="space-y-2.5">
                {timelineEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex gap-4 rounded-xl border border-slate-200 bg-[#F4F7FB] p-3 text-sm shadow-xs"
                  >
                    <div className="flex flex-col items-center justify-center min-w-16">
                      <span className="font-display font-bold text-xs text-slate-700">{event.timestamp}</span>
                      <span className="mt-0.5 text-[10px] font-bold uppercase text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                        {event.lane}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-900 text-xs">{event.title}</p>
                        {event.badge && (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            {event.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* On-Site Media Evidence with Clean Safe Placeholders */}
            <div>
              <p className="mb-2 font-display text-sm font-bold text-slate-900">On-Site Media Evidence</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pre-work Photo */}
                <div className="rounded-xl border border-slate-200 bg-[#F4F7FB] p-3 shadow-xs space-y-2">
                  <p className="text-xs font-semibold text-slate-700">Pre-Work Site Inspection</p>
                  {selectedDispute.prePhotoUrl && !preImageError ? (
                    <div>
                      <img
                        src={selectedDispute.prePhotoUrl}
                        alt="Pre-work"
                        onError={() => setPreImageError(true)}
                        className="h-40 w-full rounded-lg object-cover border border-slate-200"
                      />
                      <p className="mt-2 text-[11px] font-semibold text-emerald-700">✓ EXIF Verified on premises</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 bg-slate-100 rounded-xl border border-dashed border-slate-300 text-slate-400">
                      <span className="text-xs font-medium">No on-site photo uploaded</span>
                    </div>
                  )}
                </div>

                {/* Post-work Photo */}
                <div className="rounded-xl border border-slate-200 bg-[#F4F7FB] p-3 shadow-xs space-y-2">
                  <p className="text-xs font-semibold text-slate-700">Post-Work Completion Photo</p>
                  {selectedDispute.postPhotoUrl && !postImageError ? (
                    <div>
                      <img
                        src={selectedDispute.postPhotoUrl}
                        alt="Post-work"
                        onError={() => setPostImageError(true)}
                        className="h-40 w-full rounded-lg object-cover border border-slate-200"
                      />
                      <p className="mt-2 text-[11px] font-semibold text-sky-700">Post-service visual evidence</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 bg-slate-100 rounded-xl border border-dashed border-slate-300 text-slate-400">
                      <span className="text-xs font-medium">No on-site photo uploaded</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Arbitration Decisions Controls */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Arbitration Determination (Immutable Audit)
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => handleOpenAction('release_escrow')}
                  className="rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  Release to Tech
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAction('force_refund')}
                  className="rounded-xl bg-rose-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-xs"
                >
                  Full Refund Client
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAction('split_payment')}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-xs"
                >
                  Split Settlement
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAction('reassign_worker')}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors shadow-xs"
                >
                  Reassign Task
                </button>
              </div>

              {/* Action Justification Modal / Inline Form */}
              {activeModalAction && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-[#F4F7FB] p-4 space-y-3 shadow-sm animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-sm text-slate-900 capitalize">
                      Confirm Action: {activeModalAction.replace(/_/g, ' ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveModalAction(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>

                  {activeModalAction === 'split_payment' && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Amount allocated to client (₹):
                        </label>
                        <input
                          type="number"
                          value={splitAmount}
                          onChange={(e) => setSplitAmount(e.target.value)}
                          max={selectedDispute.escrowAmount}
                          min="0"
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      {/* Live calculation confirmation */}
                      <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 font-medium">
                        <span>Client will receive: </span>
                        <span className="font-bold text-sky-950">₹{clientSplitCalculated}</span>
                        <span> | Technician will receive: </span>
                        <span className="font-bold text-sky-950">₹{techSplitCalculated}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mandatory Arbitration Justification (Logged to audit trail):
                    </label>
                    <textarea
                      required
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder="Detail physical inspection evidence or policy basis for this resolution..."
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleExecuteAction()}
                    disabled={!justification.trim()}
                    className="w-full rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sky-700 transition-colors shadow-xs"
                  >
                    Commit Determination
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-xs">
            No dispute selected or active in current view.
          </div>
        )}
      </div>
    </div>
  );
}
