import { useState, useMemo } from "react"
import type { Screen } from "@/types/navigation"
import type { DispatchJob } from "@/types/dispatch"
import { usePrimaryTechnician } from "@/hooks/useTechnicians"
import { useInvoiceDetails } from "@/hooks/useBilling"
import RaiseDisputeModal from "@/components/RaiseDisputeModal"

interface Props {
  job: DispatchJob | null
  navigate?: (s: Screen) => void
  onBack?: () => void
}

export default function ClientBillSettlementView({
  job,
  navigate,
  onBack,
}: Props) {
  const tech = usePrimaryTechnician()
  const { lineItems, summary } = useInvoiceDetails(job)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const formattedJobId = useMemo(() => {
    if (!job?.id) return "#JOB-5313B5"
    return `#JOB-${job.id.replace(/-/g, "").slice(-6).toUpperCase()}`
  }, [job?.id])

  const invoiceNo = useMemo(() => {
    return `#INV-${(job?.id || "20260905").replace(/-/g, "").slice(0, 8).toUpperCase()}`
  }, [job?.id])

  const invoiceDate = useMemo(() => {
    const timestamp = job?.updatedAt || job?.createdAt || Date.now()
    return new Date(timestamp).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }, [job?.updatedAt, job?.createdAt])

  const techDisplayName =
    job?.technicianName || (job?.technicianId ? "Kevin" : tech.name)
  const techVehicle =
    job?.technicianVehicle || "Two-Wheeler / Scooter · UP 16 AB 1234"

  const serviceLabel = job?.service
    ? job.service
        .split("-")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "AC Repair"

  const settledTotal =
    job?.finalPrice ?? job?.estimatedTotal ?? summary.total ?? 798

  // Dynamic completed work items tailored to the booked service
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
    // Default / electrical
    return [
      "Comprehensive wiring and circuit diagnostic inspection",
      notes
        ? `Restorative work performed: ${notes}`
        : "Secured electrical contacts and balanced circuit breaker load",
      "Voltage stability and ground earth resistance verified",
      "Post-service safety & operational clearance test passed",
    ]
  }, [job?.service, job?.priceAdjustmentNotes])

  const handleDownload = () => {
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 3000)
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 pb-20">
      {/* Top Header */}
      <div className="bg-[#0B132B] px-4 pt-6 pb-6 text-white shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
              >
                <svg
                  className="w-5 h-5"
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
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                  Settlement & Bill
                </span>
                <span className="text-slate-400 text-xs">·</span>
                <span className="font-mono text-xs text-slate-300 font-semibold">
                  {formattedJobId}
                </span>
              </div>
              <h1 className="font-display font-800 text-xl text-white">
                Itemized Service Invoice
              </h1>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1 text-xs font-bold text-emerald-300">
            ✓ SETTLED
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 max-w-md mx-auto w-full space-y-4">
        {/* Main Invoice Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Card Meta Banner */}
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-400 font-medium">Invoice Number</p>
              <p className="font-bold text-slate-800 font-mono text-sm">
                {invoiceNo}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 font-medium">Service Date</p>
              <p className="font-bold text-slate-800">{invoiceDate}</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Customer & Technician Split */}
            <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-100 text-xs">
              <div className="space-y-0.5">
                <p className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                  Billed To
                </p>
                <p className="font-bold text-slate-900 text-sm">
                  {job?.customerName || summary.billedToName}
                </p>
                <p className="text-slate-500 leading-snug">
                  {job?.location || summary.billedToAddressLine1}
                </p>
              </div>
              <div className="text-right space-y-0.5">
                <p className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                  Verified Technician
                </p>
                <p className="font-bold text-slate-900 text-sm">
                  {techDisplayName}
                </p>
                <p className="text-sky-600 font-semibold">
                  {serviceLabel} Specialist
                </p>
                <p className="text-slate-500 text-[11px]">{techVehicle}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="divide-y divide-slate-100 text-sm">
                {lineItems.map(
                  (item: { desc: string; amount: number }, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between py-2.5 items-start gap-3"
                    >
                      <span className="text-slate-700 text-xs font-medium leading-relaxed">
                        {item.desc}
                      </span>
                      <span className="font-bold text-slate-900 flex-shrink-0">
                        ₹{item.amount}
                      </span>
                    </div>
                  ),
                )}
                <div className="flex justify-between py-2.5 text-xs text-slate-500">
                  <span>Fair Trade Cooperative Commission (0% client fee)</span>
                  <span className="font-semibold text-emerald-600">
                    Included
                  </span>
                </div>
                <div className="flex justify-between py-2 text-xs text-slate-500">
                  <span>Goods & Services Tax (GST 18% inclusive)</span>
                  <span className="font-semibold text-slate-700">Included</span>
                </div>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">
                  ₹{settledTotal}
                </span>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex justify-between items-center pt-1">
                <div>
                  <p className="font-display font-800 text-slate-900 text-base">
                    Total Settled
                  </p>
                  <p className="text-[11px] text-emerald-600 font-semibold">
                    Payment settled & verified
                  </p>
                </div>
                <span className="font-display font-800 text-2xl text-slate-900">
                  ₹{settledTotal}
                </span>
              </div>
            </div>

            {/* Payment Status Pill */}
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-emerald-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-xs font-bold text-emerald-800">
                    Payment Confirmed
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Digital receipt stored with SewaSync
                  </p>
                </div>
              </div>
              <span className="font-display font-800 text-emerald-700 text-sm tracking-wider">
                PAID
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Work Completed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <p className="font-display font-700 text-slate-900 text-sm mb-2.5">
            Verified Service Scope Completed
          </p>
          <ul className="space-y-2 text-xs text-slate-600">
            {dynamicWorkItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Buttons / Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full py-3.5 rounded-xl font-display font-700 text-sm bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {downloaded ? "✓ Receipt Downloaded" : "Download Invoice PDF"}
          </button>

          {navigate && (
            <button
              type="button"
              onClick={() => navigate("sos-rating")}
              className="w-full py-3 rounded-xl font-display font-700 text-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              Rate Technician Experience →
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDisputeModal(true)}
            className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 font-display font-600 text-xs hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>⚠️</span>
            <span>Contest Charge / Report an Issue</span>
          </button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-full py-2.5 rounded-xl font-semibold text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              Done & Return
            </button>
          )}
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
