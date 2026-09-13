import { useEffect, useState } from "react"
import type { Screen } from "../../types/navigation"
import MapView from "../../components/MapView"
import { useDispatch } from "../../context/DispatchContext"
import { useMatchingSteps } from "../../hooks/useMatchingSteps"

interface Props {
  navigate: (s: Screen) => void
}

export default function FindingTechnician({ navigate }: Props) {
  const { job, setStatus, updateJob } = useDispatch()
  const activeRequest = job
  const [radius, setRadius] = useState(() => job?.searchRadiusKm || 10)
  const [countdown, setCountdown] = useState(30)
  const [elapsed, setElapsed] = useState(0)
  const [techProgress, setTechProgress] = useState(0)
  const matchingSteps = useMatchingSteps(elapsed, radius)

  useEffect(() => {
    console.log("[client] finding technician screen", {
      requestId: job?.id,
      status: job?.status,
      radius,
    })
    if (job?.status === "requested") setStatus("searching")
    const interval = setInterval(() => {
      setElapsed((e) => e + 1)
      setTechProgress((p) => Math.min(p + 0.04, 0.45))
    }, 400)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (job?.searchRadiusKm && job.searchRadiusKm !== radius) {
      setRadius(job.searchRadiusKm)
    }
  }, [job?.searchRadiusKm, radius])

  useEffect(() => {
    if (job?.status !== "searching" && job?.status !== "requested") return
    const chronoTimer = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount > 1) return prevCount - 1
        setRadius((currentRadius) => {
          if (currentRadius < 30) {
            const nextRadius = currentRadius + 5
            updateJob({ searchRadiusKm: nextRadius })
            return nextRadius
          } else {
            setStatus("unfulfilled")
            updateJob({ status: "unfulfilled" })
            return currentRadius
          }
        })
        return 30
      })
    }, 1000)
    return () => clearInterval(chronoTimer)
  }, [job?.status, setStatus, updateJob])

  useEffect(() => {
    if (activeRequest)
      console.log("[client] request state received", {
        id: activeRequest.id,
        status: activeRequest.status,
      })
    if (
      activeRequest?.status === "accepted" ||
      activeRequest?.status === "en-route"
    ) {
      try {
        navigate("sos-assigned")
      } catch (error) {
        console.error("Unable to open assigned technician screen", error)
      }
    }
  }, [activeRequest?.status, navigate])

  const dots = Math.floor(elapsed % 4)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Full-screen map */}
      <div className="relative flex-1">
        <MapView
          height="h-full"
          className="rounded-none h-full"
          showRoute={false}
          showTechnician
          techProgress={techProgress}
        />

        {/* Header overlay */}
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
            {job?.status === "unfulfilled" ? (
              <span className="text-xs text-red-500 font-600 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                Unfulfilled
              </span>
            ) : (
              <span className="text-xs text-red-500 font-600 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                Emergency Active
              </span>
            )}
          </div>
        </div>

        {/* Bottom sheet */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="bg-white rounded-t-3xl shadow-xl px-5 pt-5 pb-8">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            <div className="max-w-md mx-auto">
              <div className="text-center mb-5">
                <h2 className="font-display font-800 text-xl text-gray-900">
                  {job?.status === "unfulfilled"
                    ? "Please try again later"
                    : job?.requesterName && job.requesterName !== job.customerName
                    ? `Finding a technician near ${job.customerName}'s location`
                    : "Finding your technician"}
                  {job?.status === "unfulfilled" ? "" : ".".repeat(dots + 1)}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {job?.status === "unfulfilled"
                    ? "We could not find an available technician within 30 km. Please try again later."
                    : `Matching within ${radius} km based on distance, skill, availability & rating`}
                </p>
              </div>

              {/* Animated matching cards */}
              <div className="space-y-2 mb-5">
                {matchingSteps.map((step, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      step.done ? "bg-emerald-50" : "bg-gray-50"
                    }`}
                  >
                    <span className="text-base">{step.icon}</span>
                    <span
                      className={`text-sm flex-1 ${
                        step.done
                          ? "text-emerald-700 font-500"
                          : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </span>
                    {step.done ? (
                      <svg
                        className="w-4 h-4 text-emerald-500 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full animate-spin border-t-transparent flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-blue-700 text-sm font-600">
                  ⏱{" "}
                  {job?.status === "unfulfilled"
                    ? "Dispatch timeout · Try again later"
                    : job?.status === "accepted"
                      ? "Technician accepted your request"
                      : `Searching within ${radius} km · Expanding in ${countdown}s`}
                </p>
                <p className="text-blue-500 text-xs mt-0.5">
                  {job?.status === "unfulfilled"
                    ? "Max search radius 30 km reached without acceptance"
                    : `Search radius: ${radius} km (expands +5 km up to 30 km)`}
                </p>
              </div>

              {job?.status === "unfulfilled" && (
                <button
                  type="button"
                  onClick={() => navigate("home")}
                  className="w-full mt-4 py-3.5 rounded-xl font-display font-700 text-sm bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  Return to Home
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
