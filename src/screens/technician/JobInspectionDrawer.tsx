import { useEffect, useState } from "react"
import type { DispatchAttachment, DispatchJob } from "../../types/dispatch"
import { formatDestinationLabel, formatDiagnosticAnswers } from "../../utils/destinationLabel"
import { fetchRequestAttachments } from "../../lib/sosMedia"
import TechnicianDirectionsMap from "../../components/TechnicianDirectionsMap"

export interface JobInspectionDrawerProps {
  isOpen: boolean
  onClose: () => void
  job: DispatchJob
  onAccept: () => Promise<void> | void
  onDecline: () => void
  secondsRemaining?: number
}

export default function JobInspectionDrawer({
  isOpen,
  onClose,
  job,
  onAccept,
  onDecline,
  secondsRemaining = 45,
}: JobInspectionDrawerProps) {
  const [attachments, setAttachments] = useState<DispatchAttachment[]>(job.attachments || [])
  const [isLoadingMedia, setIsLoadingMedia] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [activeMedia, setActiveMedia] = useState<DispatchAttachment | null>(null)

  // Fetch pre-work attachments from Supabase storage / request_attachments if not already cached
  useEffect(() => {
    let active = true
    if (isOpen && job?.id) {
      if (job.attachments && job.attachments.length > 0) {
        setAttachments(job.attachments)
        return
      }

      setIsLoadingMedia(true)
      fetchRequestAttachments(job.id)
        .then((items) => {
          if (active) {
            setAttachments(items)
          }
        })
        .finally(() => {
          if (active) setIsLoadingMedia(false)
        })
    }
    return () => {
      active = false
    }
  }, [isOpen, job?.id, job?.attachments])

  useEffect(() => {
    if (isOpen) {
      setAcceptError(null)
      setIsAccepting(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const destination = formatDestinationLabel(job)
  const diagnosticAnswers = formatDiagnosticAnswers(job.symptoms)

  const handleAcceptJob = async () => {
    setIsAccepting(true)
    setAcceptError(null)
    try {
      await onAccept()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to claim request"
      setAcceptError(message)
      setIsAccepting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex h-full w-full max-w-xl flex-col bg-white border-l border-slate-200 text-slate-900 shadow-2xl">
        {/* Sticky Header with Countdown */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 font-display font-800 text-sm">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-xl bg-red-200/50" />
              <span>SOS</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                  {job.priority} Priority Dispatch
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-xs font-medium text-slate-500">
                  {secondsRemaining}s to respond
                </span>
              </div>
              <h2 className="font-display text-lg font-800 text-slate-900 capitalize leading-tight">
                {job.service.replace("-", " ")} Emergency
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Error Banner if RPC failed */}
          {acceptError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-bold flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Claim Error</span>
              </p>
              <p className="mt-1 text-xs text-red-600">{acceptError}</p>
            </div>
          )}

          {/* Destination & Beneficiary Distinction */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              {destination.isFamily ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                  <span>🚨</span>
                  <span>{destination.badge}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                  <span>🏠</span>
                  <span>{destination.badge}</span>
                </span>
              )}
              <span className="font-display font-800 text-emerald-700 text-base">
                ₹{job.estimatedTotal}
              </span>
            </div>

            <h3 className="mt-2.5 font-display font-800 text-base sm:text-lg text-slate-900">
              {destination.fullLabel}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>
                <strong className="text-slate-800">Recipient:</strong> {job.customerName}
              </span>
              {destination.isFamily && job.requesterName && (
                <span>
                  <strong className="text-slate-800">Requested by:</strong> {job.requesterName}
                </span>
              )}
            </div>
          </div>

          {/* Client Access Notes / Landmark Banner */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
              <span>🚩</span>
              <span>Client Landmark & Access Instructions</span>
            </div>
            <p className="mt-2 text-sm text-amber-900 font-medium leading-relaxed">
              {job.landmarkAndInstructions || "No gate or landmark instructions specified by client."}
            </p>
            <p className="mt-1.5 text-[11px] text-amber-700">
              💡 Essential for fast security clearance at gated society entrances (MyGate/NoBrokerHood).
            </p>
          </div>

          {/* Static Context Map (Navigation Inactive in Pre-acceptance) */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
            <TechnicianDirectionsMap
              serviceLatitude={job.serviceLatitude}
              serviceLongitude={job.serviceLongitude}
              serviceAddress={job.location}
              mode="preview"
              destinationLabel={destination.fullLabel}
            />
          </div>

          {/* Client Media (Photos & Videos) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-700 text-sm text-slate-900">
                Client Site Media (Pre-Job)
              </h4>
              <span className="text-xs text-slate-500">
                {attachments.length} attachment{attachments.length === 1 ? "" : "s"}
              </span>
            </div>

            {isLoadingMedia ? (
              <div className="flex items-center justify-center py-8 text-xs text-slate-500 gap-2">
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span>Checking pre-job media...</span>
              </div>
            ) : attachments.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {attachments.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setActiveMedia(file)}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white cursor-pointer shadow-sm"
                  >
                    {file.type === "video" ? (
                      <div className="flex h-full w-full items-center justify-center bg-slate-100">
                        <span className="text-2xl">▶️</span>
                      </div>
                    ) : (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    )}
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] text-white">
                      {file.type === "video" ? "Video" : "Photo"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white py-7 text-center">
                <span className="text-2xl">📷</span>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  No pre-job photo provided
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Client did not upload media with this SOS dispatch
                </p>
              </div>
            )}
          </div>

          {/* Diagnostic Answers & Symptoms */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h4 className="font-display font-700 text-sm text-slate-900">
              Diagnostic Answers & Symptoms
            </h4>

            {diagnosticAnswers.length > 0 ? (
              <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-3.5">
                {diagnosticAnswers.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-slate-700 font-medium">{item.question}</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded text-xs">
                      {item.answer}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No diagnostic questionnaire provided</p>
            )}

            {job.description && (
              <div className="mt-2 rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-700 leading-relaxed">
                <span className="text-slate-500 font-semibold">Client note: </span>
                {job.description}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Action Controls Footer */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur-md">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onDecline}
              disabled={isAccepting}
              className="rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 py-3.5 font-bold text-slate-700 transition-colors disabled:opacity-50"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={handleAcceptJob}
              disabled={isAccepting}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] py-3.5 font-bold text-white shadow-lg shadow-emerald-600/20 transition-all disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              {isAccepting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Claiming Job...</span>
                </>
              ) : (
                <span>Accept Emergency Job</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox / Media Viewer Modal */}
      {activeMedia && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setActiveMedia(null)}
        >
          <div className="relative max-h-[90vh] max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActiveMedia(null)}
              className="absolute -top-10 right-0 text-white font-bold text-xl hover:text-red-400"
            >
              ✕ Close
            </button>
            {activeMedia.type === "video" ? (
              <video src={activeMedia.url} controls autoPlay className="max-h-[80vh] rounded-xl" />
            ) : (
              <img src={activeMedia.url} alt={activeMedia.name} className="max-h-[80vh] rounded-xl object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
