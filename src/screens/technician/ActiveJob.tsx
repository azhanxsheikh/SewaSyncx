import { useState } from "react"
import { useDispatch } from "../../context/DispatchContext"
import type { ExecutionStep, JobStatus, PriceAdjustmentReason } from "../../types/dispatch"
import { executionSteps as steps } from "../../fixtures/requests.fixture"
import TechnicianDirectionsMap from "../../components/TechnicianDirectionsMap"
import { supabase } from "../../lib/supabaseClient"
import { constructGoogleMapsNavigationUrl } from "../../utils/geocoding"

export default function ActiveJob() {
  const { job, updateJobStatus, updateJob } = useDispatch()
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [finalPriceInput, setFinalPriceInput] = useState("")
  // No adjustment reason is selected until there's actually a variance —
  // the DB enum has no "no change" value, and a reason is only meaningful
  // (and only required) once finalPrice exceeds estimatedTotal.
  const [adjustmentReason, setAdjustmentReason] = useState<PriceAdjustmentReason | undefined>(undefined)
  const [adjustmentNotes, setAdjustmentNotes] = useState("")
  const [confirmedVariance, setConfirmedVariance] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (
    !job ||
    !["accepted", "en-route", "arrived", "in-progress", "completed"].includes(job.status)
  )
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">
        Accept a dispatch to start a job.
      </div>
    )
  const current = steps.findIndex((step) => step.id === job.executionStep)
  const next = steps[Math.min(current + 1, steps.length - 1)]
  const statusForStep: Record<ExecutionStep, JobStatus> = {
    accepted: "ACCEPTED",
    "en-route": "ON_THE_WAY",
    arrived: "ARRIVED",
    "in-progress": "IN_PROGRESS",
    completed: "COMPLETED",
  }

  const handleOpenCompletionModal = () => {
    setFinalPriceInput(String(job.finalPrice ?? job.estimatedTotal ?? 0))
    setAdjustmentReason(job.priceAdjustmentReason)
    setAdjustmentNotes(job.priceAdjustmentNotes ?? "")
    setConfirmedVariance(false)
    setShowCompletionModal(true)
  }

  const parsedPrice = Number(finalPriceInput)
  const isValidPrice = !isNaN(parsedPrice) && parsedPrice >= 0 && finalPriceInput.trim() !== ""
  const baseEstimate = job.estimatedTotal ?? 0
  const delta = isValidPrice ? parsedPrice - baseEstimate : 0

  const handleCompleteJob = async () => {
    if (!isValidPrice) return
    if (delta !== 0 && !confirmedVariance) return
    if (delta > 0 && !adjustmentReason) return

    setIsSubmitting(true)
    try {
      if (job.id) {
        const { data: rpcData, error: rpcError } = await supabase.rpc("settle_job_payment", {
          p_request_id: job.id,
          p_final_price: parsedPrice,
          p_reason: adjustmentReason,
          p_notes: adjustmentNotes || undefined,
        })
        if (rpcError) {
          console.warn("[technician] settle_job_payment RPC error:", rpcError.message)
        } else {
          console.log("[technician] settle_job_payment RPC success:", rpcData)
        }
      }
      updateJob({
        finalPrice: parsedPrice,
        priceAdjustmentReason: adjustmentReason,
        priceAdjustmentNotes: adjustmentNotes || undefined,
        status: "completed",
        executionStep: "completed",
      })
      updateJobStatus("COMPLETED")
      setShowCompletionModal(false)
    } catch (err) {
      console.error("[technician] completion error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-emerald-300">Active job · {job.id}</p>
        <h1 className="mt-1 font-display text-3xl font-800 capitalize">
          {job.service.replace("-", " ")} emergency
        </h1>
        <p className="mt-1 text-slate-400">
          {job.location} · {job.customerName}
        </p>
        {job.landmarkAndInstructions && (
          <div className="mt-3 mb-4 rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 text-left shadow-sm">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <span>🚩</span>
              <span>Landmark & Entry Instructions for Technician</span>
            </div>
            <p className="mt-1.5 text-sm text-amber-100 font-medium leading-relaxed">
              {job.landmarkAndInstructions}
            </p>
            <p className="mt-1 text-[11px] text-amber-300/70">
              💡 Show this at security gate / MyGate checkpoint for faster society entry
            </p>
          </div>
        )}
        <TechnicianDirectionsMap
          serviceLatitude={job.serviceLatitude}
          serviceLongitude={job.serviceLongitude}
          serviceAddress={job.location}
        />
        {(job.description || job.attachments?.length > 0) && (
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
            {job.description && <p className="text-sm text-gray-700">{job.description}</p>}
            {job.attachments?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {job.attachments.map((file) => file.type === "video" ? (
                  <video key={file.id} src={file.dataUrl} controls className="h-24 w-24 rounded-xl object-cover" />
                ) : (
                  <a key={file.id} href={file.dataUrl} target="_blank" rel="noreferrer">
                    <img src={file.dataUrl} alt={file.name} className="h-24 w-24 rounded-xl object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="mb-5 font-display text-lg font-800">
            Execution console
          </p>
          <div className="space-y-1">
            {steps.map((step, index) => (
              <div key={step.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-700 ${
                      index <= current
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {index < current ? "✓" : index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-10 w-0.5 ${
                        index < current ? "bg-emerald-500" : "bg-slate-800"
                      }`}
                    />
                  )}
                </div>
                <div className="pb-6">
                  <p
                    className={`font-700 ${
                      index === current
                        ? "text-emerald-300"
                        : index < current
                          ? "text-slate-200"
                          : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-sm text-slate-500">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              if (next.id === "completed" || current >= steps.length - 1) {
                handleOpenCompletionModal()
              } else {
                updateJobStatus(statusForStep[next.id])
              }
            }}
            disabled={current >= steps.length - 1 && job.status === "completed"}
            className="w-full rounded-xl bg-emerald-500 py-3 font-700 text-white disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {current >= steps.length - 1 && job.status === "completed"
              ? "Job complete"
              : next.id === "completed"
                ? "Complete & Settle Job"
                : `Mark as ${next.label}`}
          </button>
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs text-slate-500">Customer contact</p>
            <p className="mt-2 font-700">{job.customerName}</p>
            <p className="mt-1 text-sm text-slate-400">{job.customerPhone}</p>
            <a
              href={`tel:${job.customerPhone}`}
              className="mt-4 block rounded-lg bg-slate-800 py-2 text-center text-sm font-600"
            >
              Call customer
            </a>
            <a
              href={`https://wa.me/${job.customerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hello, I am your SewaSync technician for job #" + job.id)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block rounded-lg bg-slate-800 py-2 text-center text-sm font-600"
            >
              WhatsApp customer
            </a>
            <a
              href={
                job.serviceLatitude !== undefined && job.serviceLongitude !== undefined
                  ? constructGoogleMapsNavigationUrl(job.serviceLatitude, job.serviceLongitude, "two_wheeler")
                  : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.location)}&destination_place_id=&travelmode=two_wheeler`
              }
              target="_blank"
              rel="noreferrer"
              className="mt-2 block rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white py-2 text-center text-sm font-600 transition-colors shadow-sm"
            >
              Navigate to client (Google Maps ↗)
            </a>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs text-slate-500">
              {job.finalPrice ? "Final settled amount" : "Job estimate"}
            </p>
            <p className="mt-2 font-display text-2xl font-800">
              ₹{job.finalPrice ?? job.estimatedTotal}
            </p>
            {job.finalPrice !== undefined && job.finalPrice !== job.estimatedTotal && (
              <p className="mt-1 text-xs text-slate-400">
                Adjusted ({job.priceAdjustmentReason?.replace(/_/g, " ")})
              </p>
            )}
          </div>
        </aside>
      </div>

      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Service settlement</p>
                <h2 className="font-display text-lg font-800 text-white">
                  Job Completion & Settlement
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCompletionModal(false)}
                className="text-slate-400 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Base estimate
                </label>
                <div className="rounded-xl border border-slate-800 bg-slate-800 px-4 py-2.5 font-700 text-white">
                  ₹{job.estimatedTotal}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Final settled price (₹ INR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={finalPriceInput}
                  onChange={(e) => setFinalPriceInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:outline-none"
                  placeholder="e.g. 998"
                />
              </div>

              {delta !== 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-800 p-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Estimate variance</span>
                    <span
                      className={`text-xs font-700 ${
                        delta > 0 ? "text-amber-400" : "text-emerald-300"
                      }`}
                    >
                      {delta > 0 ? `+₹${delta} above estimate` : `-₹${Math.abs(delta)} below estimate`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Price differs from estimate. Client agreement confirmation is required.
                  </p>
                </div>
              )}

              {delta !== 0 && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Price adjustment reason
                  </label>
                  <select
                    value={adjustmentReason ?? ""}
                    onChange={(e) =>
                      setAdjustmentReason((e.target.value || undefined) as PriceAdjustmentReason | undefined)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:outline-none"
                  >
                    <option value="" disabled={delta > 0}>
                      {delta > 0 ? "Select a reason" : "No reason (optional)"}
                    </option>
                    <option value="additional_parts">
                      Additional parts replaced
                    </option>
                    <option value="additional_labor_time">
                      Additional labor time
                    </option>
                    <option value="access_difficulty">
                      Access difficulty
                    </option>
                    <option value="misdiagnosis_correction">
                      Misdiagnosis correction
                    </option>
                    <option value="customer_requested_scope_change">
                      Customer requested scope change
                    </option>
                    <option value="other">
                      Other
                    </option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Technician notes / rationale (optional)
                </label>
                <input
                  type="text"
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  placeholder="e.g. Replaced faulty MCB with client approval"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:outline-none"
                />
              </div>

              {delta !== 0 && (
                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedVariance}
                    onChange={(e) => setConfirmedVariance(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-xs text-slate-300">
                    I confirm the client has approved this price variance.
                  </span>
                </label>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleCompleteJob}
                disabled={
                  isSubmitting ||
                  !isValidPrice ||
                  (delta !== 0 && !confirmedVariance) ||
                  (delta > 0 && !adjustmentReason)
                }
                className="w-full rounded-xl bg-emerald-500 py-3 font-700 text-white disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                {isSubmitting ? "Submitting settlement..." : "Confirm & Settle Job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
