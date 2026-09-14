import { useState, useMemo } from "react"
import type { Screen } from "../../types/navigation"
import { usePrimaryTechnician } from "../../hooks/useTechnicians"
import { useDispatch } from "../../context/DispatchContext"
import RaiseDisputeModal from "../../components/RaiseDisputeModal"

interface Props {
  navigate: (s: Screen) => void
}

export default function JobCompleted({ navigate }: Props) {
  const tech = usePrimaryTechnician()
  const { job } = useDispatch()
  const [showDisputeModal, setShowDisputeModal] = useState(false)

  const settledAmount = job?.finalPrice ?? job?.estimatedTotal ?? 798
  const serviceLabel = job?.service
    ? job.service
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "AC Repair"

  const jobDate = useMemo(() => {
    const timestamp = job?.updatedAt || job?.createdAt || Date.now()
    return new Date(timestamp).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }, [job?.updatedAt, job?.createdAt])

  const jobDuration = useMemo(() => {
    if (job?.createdAt && job?.updatedAt && job.updatedAt > job.createdAt) {
      const diffMins = Math.round((job.updatedAt - job.createdAt) / 60000)
      if (diffMins > 0) {
        const hrs = Math.floor(diffMins / 60)
        const mins = diffMins % 60
        return hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min`
      }
    }
    return "48 min"
  }, [job?.createdAt, job?.updatedAt])

  const dynamicWorkItems = useMemo(() => {
    const svc = (job?.service || "").toLowerCase()
    const notes = job?.priceAdjustmentNotes

    if (svc.includes("ac") || svc.includes("cool")) {
      return [
        "Complete diagnostic inspection of compressor, cooling coil & airflow",
        notes
          ? `Restorative work performed: ${notes}`
          : "Cleaned condenser fins and verified refrigerant pressure",
        "Air delivery temperature and electrical load validated",
        "Post-service safety & operational clearance test passed",
      ]
    }
    if (svc.includes("plumb") || svc.includes("leak") || svc.includes("pipe")) {
      return [
        "Comprehensive line pressure and pipe leakage diagnostic inspection",
        notes
          ? `Restorative work performed: ${notes}`
          : "Replaced faulty valve assembly and tightened high-pressure joints",
        "Sanitary seal and smooth water flow rate verified",
        "Post-service safety & operational clearance test passed",
      ]
    }
    if (
      svc.includes("appliance") ||
      svc.includes("machine") ||
      svc.includes("ro")
    ) {
      return [
        "Internal component diagnostic and motor efficiency check",
        notes
          ? `Restorative work performed: ${notes}`
          : "Cleared blockages and tuned operational calibration",
        "Full cycle testing performed under regular load",
        "Post-service safety & operational clearance test passed",
      ]
    }
    return [
      "Comprehensive wiring and circuit diagnostic inspection",
      notes
        ? `Restorative work performed: ${notes}`
        : "Secured electrical contacts and balanced circuit breaker load",
      "Voltage stability and ground earth resistance verified",
      "Post-service safety & operational clearance test passed",
    ]
  }, [job?.service, job?.priceAdjustmentNotes])

  const techDisplayName =
    job?.technicianName || (job?.technicianId ? "Kevin" : tech.name)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Success header */}
      <div className="bg-emerald-500 px-6 pt-12 pb-12 text-center">
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="absolute w-24 h-24 bg-white/20 rounded-full animate-ping" />
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        <h2 className="font-display font-800 text-3xl text-white">
          Problem solved!
        </h2>
        <p className="text-emerald-100 text-sm mt-2">
          {serviceLabel} completed successfully
        </p>
      </div>

      <div className="flex-1 px-4 pt-6 pb-28 max-w-md mx-auto w-full space-y-4">
        {/* Summary */}
        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
          <p className="font-display font-700 text-gray-900 mb-4">
            Service summary
          </p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Service</span>
              <span className="font-600 text-gray-900">{serviceLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Technician</span>
              <span className="font-600 text-gray-900">{techDisplayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-600 text-gray-900">{jobDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Duration</span>
              <span className="font-600 text-gray-900">{jobDuration}</span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between items-center">
              <span className="font-display font-700 text-gray-900">
                Total amount
              </span>
              <span className="font-display font-800 text-2xl text-gray-900">
                ₹{settledAmount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="text-xs font-700 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                COMPLETED
              </span>
            </div>
          </div>
        </div>

        {/* Technician summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
          <img
            src={tech.photo}
            alt={techDisplayName}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-emerald-200"
          />
          <div className="flex-1">
            <p className="font-display font-700 text-gray-900">
              {techDisplayName}
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span className="text-amber-400">★</span>
              <span>4.9</span>
              <span>·</span>
              <span>{serviceLabel} Specialist</span>
            </div>
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-600 px-2 py-0.5 rounded-full mt-1">
              ✓ Verified Professional
            </span>
          </div>
        </div>

        {/* Work done */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="font-display font-700 text-gray-900 text-sm mb-2">
            Work completed
          </p>
          <ul className="space-y-1.5 text-xs text-gray-600">
            {dynamicWorkItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <div className="max-w-md mx-auto space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate("sos-invoice")}
              className="py-3 rounded-xl font-display font-700 text-sm bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              View Bill
            </button>
            <button
              onClick={() => navigate("sos-rating")}
              className="py-3 rounded-xl font-display font-700 text-sm bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98] transition-all"
            >
              Rate Technician
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDisputeModal(true)}
              className="flex-1 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 font-display font-600 text-xs hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>⚠️</span>
              <span>Report an Issue / Raise Complaint</span>
            </button>
            <button
              onClick={() => navigate("home")}
              className="py-2 px-4 rounded-xl text-gray-500 text-xs font-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Home
            </button>
          </div>
        </div>
      </div>

      <RaiseDisputeModal
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        requestId={job?.id || ""}
        serviceName={serviceLabel}
        technicianName={techDisplayName}
      />
    </div>
  )
}
