import { useEffect, useState } from "react"
import type { Screen } from "../../types/navigation"
import { useTechnicianProfile } from "../../hooks/useTechnicians"
import { serviceTimelineStages as stages } from "../../fixtures/requests.fixture"
import { useDispatch } from "../../context/DispatchContext"

interface Props {
  navigate: (s: Screen) => void
}

export default function ServiceInProgress({ navigate }: Props) {
  const { job } = useDispatch()
  const techProfile = useTechnicianProfile(job?.technicianId)
  const techName = job?.technicianName || techProfile?.name || "Kevin"
  const techPhoto =
    job?.technicianPhoto ||
    techProfile?.photo ||
    "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150"
  const serviceName =
    job?.technicianCategory ||
    (job?.service
      ? job.service.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "AC Repair")

  const [elapsed, setElapsed] = useState(0)
  const [currentStage, setCurrentStage] = useState(2)

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  useEffect(() => {
    if (job?.status === "completed") navigate("sos-rating")
  }, [job?.status, navigate])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-500">
                Service in progress
              </p>
              <h2 className="font-display font-800 text-xl text-gray-900">
                {serviceName}
              </h2>
            </div>
            <div className="text-right">
              <div className="font-display font-700 text-blue-600 text-2xl">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </div>
              <p className="text-xs text-gray-400">Elapsed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
        {/* Status card */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <p className="font-display font-700 text-blue-900">
              Repair in progress...
            </p>
            <p className="text-blue-600 text-xs mt-0.5">
              {techName} is working on the service
            </p>
          </div>
        </div>

        {/* Technician */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
          <img
            src={techPhoto}
            alt={techName}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="font-display font-700 text-gray-900 text-sm">
              {techName}
            </p>
            <p className="text-xs text-gray-500">
              {serviceName} · Started 2:42 PM
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("sos-chat")}
              className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Job timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="font-display font-700 text-gray-900 mb-4">
            Job timeline
          </p>
          <div className="space-y-4">
            {stages.map((stage, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      stage.active
                        ? "bg-blue-500 ring-4 ring-blue-100"
                        : stage.done
                          ? "bg-emerald-500"
                          : "bg-gray-100"
                    }`}
                  >
                    {stage.done && !stage.active && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {stage.active && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    )}
                  </div>
                  {i < stages.length - 1 && (
                    <div
                      className={`w-0.5 h-8 mt-1 ${
                        stage.done ? "bg-emerald-200" : "bg-gray-100"
                      }`}
                    />
                  )}
                </div>
                <div className="pb-4">
                  <p
                    className={`text-sm font-600 ${
                      stage.active
                        ? "text-blue-700"
                        : stage.done
                          ? "text-gray-900"
                          : "text-gray-400"
                    }`}
                  >
                    {stage.label}
                  </p>
                  <p className="text-xs text-gray-400">{stage.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost estimate */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-display font-700 text-gray-900 text-sm">
              Current estimate
            </p>
            <span className="text-xs text-gray-400">May change</span>
          </div>
          <div className="text-3xl font-display font-800 text-gray-900">
            ₹{job?.estimatedTotal ?? 798}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Parts may be added. You will be notified before any changes.
          </p>
        </div>

        {/* Emergency trigger */}
        <button
          onClick={() => navigate("sos-additional-cost")}
          className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-600 text-amber-800 text-sm">
                Additional work found?
              </p>
              <p className="text-xs text-amber-600">
                Technician will send an approval request
              </p>
            </div>
            <svg
              className="w-4 h-4 text-amber-500 ml-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </button>
      </div>
    </div>
  )
}
