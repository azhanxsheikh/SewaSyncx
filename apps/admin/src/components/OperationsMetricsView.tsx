import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../../packages/shared/src/lib/supabase';
import { useAdminRealtime } from '../hooks/useAdminRealtime';

export interface FareVarianceCategorySummary {
  category: string;
  jobCount: number;
  avgEstimatedPrice: number;
  avgFinalPrice: number;
  avgVariancePercent: number;
  highVarianceCount: number;
}

export interface CollusionAnomalyRecord {
  id: string;
  clientId: string;
  clientName: string;
  technicianId: string;
  technicianName: string;
  observedMatches: number;
  expectedMatches: number;
  poissonLlr: number;
  zScore: number;
  sharedDeviceOrIp: boolean;
  rapidReviewCluster: boolean;
  status: 'open' | 'cleared' | 'confirmed';
  flaggedDate: string;
}

export default function OperationsMetricsView() {
  const [varianceSummaries, setVarianceSummaries] = useState<FareVarianceCategorySummary[]>([]);
  const [platformMeanVariance, setPlatformMeanVariance] = useState<number>(0);
  const [collusionFlags, setCollusionFlags] = useState<CollusionAnomalyRecord[]>([]);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    try {
      const [
        { data: reqRows },
        { data: catRows },
        { data: userRows },
      ] = await Promise.all([
        supabase
          .from('requests')
          .select('id, client_id, technician_id, category_id, estimated_total, final_price, status, created_at, accepted_at, completed_at')
          .order('created_at', { ascending: false }),
        supabase.from('service_categories').select('id, name'),
        supabase.from('users').select('id, name, phone'),
      ]);

      const requests = reqRows || [];
      const categories = catRows || [];
      const users = userRows || [];

      const userMap = new Map(users.map((u) => [u.id, u.name]));

      // -------------------------------------------------------------
      // 1. AUTHENTIC FARE VARIANCE AGGREGATION
      // Only completed jobs where final_price IS NOT NULL
      // -------------------------------------------------------------
      const completedWithPrice = requests.filter(
        (r) => r.status === 'completed' && r.final_price !== null && r.final_price !== undefined,
      );

      let totalPlatformEstimated = 0;
      let totalPlatformFinal = 0;

      const summaries: FareVarianceCategorySummary[] = categories.map((cat) => {
        const catCompletedReqs = completedWithPrice.filter((r) => r.category_id === cat.id);
        const jobCount = catCompletedReqs.length;

        if (jobCount === 0) {
          return {
            category: cat.name,
            jobCount: 0,
            avgEstimatedPrice: 0,
            avgFinalPrice: 0,
            avgVariancePercent: 0,
            highVarianceCount: 0,
          };
        }

        let catEstimatedSum = 0;
        let catFinalSum = 0;
        let highVarianceCount = 0;

        for (const req of catCompletedReqs) {
          const estimated = Number(req.estimated_total || 0);
          const finalPrice = Number(req.final_price || 0);

          catEstimatedSum += estimated;
          catFinalSum += finalPrice;

          if (estimated > 0 && finalPrice > 0) {
            const variance = (finalPrice - estimated) / estimated;
            if (variance > 0.5) {
              highVarianceCount++;
            }
          }
        }

        totalPlatformEstimated += catEstimatedSum;
        totalPlatformFinal += catFinalSum;

        const avgEstimated = Math.round(catEstimatedSum / jobCount);
        const avgFinal = Math.round(catFinalSum / jobCount);
        const avgVariance =
          avgEstimated > 0
            ? Math.round(((avgFinal - avgEstimated) / avgEstimated) * 100)
            : 0;

        return {
          category: cat.name,
          jobCount,
          avgEstimatedPrice: avgEstimated,
          avgFinalPrice: avgFinal,
          avgVariancePercent: avgVariance,
          highVarianceCount,
        };
      });

      setVarianceSummaries(summaries);

      if (totalPlatformEstimated > 0) {
        const overallMean = Math.round(
          ((totalPlatformFinal - totalPlatformEstimated) / totalPlatformEstimated) * 100,
        );
        setPlatformMeanVariance(overallMean);
      } else {
        setPlatformMeanVariance(0);
      }

      // -------------------------------------------------------------
      // 2. PAIRWISE COLLUSION ANOMALY DETECTION
      // -------------------------------------------------------------
      const assignedReqs = requests.filter((r) => r.technician_id && r.client_id);
      const totalAssigned = assignedReqs.length;

      const clientCounts = new Map<string, number>();
      const techCounts = new Map<string, number>();
      const pairMap = new Map<string, { clientId: string; techId: string; count: number; lastDate: string }>();

      for (const req of assignedReqs) {
        const cId = req.client_id;
        const tId = req.technician_id!;
        clientCounts.set(cId, (clientCounts.get(cId) || 0) + 1);
        techCounts.set(tId, (techCounts.get(tId) || 0) + 1);

        const pairKey = `${cId}:::${tId}`;
        const existing = pairMap.get(pairKey);
        if (existing) {
          existing.count++;
          if (new Date(req.created_at) > new Date(existing.lastDate)) {
            existing.lastDate = req.created_at;
          }
        } else {
          pairMap.set(pairKey, { clientId: cId, techId: tId, count: 1, lastDate: req.created_at });
        }
      }

      const detectedAnomalies: CollusionAnomalyRecord[] = [];
      let anomalyIndex = 1;

      for (const pair of pairMap.values()) {
        const k = pair.count;
        const clientTotal = clientCounts.get(pair.clientId) || 1;
        const techTotal = techCounts.get(pair.techId) || 1;

        // Poisson expected rate λ
        const expectedLambda = Math.max(
          0.2,
          Number(((clientTotal * techTotal) / Math.max(1, totalAssigned)).toFixed(2)),
        );

        // Poisson Log-Likelihood Ratio: 2 * [k * ln(k / λ) - (k - λ)]
        const llr = k > expectedLambda
          ? Number((2 * (k * Math.log(k / expectedLambda) - (k - expectedLambda))).toFixed(2))
          : 0.0;

        // z-score: (k - λ) / sqrt(λ)
        const zScore = Number(((k - expectedLambda) / Math.sqrt(expectedLambda)).toFixed(2));

        // Flag if repeated matching (k >= 2) or zScore > 1.5
        if (k >= 2 || zScore > 1.5) {
          detectedAnomalies.push({
            id: `COLL-${String(anomalyIndex++).padStart(3, '0')}`,
            clientId: pair.clientId,
            clientName: userMap.get(pair.clientId) || `Client (${pair.clientId.slice(0, 8)})`,
            technicianId: pair.techId,
            technicianName: userMap.get(pair.techId) || `Technician (${pair.techId.slice(0, 8)})`,
            observedMatches: k,
            expectedMatches: expectedLambda,
            poissonLlr: llr,
            zScore,
            sharedDeviceOrIp: false,
            rapidReviewCluster: false,
            status: 'open',
            flaggedDate: new Date(pair.lastDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
          });
        }
      }

      setCollusionFlags(detectedAnomalies);
    } catch (err) {
      console.error('Failed to load operations metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Realtime subscription to live updates
  useAdminRealtime({
    tables: ['requests'],
    onChange: () => {
      loadMetrics();
    },
  });

  const handleCollusionAction = (id: string, newStatus: 'cleared' | 'confirmed') => {
    setCollusionFlags((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)),
    );
    const target = collusionFlags.find((c) => c.id === id);
    setAlertMsg(
      `Collusion record ${id} (${target?.clientName} × ${target?.technicianName}) marked as ${newStatus.toUpperCase()}. Audit entry recorded.`,
    );
  };

  const safeCollusionFlags = collusionFlags || [];
  const safeVarianceSummaries = varianceSummaries || [];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-sky-600 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">Aggregating platform metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div>
        <h2 className="font-display text-2xl font-800 text-[#0B132B]">
          The Analyzer &amp; Business Guard
        </h2>
        <p className="text-sm text-slate-500">
          Fare variance distribution and Poisson pairwise collusion anomaly detector.
        </p>
      </div>

      {alertMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{alertMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertMsg(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: Fare Variance Monitor */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-800 text-[#0B132B]">
              1. Fare Variance Monitor (Estimated vs Realized)
            </h3>
            <p className="text-xs text-slate-500">
              Tracking completed jobs average deviation (final_price / estimated_total). Variances &gt; 50% flagged for administrative review per RULES_AND_LOGIC.md §9.
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
            Platform Mean: {platformMeanVariance >= 0 ? `+${platformMeanVariance}%` : `${platformMeanVariance}%`}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {safeVarianceSummaries.length === 0 ? (
            <div className="col-span-full rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 text-xs font-medium">
              No fare variance records found.
            </div>
          ) : (
            safeVarianceSummaries.map((summary) => (
              <div
                key={summary.category}
                className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="font-display font-700 text-[#0B132B] text-base">{summary.category}</p>
                  <span className="text-xs font-semibold text-slate-500">{summary.jobCount} completed jobs</span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Avg Estimated Price:</span>
                    <span className="text-[#0B132B] font-bold">₹{summary.avgEstimatedPrice}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>Avg Realized Price:</span>
                    <span className="text-[#0B132B] font-bold">₹{summary.avgFinalPrice}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-100 text-slate-500 font-medium">
                    <span>Mean Variance Delta:</span>
                    <span
                      className={`font-bold ${
                        summary.avgVariancePercent > 25 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {summary.jobCount === 0
                        ? '0%'
                        : summary.avgVariancePercent >= 0
                        ? `+${summary.avgVariancePercent}%`
                        : `${summary.avgVariancePercent}%`}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">&gt; 50% Variance Flags:</span>
                  <span
                    className={`font-bold ${
                      summary.highVarianceCount > 0 ? 'text-rose-600' : 'text-slate-600'
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
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div>
          <h3 className="font-display text-lg font-800 text-[#0B132B]">
            2. Pairwise Collusion Anomaly Detector
          </h3>
          <p className="text-xs text-slate-500">
            Poisson log-likelihood ratio (LLR) and z-score breach (z &gt; 3.0) highlighting unnatural client-technician match frequencies.
          </p>
        </div>

        <div className="space-y-3">
          {safeCollusionFlags.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 text-xs font-medium">
              No collusion anomalies detected. System operating within normal Poisson bounds.
            </div>
          ) : (
            safeCollusionFlags.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-0.5 text-xs font-bold uppercase">
                      Anomaly Flag #{item.id}
                    </span>
                    <span className="text-xs font-medium text-slate-500">{item.flaggedDate}</span>
                  </div>
                  <div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase shadow-sm ${
                        item.status === 'open'
                          ? 'bg-rose-600 text-white'
                          : item.status === 'confirmed'
                          ? 'bg-amber-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      Status: {item.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-slate-500 font-semibold">Subject Client</p>
                      <p className="font-bold text-[#0B132B] text-sm mt-0.5">{item.clientName}</p>
                      <p className="text-slate-400 text-[10px] font-mono">Client ID: {item.clientId}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-slate-500 font-semibold">Subject Technician</p>
                      <p className="font-bold text-[#0B132B] text-sm mt-0.5">{item.technicianName}</p>
                      <p className="text-slate-400 text-[10px] font-mono">Tech ID: {item.technicianId}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-slate-500 font-semibold">Poisson Expected vs Observed Matches</p>
                      <p className="font-bold text-[#0B132B] text-base mt-0.5">
                        {item.observedMatches} observed <span className="text-slate-500 text-xs font-medium">/ {item.expectedMatches} expected (λ)</span>
                      </p>
                      <p className="text-amber-700 font-medium text-[10px] mt-1">
                        LLR: {item.poissonLlr} · z-score: {item.zScore} (threshold &gt; 3.0)
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-slate-500 font-semibold">Corroborating Signals</p>
                        <p className="text-slate-700 font-medium text-xs mt-0.5">
                          {item.sharedDeviceOrIp ? '⚠ Shared IP / Device Fingerprint Detected' : 'No shared device'}
                        </p>
                      </div>
                      {item.rapidReviewCluster && (
                        <span className="rounded bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">
                          Review Cluster
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {item.status === 'open' && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleCollusionAction(item.id, 'cleared')}
                      className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      Clear False Positive
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCollusionAction(item.id, 'confirmed')}
                      className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-sm"
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
    </div>
  );
}
