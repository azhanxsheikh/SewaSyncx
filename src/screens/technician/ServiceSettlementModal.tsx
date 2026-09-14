import { useState, useEffect, useCallback } from "react"
import type { DispatchJob, PriceAdjustmentReason } from "../../types/dispatch"
import { uploadPostWorkMedia } from "../../lib/sosMedia"
import { useAuth } from "../../context/AuthContext"
import { supabase } from "../../lib/supabaseClient"
import type { Database } from "../../types/database"

type CostAdditionRow = Database["public"]["Tables"]["request_cost_additions"]["Row"]

export interface ServiceSettlementModalProps {
  isOpen: boolean
  onClose: () => void
  job: DispatchJob
  onSettled: (
    finalPrice: number,
    reason?: PriceAdjustmentReason,
    notes?: string,
  ) => Promise<void> | void
}

export default function ServiceSettlementModal({
  isOpen,
  onClose,
  job,
  onSettled,
}: ServiceSettlementModalProps) {
  const { user, userId } = useAuth()
  const [finalPriceInput, setFinalPriceInput] = useState("")
  const [adjustmentReason, setAdjustmentReason] =
    useState<PriceAdjustmentReason | undefined>(undefined)
  const [adjustmentNotes, setAdjustmentNotes] = useState("")
  const [confirmedVariance, setConfirmedVariance] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [costAdditions, setCostAdditions] = useState<CostAdditionRow[]>([])
  const [isRequestingApproval, setIsRequestingApproval] = useState(false)
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null)
  const [settleError, setSettleError] = useState<string | null>(null)

  const fetchCostAdditions = useCallback(async () => {
    if (!job?.id) return
    try {
      const { data, error } = await supabase
        .from("request_cost_additions")
        .select("*")
        .eq("request_id", job.id)
        .order("created_at", { ascending: false })

      if (!error && data) {
        setCostAdditions(data)
      }
    } catch (err) {
      console.warn("Failed to fetch cost additions for settlement:", err)
    }
  }, [job?.id])

  useEffect(() => {
    if (isOpen) {
      setFinalPriceInput(String(job.finalPrice ?? job.estimatedTotal ?? 0))
      setAdjustmentReason(job.priceAdjustmentReason)
      setAdjustmentNotes(job.priceAdjustmentNotes ?? "")
      setConfirmedVariance(false)
      setSelectedFiles([])
      setPreviewUrls([])
      setIsSubmitting(false)
      setApprovalNotice(null)
      setSettleError(null)
      void fetchCostAdditions()
    }
  }, [isOpen, job, fetchCostAdditions])

  useEffect(() => {
    if (!isOpen || !job?.id) return

    const channel = supabase
      .channel(`settlement_cost_additions_${job.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "request_cost_additions",
          filter: `request_id=eq.${job.id}`,
        },
        () => {
          void fetchCostAdditions()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [isOpen, job?.id, fetchCostAdditions])

  if (!isOpen) return null

  const parsedPrice = Number(finalPriceInput)
  const isValidPrice =
    !isNaN(parsedPrice) && parsedPrice >= 0 && finalPriceInput.trim() !== ""
  const baseEstimate = job.estimatedTotal ?? 0
  const delta = isValidPrice ? parsedPrice - baseEstimate : 0

  const approvedTotal = costAdditions
    .filter((ca) => ca.status === "approved")
    .reduce((sum, ca) => sum + Number(ca.amount), 0)

  const pendingAddition = costAdditions.find((ca) => ca.status === "pending")
  const hasApprovedCoverage = approvedTotal >= delta

  const handleRequestApproval = async () => {
    if (delta <= 0) return
    if (!adjustmentReason && !adjustmentNotes.trim()) {
      setSettleError(
        "Please select a reason or enter notes for the additional cost before requesting approval.",
      )
      return
    }

    setIsRequestingApproval(true)
    setSettleError(null)
    setApprovalNotice(null)

    try {
      const reasonText = adjustmentNotes.trim()
        ? `${
            adjustmentReason ? adjustmentReason.replace(/_/g, " ") + ": " : ""
          }${adjustmentNotes.trim()}`
        : adjustmentReason
          ? adjustmentReason.replace(/_/g, " ")
          : "Additional parts and on-site labor"

      const tags = adjustmentReason ? [adjustmentReason] : ["parts"]

      // Try RPC first
      const { error: rpcErr } = await supabase.rpc("create_cost_addition", {
        p_request_id: job.id,
        p_reason: reasonText,
        p_amount: delta,
        p_tags: tags,
      })

      if (rpcErr) {
        // Fallback to table insert
        const { error: insertErr } = await supabase
          .from("request_cost_additions")
          .insert({
            request_id: job.id,
            reason: reasonText,
            amount: delta,
            tags,
            status: "pending",
          })
        if (insertErr) throw new Error(insertErr.message || rpcErr.message)
      }

      setApprovalNotice(`Approval request for +₹${delta} sent to client app!`)
      await fetchCostAdditions()
    } catch (err: any) {
      setSettleError(
        `Could not send approval request: ${err.message || "Network error"}`,
      )
    } finally {
      setIsRequestingApproval(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const newFiles = Array.from(e.target.files)
    setSelectedFiles((prev) => [...prev, ...newFiles])
    const newUrls = newFiles.map((f) => URL.createObjectURL(f))
    setPreviewUrls((prev) => [...prev, ...newUrls])
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSettle = async () => {
    if (!isValidPrice) return
    if (delta > 0 && !hasApprovedCoverage) {
      setSettleError(
        `Cannot settle: Final price exceeds estimate by ₹${delta} without client approval. Please request client approval first.`,
      )
      return
    }
    if (delta !== 0 && !confirmedVariance) return
    if (delta > 0 && !adjustmentReason) return

    setIsSubmitting(true)
    setSettleError(null)
    try {
      const activeTechId = user?.id || userId
      if (selectedFiles.length > 0 && activeTechId) {
        await uploadPostWorkMedia(job.id, activeTechId, selectedFiles)
      }
      await onSettled(parsedPrice, adjustmentReason, adjustmentNotes)
      onClose()
    } catch (err: any) {
      setSettleError(`Settlement failed: ${err?.message || "Unknown error"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xl text-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">
              Service settlement
            </p>
            <h2 className="font-display text-lg font-800 text-slate-900">
              Job Completion & Settlement
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Base Estimate */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Base estimate
            </label>
            <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 font-display font-700 text-slate-900 shadow-inner">
              <span className="mr-1 text-slate-500 font-normal">₹</span>
              <span>{baseEstimate}</span>
            </div>
          </div>

          {/* Final settled price */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Final settled price (₹ INR)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-slate-700 font-bold select-none text-base">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={finalPriceInput}
                onChange={(e) => setFinalPriceInput(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-8 pr-4 py-2.5 text-slate-900 font-semibold focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none placeholder:text-slate-400 font-normal transition-all"
                placeholder="e.g. 998"
              />
            </div>
          </div>

          {/* Variance Box */}
          {delta !== 0 && (
            <div
              className={`rounded-xl border p-3.5 space-y-1.5 transition-all ${
                delta > 0
                  ? "bg-amber-50/80 border-amber-200 text-amber-900"
                  : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">
                  Estimate variance
                </span>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                    delta > 0
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {delta > 0
                    ? `+₹${delta} above estimate`
                    : `-₹${Math.abs(delta)} below estimate`}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Price differs from initial estimate. Client agreement
                confirmation is required for cooperative auditing.
              </p>
            </div>
          )}

          {/* Price Adjustment Reason */}
          {delta !== 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Price adjustment reason{" "}
                {delta > 0 && <span className="text-red-500">*</span>}
              </label>
              <select
                value={adjustmentReason ?? ""}
                onChange={(e) =>
                  setAdjustmentReason(
                    (e.target.value ||
                      undefined) as PriceAdjustmentReason | undefined,
                  )
                }
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 font-medium focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
              >
                <option value="" disabled={delta > 0}>
                  {delta > 0 ? "Select a reason..." : "No reason (optional)"}
                </option>
                <option value="additional_parts">
                  Additional parts replaced
                </option>
                <option value="additional_labor_time">
                  Additional labor time
                </option>
                <option value="access_difficulty">
                  Access difficulty / Society clearance delay
                </option>
                <option value="misdiagnosis_correction">
                  Misdiagnosis correction
                </option>
                <option value="customer_requested_scope_change">
                  Customer requested scope change
                </option>
                <option value="other">Other verified reason</option>
              </select>
            </div>
          )}

          {/* Technician Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Technician notes / rationale (optional)
            </label>
            <input
              type="text"
              value={adjustmentNotes}
              onChange={(e) => setAdjustmentNotes(e.target.value)}
              placeholder="e.g. Replaced burnt capacitor with client approval"
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-slate-900 font-medium focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none placeholder:text-slate-400 font-normal transition-all"
            />
          </div>

          {/* Client Cost Addition Approval Section for Upward Variance */}
          {delta > 0 && (
            <div className="rounded-xl border p-3.5 space-y-2.5 transition-all">
              {hasApprovedCoverage ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold text-base">
                    ✓
                  </span>
                  <div>
                    <p className="text-xs font-bold text-emerald-900">
                      Client Approval Verified (+₹{approvedTotal})
                    </p>
                    <p className="text-[11px] text-emerald-800 leading-snug">
                      Client has approved extra cost covering this variance (+₹
                      {delta}). Settlement is authorized.
                    </p>
                  </div>
                </div>
              ) : pendingAddition ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-bold text-amber-900">
                      Awaiting Client In-App Approval (+₹
                      {pendingAddition.amount})
                    </p>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    An urgent approval modal is displayed on the client&apos;s
                    device. Waiting for the client to tap &quot;Approve Extra
                    Work&quot;.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="text-xs font-bold text-amber-900">
                      Client In-App Approval Required (+₹{delta})
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                      Under Cooperative Fair Trade rules, final price cannot
                      exceed estimate without the client approving the cost
                      addition on their screen.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={
                      isRequestingApproval ||
                      (!adjustmentReason && !adjustmentNotes.trim())
                    }
                    onClick={handleRequestApproval}
                    className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white py-2.5 font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all"
                  >
                    {isRequestingApproval ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending Request to Client...
                      </>
                    ) : (
                      <>📤 Send Approval Request to Client (+₹{delta})</>
                    )}
                  </button>
                </div>
              )}

              {approvalNotice && (
                <p className="text-xs text-emerald-700 font-semibold text-center animate-pulse">
                  ✓ {approvalNotice}
                </p>
              )}
            </div>
          )}

          {/* Settle Error Banner */}
          {settleError && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-medium">
              ⚠️ {settleError}
            </div>
          )}

          {/* Post-Work Verification Photos */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Post-work verification photo (optional / recommended)
            </label>
            <div className="space-y-2">
              <label className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors text-center">
                <span className="text-xl mb-1">📷</span>
                <span className="text-xs font-semibold text-slate-700">
                  {selectedFiles.length > 0
                    ? "Add more photos"
                    : "Upload completion proof photo"}
                </span>
                <span className="text-[11px] text-slate-400">
                  Stored securely in request-attachments for settlement & audit
                  records
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {previewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {previewUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group"
                    >
                      <img
                        src={url}
                        alt={`Post work ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Client Confirmation Checkbox */}
          {delta !== 0 && (
            <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmedVariance}
                onChange={(e) => setConfirmedVariance(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 accent-red-600"
              />
              <span className="text-xs text-slate-700 font-medium leading-normal">
                I confirm the client has explicitly agreed to this final price
                variance.
              </span>
            </label>
          )}
        </div>

        <div className="pt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSettle}
            disabled={
              isSubmitting ||
              !isValidPrice ||
              (delta !== 0 && !confirmedVariance) ||
              (delta > 0 && !adjustmentReason) ||
              (delta > 0 && !hasApprovedCoverage)
            }
            className="w-2/3 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 font-bold text-white shadow-md shadow-emerald-600/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all"
          >
            {isSubmitting
              ? "Submitting settlement..."
              : delta > 0 && !hasApprovedCoverage
                ? pendingAddition
                  ? "Awaiting Client Approval..."
                  : `Needs Approval (+₹${delta})`
                : `Confirm & Settle (₹${parsedPrice})`}
          </button>
        </div>
      </div>
    </div>
  )
}
