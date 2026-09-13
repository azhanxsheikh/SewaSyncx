import { useState } from "react"
import { useDispatch } from "../../context/DispatchContext"
import type { ExecutionStep, PriceAdjustmentReason } from "../../types/dispatch"
import { executionSteps as steps } from "../../fixtures/requests.fixture"
import TechnicianDirectionsMap from "../../components/TechnicianDirectionsMap"
import { useActiveTechnicianJob, type ConsoleTransition } from "../../context/ActiveTechnicianJobContext"
import { constructGoogleMapsNavigationUrl } from "../../utils/geocoding"
import { formatDestinationLabel } from "../../utils/destinationLabel"
import ServiceSettlementModal from "./ServiceSettlementModal"

export function formatJobId(id?: string | null): string {
  if (!id) return "#JOB-000000"
  if (id.startsWith("#JOB-")) return id
  const clean = id.replace(/^job-/, "")
  return `#JOB-${clean.slice(-6).toUpperCase()}`
}

// Console step -> the request_status advance_request_status moves to.
// `accepted` is set only by accept_request and `completed` only by
// settle_job_payment, so neither is sent from here.
const CONSOLE_TRANSITION: Partial<Record<ExecutionStep, ConsoleTransition>> = {
  "en-route": "en_route",
  arrived: "arrived",
  "in-progress": "in_progress",
}

export interface ActiveJobProps {
  onOpenAlerts?: () => void
}

