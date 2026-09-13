import { useEffect, useState } from "react"
import { useDispatch } from "../../context/DispatchContext"
import { ALERT_WINDOW_SECONDS, useActiveTechnicianJob } from "../../context/ActiveTechnicianJobContext"
import { formatDestinationLabel } from "../../utils/destinationLabel"
import JobInspectionDrawer from "./JobInspectionDrawer"

export default function IncomingAlert({
  onAccepted,
}: {
  onAccepted: () => void
}) {
  const { job } = useDispatch()
  const { accept, decline, alertDeadline } = useActiveTechnicianJob()
  const [now, setNow] = useState(() => Date.now())
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  const isAlert = job?.status === "requested" || job?.status === "searching"
  // The window is anchored to when this request was first offered (kept in
  // ActiveTechnicianJobContext), so leaving the tab doesn't restart it.
  const seconds = isAlert && job
    ? Math.max(0, Math.ceil((alertDeadline(job.id) - now) / 1000))
    : ALERT_WINDOW_SECONDS
  const alertId = isAlert ? job?.id : undefined

  useEffect(() => {
    if (!isAlert) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [isAlert])

  // A different request (or none — e.g. claimed elsewhere while its drawer was
  // open): never carry the previous alert's open drawer or error over to it.
  useEffect(() => {
    setIsDrawerOpen(false)
    setAcceptError(null)
  }, [alertId])

  useEffect(() => {
    if (seconds === 0 && alertId) {
      setIsDrawerOpen(false)
      // Letting the window lapse is not a decision about the job, so it is
      // hidden for this session only — no dismissal row.
      void decline(alertId, { persist: false })
    }
  }, [seconds, alertId, decline])

  if (!job || !isAlert) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">
        No incoming requests right now.
      </div>
    )
  }

  const destination = formatDestinationLabel(job)

  const handleAccept = async () => {
    setAcceptError(null)
    // accept_request with the signed-in technician's id; throws a readable
    // error (shown by the drawer) if the request was claimed or is invalid.
    await accept(job.id)
    setIsDrawerOpen(false)
    onAccepted()
  }

  const handleDecline = () => {
    setIsDrawerOpen(false)
    // Persists a private dismissal: it stays gone after a reload.
    void decline(job.id)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-red-400">Emergency dispatch request</p>
          <h1 className="font-display text-3xl font-800 text-white">Review and respond</h1>
        </div>
        <div className="relative flex h-20 w-20 items-center justify-center text-red-400">
          <svg
            className="absolute inset-0 h-full w-full -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeOpacity=".2"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray="283"
              strokeDashoffset={`${283 * (1 - seconds / ALERT_WINDOW_SECONDS)}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="font-display text-2xl font-800">{seconds}</span>
        </div>
      </div>

      {acceptError && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/50 p-4 text-sm text-red-200">
          <p className="font-bold">Unable to claim emergency job:</p>
          <p className="text-xs text-red-300 mt-1">{acceptError}</p>
        </div>
      )}

      {/* Tap-to-Inspect Interactive Alert Card */}
      <div
        onClick={() => setIsDrawerOpen(true)}
        className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 transition-all hover:border-red-500/60 hover:shadow-xl hover:shadow-red-500/10"
      >
        <div className="bg-red-500/10 p-5 border-b border-slate-800 group-hover:bg-red-500/15 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-700 uppercase tracking-wider text-red-300">
              {job.priority} priority
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              ₹{job.estimatedTotal}
            </span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-800 capitalize text-white">
            {job.service.replace("-", " ")} emergency
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-200 border border-slate-700">
              {destination.badge}
            </span>
            <p className="text-sm font-medium text-slate-300 truncate">{job.location}</p>
          </div>
        </div>

        <div className="p-5 space-y-3 text-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Customer: <strong className="text-slate-200">{job.customerName}</strong></span>
            {job.symptoms?.length > 0 && (
              <span className="text-emerald-400 font-medium">✓ {job.symptoms.length} symptoms noted</span>
            )}
          </div>

          {job.landmarkAndInstructions && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200">
              <span className="font-bold text-amber-400">🚩 Landmark: </span>
              {job.landmarkAndInstructions}
            </div>
          )}

          {/* Interactive Inspection CTA */}
          <div className="pt-2 flex items-center justify-between text-xs font-bold text-red-400 group-hover:text-red-300">
            <span>Tap to open Pre-Acceptance Inspection Drawer</span>
            <span className="text-base group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleDecline}
          className="rounded-xl border border-slate-700 py-4 font-700 text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="rounded-xl bg-red-600 hover:bg-red-500 py-4 font-700 text-white shadow-lg shadow-red-600/20 transition-colors"
        >
          Inspect & Respond
        </button>
      </div>

      {/* Pre-Acceptance Job Inspection Drawer */}
      <JobInspectionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        job={job}
        onAccept={handleAccept}
        onDecline={handleDecline}
        secondsRemaining={seconds}
      />
    </div>
  )
}

