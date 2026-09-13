import { useState } from 'react';
import {
  mockFareVarianceSummaries,
  mockCollusionAnomalies,
  mockPhotoMismatchReviews,
  type CollusionAnomalyRecord,
  type PhotoMismatchReviewItem,
} from '../../../../src/fixtures/admin.fixture';

export default function OperationsMetricsView() {
  const [collusionFlags, setCollusionFlags] = useState<CollusionAnomalyRecord[]>(mockCollusionAnomalies || []);
  const [photoReviews, setPhotoReviews] = useState<PhotoMismatchReviewItem[]>(mockPhotoMismatchReviews || []);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const safeCollusionFlags = collusionFlags || [];
  const safePhotoReviews = photoReviews || [];
  const safeVarianceSummaries = mockFareVarianceSummaries || [];

  const handleCollusionAction = (id: string, newStatus: 'cleared' | 'confirmed') => {
    setCollusionFlags((prev) =>
      (prev || []).map((c) => (c.id === id ? { ...c, status: newStatus } : c)),
    );
    const target = safeCollusionFlags.find((c) => c.id === id);
    setAlertMsg(
      `Collusion record ${id} (${target?.clientName} × ${target?.technicianName}) marked as ${newStatus.toUpperCase()}. Audit entry recorded.`,
    );
  };

  const handlePhotoReviewAction = (id: string, newStatus: 'approved' | 'dispute_opened') => {
    setPhotoReviews((prev) =>
      (prev || []).map((p) => (p.id === id ? { ...p, status: newStatus } : p)),
    );
    setAlertMsg(
      `Photo evidence for case ${id} ${newStatus === 'approved' ? 'APPROVED' : 'ESCALATED TO DISPUTE'}. Audit entry recorded.`,
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div>
        <h2 className="font-display text-2xl font-800 text-white">
          The Analyzer & Business Guard
        </h2>
        <p className="text-sm text-slate-400">
          Fare variance distribution, Poisson pairwise collusion detector, and photo integrity comparator.
        </p>
      </div>

      {alertMsg && (
        <div className="rounded-xl border border-emerald-400 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center justify-between">
          <span>✓ {alertMsg}</span>
          <button type="button" onClick={() => setAlertMsg(null)} className="text-slate-400 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: Fare Variance Monitor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-800 text-white">
              1. Fare Variance Monitor (Estimated vs Realized)
            </h3>
            <p className="text-xs text-slate-400">
              Tracking average deviation (final_price / estimated_total). Variances &gt; 50% flagged for administrative review per RULES_AND_LOGIC.md §9.
            </p>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-700 text-slate-300">
            Platform Mean: +24.8%
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {safeVarianceSummaries.length === 0 ? (
            <div className="col-span-3 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-400 text-xs">
              No fare variance records found.
            </div>
          ) : (
            safeVarianceSummaries.map((summary) => (
              <div
                key={summary.category}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-display font-700 text-white text-base">{summary.category}</p>
                  <span className="text-xs text-slate-500">{summary.jobCount} jobs</span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Avg Estimated Price:</span>
                    <span className="text-white font-700">₹{summary.avgEstimatedPrice}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Avg Realized Price:</span>
                    <span className="text-white font-700">₹{summary.avgFinalPrice}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800 text-slate-400">
                    <span>Mean Variance Delta:</span>
                    <span
                      className={`font-700 ${
                        summary.avgVariancePercent > 25 ? 'text-amber-400' : 'text-emerald-300'
                      }`}
                    >
                      +{summary.avgVariancePercent}%
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 flex items-center justify-between text-xs">
                  <span className="text-slate-500">&gt; 50% Variance Flags:</span>
                  <span
                    className={`font-700 ${
                      summary.highVarianceCount > 5 ? 'text-red-500' : 'text-slate-300'
                    }`}
                  >
                    {summary.highVarianceCount} review items
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 2: Pairwise Collusion Anomaly Detector */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div>
          <h3 className="font-display text-lg font-800 text-white">
            2. Pairwise Collusion Anomaly Detector
          </h3>
          <p className="text-xs text-slate-400">
            Poisson log-likelihood ratio (LLR) and z-score breach (z &gt; 3.0) highlighting unnatural client-technician match frequencies.
          </p>
        </div>

        <div className="space-y-3">
          {safeCollusionFlags.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-400 text-xs">
              No collusion anomalies detected. System operating within normal Poisson bounds.
            </div>
          ) : (
            safeCollusionFlags.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-red-500/10 text-red-500 px-2 py-0.5 text-xs font-700 uppercase">
                      Anomaly Flag #{item.id}
                    </span>
                    <span className="text-xs text-slate-400">{item.flaggedDate}</span>
                  </div>
                  <div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-700 uppercase ${
                        item.status === 'open'
                          ? 'bg-red-500 text-white'
                          : item.status === 'confirmed'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      Status: {item.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <p className="text-slate-500">Subject Client</p>
                      <p className="font-700 text-white text-sm mt-0.5">{item.clientName}</p>
                      <p className="text-slate-400 text-[10px]">Client ID: {item.clientId}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <p className="text-slate-500">Subject Technician</p>
                      <p className="font-700 text-white text-sm mt-0.5">{item.technicianName}</p>
                      <p className="text-slate-400 text-[10px]">Tech ID: {item.technicianId}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <p className="text-slate-500">Poisson Expected vs Observed Matches</p>
                      <p className="font-700 text-white text-base mt-0.5">
                        {item.observedMatches} observed <span className="text-slate-400 text-xs font-medium">/ {item.expectedMatches} expected (λ)</span>
                      </p>
                      <p className="text-amber-400 text-[10px] mt-1">
                        LLR: {item.poissonLlr} · z-score: {item.zScore} (threshold &gt; 3.0)
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-slate-500">Corroborating Signals</p>
                        <p className="text-white text-xs mt-0.5">
                          {item.sharedDeviceOrIp ? '⚠ Shared IP / Device Fingerprint Detected' : 'No shared device'}
                        </p>
                      </div>
                      {item.rapidReviewCluster && (
                        <span className="rounded bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-700">
                          Review Cluster
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {item.status === 'open' && (
                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleCollusionAction(item.id, 'cleared')}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-700 text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      Clear False Positive
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCollusionAction(item.id, 'confirmed')}
                      className="flex-1 rounded-xl bg-red-500 py-2.5 text-xs font-700 text-white hover:bg-red-600 transition-colors"
                    >
                      Confirm Collusion &amp; Restrict Pair
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 3: Photo Mismatch & Integrity Comparator */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div>
          <h3 className="font-display text-lg font-800 text-white">
            3. Photo Mismatch &amp; Integrity Comparator
          </h3>
          <p className="text-xs text-slate-400">
            Side-by-side inspection for pre-work vs post-work photos. EXIF GPS delta &gt; 150m or pHash = 0 (reused photo) routes to review.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safePhotoReviews.length === 0 ? (
            <div className="col-span-2 rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-400 text-xs">
              No photo mismatch reviews pending.
            </div>
          ) : (
            safePhotoReviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <p className="font-display font-700 text-white text-sm">
                      {review.serviceCategory} · {review.requestId}
                    </p>
                    <p className="text-xs text-slate-400">
                      Tech: {review.technicianName} · Client: {review.clientName}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-700 uppercase ${
                      review.status === 'pending_review' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    {review.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400">Pre-Work Inspection (EXIF Verified)</p>
                    <img
                      src={review.prePhotoUrl}
                      alt="Pre-work site inspection"
                      className="h-28 w-full rounded-lg object-cover border border-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-400">Post-Work Completion Proof</p>
                    <img
                      src={review.postPhotoUrl}
                      alt="Post-work site completion"
                      className="h-28 w-full rounded-lg object-cover border border-slate-800"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 p-3 text-xs space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>pHash Distance:</span>
                    <span className="font-mono font-700 text-amber-400">{review.phashDistance}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Geotag Delta:</span>
                    <span className="text-emerald-400">{review.exifGpsDeltaMeters}m from site</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handlePhotoReviewAction(review.id, 'approved')}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-700 text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Accept Evidence
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePhotoReviewAction(review.id, 'dispute_opened')}
                    className="flex-1 rounded-xl bg-red-600 py-2 text-xs font-700 text-white hover:bg-red-500 transition-colors"
                  >
                    Open Fraud Inquiry
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
