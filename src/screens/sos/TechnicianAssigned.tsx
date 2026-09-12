import { useCallback, useEffect, useRef } from "react"
import type L from "leaflet"
import type { Screen } from "../../types/navigation"
import { useTechnicianProfile } from "../../hooks/useTechnicians"
import LeafletLocationMap from "../../components/LeafletLocationMap"
import TechnicianCard from "../../components/TechnicianCard"
import { useDispatch } from "../../context/DispatchContext"

interface Props {
  navigate: (s: Screen) => void
}

export default function TechnicianAssigned({ navigate }: Props) {
  const { job } = useDispatch()
  const tech = useTechnicianProfile(job?.technicianId)
  const mapRef = useRef<L.Map | null>(null)
  const onMapReady = useCallback((map: L.Map) => {
    mapRef.current = map
  }, [])

  useEffect(() => {
    if (job?.status === "en-route") navigate("sos-tracking")
  }, [job?.status, navigate])

  useEffect(() => {
    const timer = window.setTimeout(() => mapRef.current?.invalidateSize(), 200)
    return () => window.clearTimeout(timer)
  }, [])

  if (!job?.technicianId || !tech) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 text-center">
        <p className="text-sm text-gray-500">
          Finding your assigned technician...
        </p>
      </div>
    )
  }

  return (
    <div className="relative flex h-[calc(100vh-64px)] min-h-0 flex-col overflow-hidden bg-gray-50">
      <div className="relative min-h-0 flex-1">
        <LeafletLocationMap
          initialAddress={job?.location}
          heightClass="h-full min-h-0"
          className="h-full rounded-none border-0"
          showRoute
          onMapReady={onMapReady}
        />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-display font-800 text-xs">
                  SH
                </span>
              </div>
              <span className="font-display font-700 text-gray-900 text-sm">
                SOS HomeFix
              </span>
            </div>
            <span className="text-xs text-emerald-600 font-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Technician Assigned
            </span>
          </div>
        </div>

        {/* Assigned toast */}
        <div className="absolute top-16 left-4 right-4">
          <div className="max-w-md mx-auto bg-emerald-500 text-white px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-200 slide-up">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-sm font-600">
              Technician assigned! {tech.name} is on the way.
            </p>
          </div>
        </div>

        {/* Bottom sheet */}
      </div>

      <div className="relative z-[1000] max-h-[58vh] overflow-y-auto rounded-t-3xl border-t border-gray-100 bg-white px-5 pt-5 pb-6 shadow-lg">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-500 text-xs">Your technician</p>
              <h2 className="font-display font-800 text-xl text-gray-900">
                {tech.name}
              </h2>
            </div>
            <div className="text-right">
              <div className="font-display font-800 text-3xl text-blue-600">
                {tech.eta}
              </div>
              <p className="text-xs text-gray-400">{tech.distance} away</p>
            </div>
          </div>

          <TechnicianCard
            tech={tech}
            onChat={() => navigate("sos-chat")}
            onCall={() => {}}
          />

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span className="text-emerald-600 font-600">✓ Assigned</span>
              <span className="text-blue-600 font-600">On the way</span>
              <span>Arriving</span>
              <span>Arrived</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full w-2/5 transition-all" />
            </div>
          </div>

          {/* Vehicle info */}
          <div className="mt-4 bg-gray-50 rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">🛵</span>
            <div>
              <p className="text-sm font-600 text-gray-800">{tech.vehicle}</p>
              <p className="text-xs text-gray-400">Technician vehicle</p>
            </div>
          </div>

          <button
            onClick={() => navigate("sos-tracking")}
            className="mt-4 w-full py-3.5 rounded-xl font-display font-700 bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm shadow-blue-200"
          >
            Track Live →
          </button>
        </div>
      </div>
    </div>
  )
}
