import { useState, useEffect, useCallback } from "react"
import type { Screen } from "../../types/navigation"
import { useTechnicianProfile } from "../../hooks/useTechnicians"
import { useDispatch } from "../../context/DispatchContext"
import { supabase } from "../../lib/supabaseClient"
import type { Database } from "../../types/database"

type CostAdditionRow = Database["public"]["Tables"]["request_cost_additions"]["Row"]

interface Props {
  navigate: (s: Screen) => void
  onBack: () => void
}

export default function AdditionalCost({ navigate, onBack }: Props) {
  const { job } = useDispatch()
  const techProfile = useTechnicianProfile(job?.technicianId)
  const techName = job?.technicianName || techProfile?.name || "Kevin"
  const techPhoto =
    job?.technicianPhoto ||
    techProfile?.photo ||
    "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150"

  const [pendingAddition, setPendingAddition] =
    useState<CostAdditionRow | null>(null)
  const [approving, setApproving] = useState(false)
  const [declining, setDeclining] = useState(false)

  const fetchAddition = useCallback(async () => {
    if (!job?.id) return
    try {
      const { data } = await supabase
        .from("request_cost_additions")
        .select("*")
        .eq("request_id", job.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      setPendingAddition(data)
    } catch (e) {
      console.warn("Failed to load pending cost addition:", e)
    }
  }, [job?.id])

  useEffect(() => {
    void fetchAddition()

    if (!job?.id) return
    const channel = supabase
      .channel(`screen_cost_additions_${job.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "request_cost_additions",
          filter: `request_id=eq.${job.id}`,
        },
        () => {
          void fetchAddition()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [job?.id, fetchAddition])

  const baseEstimate = job?.estimatedTotal ?? 798
  const additionAmount = pendingAddition ? Number(pendingAddition.amount) : 200
  const newTotal = baseEstimate + additionAmount
  const reasonText =
    pendingAddition?.reason ||
    job?.priceAdjustmentNotes ||
    "Additional on-site repair scope and parts replacement identified during diagnostic inspection."
  const tags =
    pendingAddition?.tags && pendingAddition.tags.length > 0
      ? pendingAddition.tags
      : ["Parts Replacement", "On-site Labor"]

  const handleApprove = async () => {
    setApproving(true)
    try {
      if (pendingAddition?.id) {
        const { error: updateErr } = await supabase
          .from("request_cost_additions")
          .update({
            status: "approved",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", pendingAddition.id)

        if (updateErr) {
          await supabase.rpc("approve_cost_addition", {
            p_addition_id: pendingAddition.id,
          })
        }
      }
      setTimeout(() => navigate("sos-inprogress"), 1000)
    } catch (e) {
      console.error("Approval failed:", e)
      navigate("sos-inprogress")
    } finally {
      setApproving(false)
    }
  }

  const handleDecline = async () => {
    setDeclining(true)
    try {
      if (pendingAddition?.id) {
        const { error: updateErr } = await supabase
          .from("request_cost_additions")
          .update({
            status: "declined",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", pendingAddition.id)

        if (updateErr) {
          await supabase.rpc("decline_cost_addition", {
            p_addition_id: pendingAddition.id,
          })
        }
      }
      setTimeout(() => navigate("sos-inprogress"), 1000)
    } catch (e) {
      console.error("Decline failed:", e)
      navigate("sos-inprogress")
    } finally {
      setDeclining(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-amber-500 px-4 pt-4 pb-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-amber-400/50 hover:bg-amber-400 transition-colors"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <p className="text-amber-100 text-xs font-500">Action required</p>
              <h2 className="font-display font-800 text-white text-lg">
                Additional work required
              </h2>
            </div>
          </div>

          <div className="bg-white/20 rounded-xl p-3 flex items-center gap-3">
            <img
              src={techPhoto}
              alt={techName}
              className="w-8 h-8 rounded-full object-cover"
            />
            <p className="text-white text-sm font-500">
              {techName} has sent an approval request
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pt-5 pb-24 max-w-md mx-auto w-full">
        {/* Reason */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-5">
          <p className="text-xs text-gray-500 font-500 mb-1">
            Reason for additional charge
          </p>
          <p className="text-gray-900 text-sm leading-relaxed">{reasonText}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-white border border-gray-200 text-xs text-gray-600 px-2 py-1 rounded-full"
              >
                {tag.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>

        {/* Pricing breakdown */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-5 mb-5">
          <p className="font-display font-700 text-gray-900 mb-4">
            Updated price breakdown
          </p>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Original estimate</span>
              <span className="font-600 text-gray-900">₹{baseEstimate}</span>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-600 text-gray-900">
                  Additional scope / parts
                </p>
                <p className="text-xs text-gray-400">Parts + on-site labor</p>
              </div>
              <span className="font-600 text-amber-600">
                +₹{additionAmount}
              </span>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between items-center pt-1">
              <span className="font-display font-700 text-gray-900">
                New total
              </span>
              <span className="font-display font-800 text-2xl text-gray-900">
                ₹{newTotal}
              </span>
            </div>
          </div>
        </div>

        {/* Policy note */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 mb-6">
          <span className="text-blue-500 text-base flex-shrink-0">🔒</span>
          <p className="text-blue-800 text-xs leading-relaxed">
            Your approval is required before any additional charges. Declining
            will continue the service at the original estimate.
          </p>
        </div>
      </div>

      {/* Fixed actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto space-y-2">
          {approving ? (
            <div className="w-full py-4 rounded-xl bg-emerald-500 text-white font-display font-700 text-base flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Approving...
            </div>
          ) : (
            <>
              <button
                onClick={handleApprove}
                className="w-full py-4 rounded-xl font-display font-700 text-base bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-200 active:scale-[0.98] transition-all"
              >
                ✓ Approve — Pay ₹{newTotal}
              </button>
              <button
                onClick={handleDecline}
                disabled={declining}
                className="w-full py-3.5 rounded-xl font-600 text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                {declining
                  ? "Declining..."
                  : `Decline — Keep Base Scope (₹${baseEstimate})`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