export default function ActiveJob({ onOpenAlerts }: ActiveJobProps) {
  const { job } = useDispatch()
  const { advance, settle, mutating, error, notice, completedJob, dismissCompletedJob } = useActiveTechnicianJob()
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  // Settled in this session: the request is already `completed` server-side,
  // so this summary is held in ActiveTechnicianJobContext until closed.
  if (completedJob) {
    const settledAmount = completedJob.finalPrice ?? completedJob.estimatedTotal
    return (
      <div className="mx-auto max-w-xl py-6 px-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 sm:p-12 text-center shadow-xl backdrop-blur-sm">
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Payment settled · {formatJobId(completedJob.id)}</span>
          </div>
          <h2 className="font-display text-2xl font-800 text-white tracking-tight">
            Job Complete
          </h2>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            <span className="capitalize">{completedJob.service.replace("-", " ")}</span> emergency for {completedJob.customerName}
          </p>
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left">
            <p className="text-xs text-slate-500">Final settled amount</p>
            <p className="mt-2 font-display text-2xl font-800">₹{settledAmount}</p>
            {settledAmount !== completedJob.estimatedTotal && (
              <p className="mt-1 text-xs text-slate-400">
                Estimate ₹{completedJob.estimatedTotal}
                {completedJob.priceAdjustmentReason ? ` · Adjusted (${completedJob.priceAdjustmentReason.replace(/_/g, " ")})` : ""}
              </p>
            )}
          </div>
          {completedJob.priceAdjustmentNotes && (
            <div className="mt-3 mb-4 rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 text-left shadow-sm">
              <p className="text-xs text-slate-500">Adjustment notes</p>
              <p className="mt-1.5 text-sm text-amber-100 font-medium leading-relaxed">{completedJob.priceAdjustmentNotes}</p>
            </div>
          )}
          <div className="mt-6">
            <button
              type="button"
              onClick={dismissCompletedJob}
              className="w-full rounded-xl bg-emerald-500 py-3 font-700 text-white"
            >
              Close & Return to Standby
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!job ||!["accepted", "en-route", "en_route", "arrived", "in-progress", "in_progress"].includes(job.status)) {
    return (
      <div className="mx-auto max-w-xl py-6 px-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 sm:p-12 text-center shadow-xl backdrop-blur-sm">
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/20" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
              <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07-7.07l-1.41 1.41M6.34 17.66l-1.41 1.41m12.14 0l-1.41-1.41M6.34 6.34L4.93 4.93" />
                <circle cx="12" cy="12" r="3" strokeWidth={1.75} />
              </svg>
            </span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SewaSync Worker Cooperative</span>
          </div>
          {notice && (
            <div className="mt-3 mb-4 rounded-2xl border border-amber-500/30 bg-amber-950/40 p-4 text-left shadow-sm">
              <p className="mt-1.5 text-sm text-amber-100 font-medium leading-relaxed">{notice}</p>
            </div>
          )}
          <h2 className="font-display text-2xl font-800 text-white tracking-tight">
            Ready for Dispatch
          </h2>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            You are currently online. New emergency alerts in your operating zone will appear in Incoming Alerts.
          </p>
          {onOpenAlerts && (
            <div className="mt-6">
              <button
                type="button"
                onClick={onOpenAlerts}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-700 text-sm shadow-lg shadow-red-600/20 transition-all active:scale-[0.98]"
              >
                View Incoming Alerts →
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const current = steps.findIndex((step) => step.id === job.executionStep)
  const next = steps[Math.min(current + 1, steps.length - 1)]

  const handleOpenCompletionModal = () => {
    setShowCompletionModal(true)
  }

  const handleCompleteJob = async (
    parsedPrice: number,
    adjustmentReason?: PriceAdjustmentReason,
    adjustmentNotes?: string
  ) => {
    // Local state becomes "completed" only if settle_job_payment succeeds;
    // on failure the console shows the reason and re-reads the request.
    await settle(parsedPrice, adjustmentReason, adjustmentNotes || undefined)
  }

  const formattedJobId = formatJobId(job.id)
  const destination = formatDestinationLabel(job)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-emerald-400">Active job · {formattedJobId}</p>
          <span className="text-slate-600">·</span>
          <span className={`text-xs px-2 py-0.5 rounded font-bold ${destination.isFamily ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
            {destination.badge}
          </span>
        </div>
        <h1 className="mt-1 font-display text-3xl font-800 capitalize">
          {job.service.replace("-", " ")} emergency
        </h1>
        <p className="mt-1 text-slate-300 font-medium">
          {destination.fullLabel}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          Recipient: {job.customerName} ({job.customerPhone}){destination.isFamily && job.requesterName ? ` · Requested by ${job.requesterName}` : ""}
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
          mode="active"
          destinationLabel={destination.fullLabel}
        />

        {(job.description || job.attachments?.length > 0) && (
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
            {job.description && <p className="text-sm text-gray-700">{job.description}</p>}
            {job.attachments?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {job.attachments.map((file) => file.type === "video" ? (
                  <video key={file.id} src={file.url} controls className="h-24 w-24 rounded-xl object-cover" />
                ) : (
                  <a key={file.id} href={file.url} target="_blank" rel="noreferrer">
                    <img src={file.url} alt={file.name} className="h-24 w-24 rounded-xl object-cover" />
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
                return
              }
              const transition = CONSOLE_TRANSITION[next.id]
              if (transition) void advance(transition)
            }}
            disabled={mutating || (current >= steps.length - 1 && job.status === "completed")}
            className="w-full rounded-xl bg-emerald-500 py-3 font-700 text-white disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {current >= steps.length - 1 && job.status === "completed"
              ? "Job complete"
              : mutating
                ? "Updating…"
                : next.id === "completed"
                  ? "Complete & Settle Job"
                  : next.id === "in-progress"
                    ? "Start Work"
                    : `Mark as ${next.label}`}
          </button>
          {(error || notice) && (
            <div className="mt-3 rounded-xl border border-red-500/40 bg-red-950/50 p-4 text-sm text-red-200">
              {error ?? notice}
            </div>
          )}
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
              href={`https://wa.me/${job.customerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hello, I am your SewaSync technician for ${formattedJobId}`)}`}
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

      <ServiceSettlementModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        job={job}
        onSettled={handleCompleteJob}
      />
    </div>
  )
}
