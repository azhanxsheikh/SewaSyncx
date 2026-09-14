import { useState } from "react"
import { supabase } from "../lib/supabaseClient"

export interface CancelRequestModalProps {
  isOpen: boolean
  onClose: () => void
  requestId: string
  serviceName?: string
  onSuccess?: () => void
}

const CANCELLATION_REASONS = [
  { id: "resolved", label: "Issue resolved itself" },
  { id: "delay", label: "Technician taking too long" },
  { id: "wrong_address", label: "Selected wrong address" },
  { id: "other", label: "Other" },
]

export default function CancelRequestModal({
  isOpen,
  onClose,
  requestId,
  serviceName = "Emergency Request",
  onSuccess,
}: CancelRequestModalProps) {
  const [selectedReason, setSelectedReason] = useState(
    CANCELLATION_REASONS[0].label,
  )
  const [customReason, setCustomReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleConfirmCancel = async () => {
    setIsSubmitting(true)
    setErrorMessage(null)

    const reasonText =
      selectedReason === "Other"
        ? customReason.trim() || "Other"
        : selectedReason

    try {
      // 1. Attempt privileged RPC cancel_request
      const { error: rpcError } = await supabase.rpc("cancel_request", {
        p_request_id: requestId,
        p_reason: reasonText,
      })

      if (rpcError) {
        console.warn(
          "RPC cancel_request failed, trying direct update fallback:",
          rpcError.message,
        )
        // 2. Direct fallback matching requests_update_client_cancel RLS
        const { error: updateError } = await supabase
          .from("requests")
          .update({
            status: "cancelled",
            cancellation_reason: reasonText,
          })
          .eq("id", requestId)

        if (updateError) {
          throw updateError
        }
      }

      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (err: unknown) {
      console.error("Failed to cancel emergency request:", err)
      const message =
        err instanceof Error
          ? err.message
          : "Failed to cancel request. Please try again."
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xl">
              ⚠️
            </div>
            <div>
              <h3 className="font-display font-800 text-base text-gray-900 leading-tight">
                Cancel Request?
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{serviceName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Prompt */}
        <p className="text-xs text-gray-600 leading-relaxed">
          Are you sure you want to cancel this emergency request? If a
          technician is already assigned, they will be notified immediately.
        </p>

        {/* Reason Selector */}
        <div className="space-y-2">
          <label className="text-xs font-700 text-gray-700 block">
            Reason for Cancellation:
          </label>
          <div className="space-y-1.5">
            {CANCELLATION_REASONS.map((r) => (
              <label
                key={r.id}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedReason === r.label
                    ? "border-red-500 bg-red-50/50 text-red-900 font-semibold"
                    : "border-gray-200 bg-gray-50/50 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="cancellationReason"
                  value={r.label}
                  checked={selectedReason === r.label}
                  onChange={() => setSelectedReason(r.label)}
                  className="w-3.5 h-3.5 text-red-600 accent-red-600"
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>

          {selectedReason === "Other" && (
            <textarea
              rows={2}
              placeholder="Please specify why you are cancelling..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full mt-1.5 p-2.5 rounded-xl border border-gray-200 text-xs text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          )}
        </div>

        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-display font-600 text-xs transition-colors"
          >
            Keep Booking
          </button>
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display font-600 text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "Confirm Cancel"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
