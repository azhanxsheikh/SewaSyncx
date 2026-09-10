import { useEffect, useState } from "react"
import { useDispatch } from "../../context/DispatchContext"

export default function IncomingAlert({
  onAccepted,
}: {
  onAccepted: () => void
}) {
  const { job, acceptJob, declineJob } = useDispatch()
  const [seconds, setSeconds] = useState(45)
  const isAlert = job?.status === "requested" || job?.status === "searching"
  useEffect(() => {
    if (!isAlert) return
    const timer = window.setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [isAlert])
  useEffect(() => {
    if (seconds === 0 && isAlert) declineJob()
  }, [seconds, isAlert])
  if (!job || !isAlert)
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">
        No incoming requests right now.
      </div>
    )
  const accept = () => {
    console.log("[technician] request accepted", {
      id: job?.id,
      statusBefore: job?.status,
    })
    acceptJob()
    onAccepted()
  }
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-red-300">Emergency dispatch request</p>
          <h1 className="font-display text-3xl font-800">Review and respond</h1>
        </div>
        <div className="relative flex h-20 w-20 items-center justify-center text-red-300">
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
              strokeDashoffset={`${283 * (1 - seconds / 45)}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="font-display text-2xl font-800">{seconds}</span>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
        <div className="bg-red-500/10 p-5">
          <p className="text-xs font-700 uppercase tracking-wider text-red-300">
            {job.priority} priority
          </p>
          <h2 className="mt-2 font-display text-2xl font-800 capitalize">
            {job.service.replace("-", " ")} emergency
          </h2>
          <p className="mt-1 text-slate-300">{job.location}</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">Customer</p>
            <p className="mt-1 font-600">{job.customerName}</p>
            {job.requesterName && job.requesterName !== job.customerName && (
              <p className="mt-1 text-xs text-slate-400">Requested by {job.requesterName}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500">Estimated total</p>
            <p className="mt-1 font-600">₹{job.estimatedTotal}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-slate-500">Reported symptoms</p>
            <p className="mt-1 text-slate-300">
              {job.symptoms.length
                ? job.symptoms.join(", ")
                : "No symptoms provided"}
            </p>
          </div>
          {job.description && (
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">Description</p>
              <p className="mt-1 text-slate-300">
                {job.description.length > 60
                  ? `${job.description.slice(0, 60)}...`
                  : job.description}
              </p>
            </div>
          )}
          {job.attachments?.length > 0 && (
            <div className="sm:col-span-2 text-xs text-gray-500">
              📷 {job.attachments.length} attachment
              {job.attachments.length === 1 ? "" : "s"}
            </div>
          )}
        </div>
        {job.attachments?.length > 0 && (
          <div className="flex gap-3 border-t border-slate-800 p-5">
            {job.attachments.map((file) =>
              file.type === "video" ? (
                <video
                  key={file.id}
                  src={file.dataUrl}
                  controls
                  className="h-24 w-24 rounded-xl object-cover"
                />
              ) : (
                <a
                  key={file.id}
                  href={file.dataUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                </a>
              ),
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            declineJob()
          }}
          className="rounded-xl border border-slate-700 py-4 font-700 text-slate-300 hover:bg-slate-900"
        >
          Decline
        </button>
        <button
          onClick={accept}
          className="rounded-xl bg-emerald-500 py-4 font-700 text-white hover:bg-emerald-400"
        >
          Accept job
        </button>
      </div>
    </div>
  )
}
