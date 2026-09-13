import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type L from "leaflet"
import type { Screen } from "../../types/navigation"
import { useTechnicianProfile } from "../../hooks/useTechnicians"
import { trackingStages as statuses } from "../../fixtures/requests.fixture"
import ClientLiveTrackingMap from "../../components/tracking/ClientLiveTrackingMap"
import { useDispatch } from "../../context/DispatchContext"
import { useLiveTechnicianTracking } from "../../hooks/useLiveTechnicianTracking"

interface Props {
  navigate: (s: Screen) => void
}

export default function LiveTracking({ navigate }: Props) {
  const { job, setStatus } = useDispatch()
  const tech = useTechnicianProfile(job?.technicianId)

  const clientCoords = useMemo(
    () => ({
      latitude: job?.serviceLatitude || 28.608,
      longitude: job?.serviceLongitude || 77.437,
    }),
    [job?.serviceLatitude, job?.serviceLongitude],
  )

  const {
    smoothedCoordinates,
    bearing,
    roadDistanceKm,
    etaMinutes: liveEtaMinutes,
  } = useLiveTechnicianTracking(job?.technicianId, clientCoords, job?.id)

  const initialEta = 15
  const [eta, setEta] = useState(12)
  const [progress, setProgress] = useState(0.15)
  const mapRef = useRef<L.Map | null>(null)
  const onMapReady = useCallback((map: L.Map) => {
    mapRef.current = map
  }, [])

  useEffect(() => {
    if (job?.status === "accepted") setStatus("en-route")
    const interval = setInterval(() => {
      setEta((e) => Math.max(e - 1, 0))
      setProgress((p) => Math.min(p + 0.015, 0.85))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const nextScreen =
      job?.status === "arrived"
        ? "sos-arrived"
        : job?.status === "in-progress"
          ? "sos-inprogress"
          : job?.status === "completed"
            ? "sos-rating"
            : null
    if (!nextScreen && eta !== 0) return
    const timer = window.setTimeout(
      () => navigate(nextScreen ?? "sos-arrived"),
      700,
    )
    return () => window.clearTimeout(timer)
  }, [eta, job?.status, navigate])

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

  const liveStatus =
    job?.status === "arrived"
      ? "Technician has arrived"
      : job?.status === "in-progress"
        ? "Service in progress"
        : `${tech.name} is on the way`

  return (
    <div className="relative flex h-[calc(100vh-64px)] min-h-0 flex-col overflow-hidden bg-gray-50">
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <ClientLiveTrackingMap
            clientCoordinates={clientCoords}
            technicianCoordinates={smoothedCoordinates}
            bearing={bearing}
            heading={bearing}
            etaMinutes={liveEtaMinutes > 0 ? liveEtaMinutes : eta}
            roadDistanceKm={roadDistanceKm > 0 ? roadDistanceKm : undefined}
            serviceAddress={job?.location}
            technician={{
              name: tech.name,
              photo: tech.photo,
              phone: tech.phone,
              rating: typeof tech.rating === 'number' ? tech.rating : parseFloat(String(tech.rating)) || 4.9,
              vehicle: tech.vehicle,
              experience: tech.experience,
            }}
            requestId={job?.id}
            className="h-full rounded-none border-0"
            heightClass="h-full min-h-0"
            onMapReady={onMapReady}
          />
        </div>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 z-10">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <button
              onClick={() => navigate("sos-assigned")}
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-700"
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
            <div className="flex-1">
              <p className="font-display font-700 text-gray-900 text-sm">
                {liveStatus}
              </p>
              <p className="text-xs text-gray-500">
                {job?.service || "Electrical"} emergency ·{" "}
                {job?.location || "Service location"}
              </p>
            </div>
            <div className="text-right">
              <div className="font-display font-800 text-xl text-blue-600">
                {liveEtaMinutes > 0 ? liveEtaMinutes : eta} min
              </div>
              <p className="text-xs text-gray-400">ETA</p>
            </div>
          </div>

          {/* Progress steps */}
          <div className="max-w-md mx-auto mt-3">
            <div className="flex items-center">
              {statuses.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center flex-1 last:flex-none"
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        s.done
                          ? s.active
                            ? "bg-blue-500 text-white"
                            : "bg-emerald-500 text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {s.done && !s.active ? "✓" : s.active ? "●" : "○"}
                    </div>
                    <span
                      className={`text-[10px] mt-0.5 ${
                        s.active
                          ? "text-blue-600 font-600"
                          : s.done
                            ? "text-emerald-600"
                            : "text-gray-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < statuses.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 -mt-3 ${
                        s.done ? "bg-emerald-400" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-[1000] max-h-[48vh] overflow-y-auto rounded-t-2xl bg-white px-5 pt-4 pb-5 shadow-xl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <img
              src={tech.photo}
              alt={tech.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/20"
            />
            <div className="flex-1">
              <p className="font-display font-700 text-gray-900">{tech.name}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span className="text-amber-400">★</span>
                <span>{tech.rating}</span>
                <span>·</span>
                <span>{tech.vehicle || 'Electrician'}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-display font-800 text-2xl text-blue-600">
                {liveEtaMinutes > 0 ? `${liveEtaMinutes} min` : `${eta} min`}
              </div>
              <p className="text-xs text-gray-400">
                {roadDistanceKm > 0 ? `${roadDistanceKm.toFixed(1)} km away` : tech.distance}
              </p>
            </div>
          </div>

          {/* ETA bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-2000"
              style={{ width: `${(1 - (liveEtaMinutes > 0 ? liveEtaMinutes : eta) / initialEta) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => navigate("sos-chat")}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <svg
                className="w-5 h-5 text-blue-600"
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
              <span className="text-xs text-blue-700 font-500">Chat</span>
            </button>
            <a
              href={`tel:${tech.phone.replace(/[^0-9+]/g, '')}`}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <svg
                className="w-5 h-5 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <span className="text-xs text-emerald-700 font-500">Call</span>
            </a>
            <a
              href={`https://wa.me/${tech.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${tech.name}, reaching out regarding my SOS emergency request (${job?.service || 'Service'}) at ${job?.location || 'my address'}.`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-green-50 hover:bg-green-100 transition-colors text-center"
            >
              <span className="text-base leading-none">🟢</span>
              <span className="text-xs text-green-700 font-500">WhatsApp</span>
            </a>
            <button className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              <span className="text-xs text-gray-600 font-500">Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
