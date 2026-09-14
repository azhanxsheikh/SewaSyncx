import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { DispatchJob } from "@/types/dispatch"
import type { Database } from "@/types/database"

type CostAdditionRow = Database["public"]["Tables"]["request_cost_additions"]["Row"]

interface Props {
  activeRequestId?: string | null
  job?: DispatchJob | null
  onStatusChange?: (
    status: "approved" | "declined",
    addition: CostAdditionRow,
  ) => void
}

export default function CostAdditionApprovalModal({
  activeRequestId,
  job,
  onStatusChange,
}: Props) {
  const [pendingAddition, setPendingAddition] =
    useState<CostAdditionRow | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const fetchPendingAddition = useCallback(async (reqId: string) => {
    try {
      const { data, error } = await supabase
        .from("request_cost_additions")
        .select("*")
        .eq("request_id", reqId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.warn("Failed to fetch pending cost additions:", error.message)
        return
      }
      setPendingAddition(data ?? null)
    } catch (err) {
      console.warn("Error reading cost additions:", err)
    }
  }, [])

  useEffect(() => {
    const targetId = activeRequestId || job?.id
    if (!targetId) {
      setPendingAddition(null)
      return
    }

    void fetchPendingAddition(targetId)

    // Subscribe to realtime changes on request_cost_additions
    const channel = supabase
      .channel(`cost_additions_client_${targetId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "request_cost_additions",
          filter: `request_id=eq.${targetId}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newRow = payload.new as CostAdditionRow
            if (newRow.status === "pending") {
              setPendingAddition(newRow)
              setActionSuccess(null)
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedRow = payload.new as CostAdditionRow
            if (updatedRow.status !== "pending") {
              setPendingAddition((prev: CostAdditionRow | null) =>
                prev?.id === updatedRow.id ? null : prev,
              )
            } else {
              setPendingAddition(updatedRow)
            }
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string }
            setPendingAddition((prev: CostAdditionRow | null) =>
              prev?.id === oldRow?.id ? null : prev,
            )
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [activeRequestId, job?.id, fetchPendingAddition])

  if (!pendingAddition) return null

  const baseEstimate = job?.estimatedTotal ?? 798
  const additionAmount = Number(pendingAddition.amount) || 0
  const newTotalEstimate = baseEstimate + additionAmount
  const techName = job?.technicianName || "Kevin"
  const techPhoto =
    job?.technicianPhoto ||
    "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150"

  const handleDecision = async (decision: "approved" | "declined") => {
    setIsSubmitting(true)
    try {
      // Try direct update first
      const { error: updateErr } = await supabase
        .from("request_cost_additions")
        .update({
          status: decision,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", pendingAddition.id)

      if (updateErr) {
        // Fallback to RPC if direct table RLS encounters mismatch
        if (decision === "approved") {
          const { error: rpcErr } = await supabase.rpc(
            "approve_cost_addition",
            {
              p_addition_id: pendingAddition.id,
            },
          )
          if (rpcErr) throw new Error(rpcErr.message || updateErr.message)
        } else {
          const { error: rpcErr } = await supabase.rpc(
            "decline_cost_addition",
            {
              p_addition_id: pendingAddition.id,
            },
          )
          if (rpcErr) throw new Error(rpcErr.message || updateErr.message)
        }
      }

      setActionSuccess(
        decision === "approved"
          ? "✓ Extra work approved! Technician will proceed."
          : "✓ Base scope confirmed. Additional work declined.",
      )

      if (onStatusChange) {
        onStatusChange(decision, {
          ...pendingAddition,
          status: decision,
          resolved_at: new Date().toISOString(),
        })
      }

      setTimeout(() => {
        setPendingAddition(null)
        setActionSuccess(null)
      }, 1500)
    } catch (err: any) {
      alert(
        `Could not ${decision} addition: ${err?.message || "Network error"}`,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 space-y-4 shadow-2xl text-slate-900">
        {/* Header Alert */}
        <div className="flex items-center justify-between border-b border-amber-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-sm shadow-sm">
              ⚡
            </span>
            <div>
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                Action Required · On-site Scope Update
              </p>
              <h2 className="font-display text-lg font-800 text-slate-900">
                Additional Work Requested
              </h2>
            </div>
          </div>
        </div>

        {/* Technician note */}
        <div className="flex items-center gap-3 rounded-xl bg-amber-50/80 border border-amber-200/70 p-3">
          <img
            src={techPhoto}
            alt={techName}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-300"
          />
          <div className="flex-1">
            <p className="text-xs text-amber-900 font-bold">
              {techName} (Assigned Technician)
            </p>
            <p className="text-xs text-amber-800/90 leading-snug">
              Has identified extra parts/labor required to complete your repair.
            </p>
          </div>
        </div>

        {/* Reason card */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Technician Diagnosis & Reason
          </p>
          <p className="text-sm font-semibold text-slate-900 leading-relaxed">
            {pendingAddition.reason}
          </p>
          {pendingAddition.tags && pendingAddition.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {pendingAddition.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                >
                  {tag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price Breakdown */}
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/40 p-4 space-y-2.5">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Price Adjustment Summary
          </p>

          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Original base estimate</span>
            <span className="font-semibold text-slate-900">
              ₹{baseEstimate}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Additional parts / labor</span>
            <span className="font-bold text-amber-600">+₹{additionAmount}</span>
          </div>

          <div className="h-px bg-amber-200/80 my-1" />

          <div className="flex justify-between items-center pt-0.5">
            <div>
              <p className="font-display font-800 text-slate-900 text-base">
                New Total Estimate
              </p>
              <p className="text-[11px] text-slate-500">
                Includes all taxes & cooperative guarantee
              </p>
            </div>
            <span className="font-display font-800 text-2xl text-slate-900">
              ₹{newTotalEstimate}
            </span>
          </div>
        </div>

        {/* Protection policy */}
        <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
          <span className="text-base flex-shrink-0">🔒</span>
          <p className="leading-relaxed">
            <strong>Fair Trade Guarantee:</strong> Your explicit approval is
            mandatory. If you decline, the technician will proceed only with the
            original scope at ₹{baseEstimate}.
          </p>
        </div>

        {/* Actions */}
        {actionSuccess ? (
          <div className="rounded-xl bg-emerald-500 text-white p-3 text-center text-sm font-bold animate-pulse">
            {actionSuccess}
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDecision("approved")}
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 py-3.5 font-display font-700 text-white shadow-md shadow-amber-500/20 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>✓ Approve Extra Work — Pay ₹{newTotalEstimate}</>
              )}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDecision("declined")}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 py-3 font-semibold text-slate-700 text-sm active:scale-[0.99] disabled:opacity-50 transition-all"
            >
              ✕ Decline — Maintain Base Scope (₹{baseEstimate})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
