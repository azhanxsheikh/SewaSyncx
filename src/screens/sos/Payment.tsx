import { useState } from "react"
import type { Screen } from "../../types/navigation"
import Header from "../../components/Header"
import { usePaymentMethods, useUpiApps } from "../../hooks/useBilling"
import { useDispatch } from "../../context/DispatchContext"

interface Props {
  navigate: (s: Screen) => void
  onBack: () => void
}

export default function Payment({ navigate, onBack }: Props) {
  const { job } = useDispatch()
  const settledAmount = job?.finalPrice ?? job?.estimatedTotal ?? 998
  const serviceLabel =
    job?.technicianCategory ||
    (job?.service
      ? job.service
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : "AC Repair")
  const jobIdLabel = job?.id
    ? `#JOB-${job.id.replace(/-/g, "").slice(-6).toUpperCase()}`
    : "#JOB-5313B5"

  const methods = usePaymentMethods()
  const upiApps = useUpiApps()
  const [selected, setSelected] = useState("upi")
  const [upiId, setUpiId] = useState("")
  const [paying, setPaying] = useState(false)

  const handlePay = () => {
    setPaying(true)
    setTimeout(() => navigate("sos-invoice"), 2500)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title="Payment" onBack={onBack} showNotification={false} />

      <div className="flex-1 px-4 pt-5 pb-28 max-w-md mx-auto w-full">
        {/* Amount due */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 mb-5 text-center">
          <p className="text-sm text-gray-500">Amount due</p>
          <div className="font-display font-800 text-4xl text-gray-900 mt-1">
            ₹{settledAmount}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {serviceLabel} · Job {jobIdLabel}
          </p>
        </div>

        {/* Payment methods */}
        <p className="font-display font-700 text-gray-900 mb-3">
          Select payment method
        </p>
        <div className="space-y-2 mb-5">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                selected === m.id
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-100 bg-white hover:border-gray-200"
              }`}
            >
              <span className="text-2xl">{m.icon}</span>
              <div className="flex-1">
                <p className="font-600 text-gray-900 text-sm">{m.label}</p>
                <p className="text-xs text-gray-400">{m.desc}</p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selected === m.id ? "border-blue-500" : "border-gray-300"
                }`}
              >
                {selected === m.id && (
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* UPI input */}
        {selected === "upi" && (
          <div className="mb-5 fade-in">
            <p className="text-sm font-600 text-gray-700 mb-2">Enter UPI ID</p>
            <input
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
            />
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {upiApps.map((app) => (
                <button
                  key={app}
                  className="flex-shrink-0 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  {app}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Security note */}
        <div className="bg-gray-50 rounded-xl p-3 flex gap-2 items-start text-xs text-gray-500">
          <svg
            className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span>
            Payments are 256-bit encrypted and processed through secure
            RBI-approved gateways.
          </span>
        </div>
      </div>

      {/* Pay button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={handlePay}
            disabled={paying}
            className="w-full py-4 rounded-xl font-display font-700 text-base bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {paying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing payment...
              </>
            ) : (
              <>💳 Pay ₹{settledAmount}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
