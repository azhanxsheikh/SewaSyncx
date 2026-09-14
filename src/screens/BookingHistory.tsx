import { useState, useMemo } from "react"
import type { Screen } from "../types/navigation"
import { bookingFilterTabs as tabs } from "../fixtures/requests.fixture"
import { useBookings } from "../hooks/useBookings"
import { useUnreadNotificationsCount } from "../hooks/useAccount"
import { useDispatch } from "../context/DispatchContext"
import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import BookingDetailsModal from "../components/BookingDetailsModal"
import CancelRequestModal from "../components/CancelRequestModal"
import type { BookingRecord } from "../types/domain"

interface Props {
  navigate: (s: Screen) => void
}

const ACTIVE_STEPS = [
  { key: "accepted", label: "Accepted" },
  { key: "en_route", label: "En Route" },
  { key: "arrived", label: "Arrived" },
  { key: "in_progress", label: "In Progress" },
]

function getActiveStepIndex(rawStatus?: string, statusLabel?: string): number {
  const s = (rawStatus || statusLabel || "").toLowerCase().replace(/[- ]/g, "_")
  if (s.includes("in_progress")) return 3
  if (s.includes("arrived")) return 2
  if (s.includes("en_route") || s.includes("on_the_way")) return 1
  return 0
}

export default function BookingHistory({ navigate }: Props) {
  const [activeTab, setActiveTab] = useState("All")
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(
    null,
  )
  const [bookingToCancel, setBookingToCancel] = useState<BookingRecord | null>(
    null,
  )
  const { bookings, refetch } = useBookings()
  const { replaceJob } = useDispatch()
  const unreadCount = useUnreadNotificationsCount()

  const handleTrackLive = (b: BookingRecord) => {
    const raw = (b.rawStatus || "accepted").toLowerCase().replace(/_/g, "-")
    const validStatus = [
      "accepted",
      "en-route",
      "arrived",
      "in-progress",
    ].includes(raw)
      ? raw as "accepted" | "en-route" | "arrived" | "in-progress"
      : "en-route"

    replaceJob({
      id: b.id,
      service: b.service.toLowerCase().replace(/ /g, "-"),
      priority:
        b.priority as "low" | "medium" | "high" | "critical" || "medium",
      status: validStatus,
      technicianId: b.technicianId || "4cbbcab2-4aad-4e8a-8d83-7dcdef3bd50a",
      technicianName: b.technician !== "Unassigned" ? b.technician : "Kevin",
      customerName: "Client",
      customerPhone: "+91 99876 54321",
      location: b.addressText || b.addressLine || "Gaur City 2, Greater Noida",
      estimatedTotal: b.estimatedTotal || 798,
      finalPrice: b.estimatedTotal || 798,
      executionStep: validStatus,
      symptoms: [b.description || b.service],
      description: b.description || b.service,
      attachments: [],
      createdAt: Date.now() - 1000 * 60 * 15,
      updatedAt: Date.now(),
    })
    navigate("sos-tracking")
  }

  const filtered = useMemo(() => {
    return bookings.filter((booking) => {
      if (activeTab === "All") return true
      if (activeTab === "SOS") return booking.type === "sos"
      if (activeTab === "Scheduled") return booking.type === "scheduled"
      if (activeTab === "Cancelled") return booking.status === "Cancelled"
      return true
    })
  }, [bookings, activeTab])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header
        title="My Bookings"
        showNotification
        onNotification={() => navigate("notifications")}
        unreadCount={unreadCount}
      />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-[57px] z-30">
        <div className="max-w-md mx-auto flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-500 transition-all ${
                activeTab === tab
                  ? "bg-blue-600 text-white font-600"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-display font-700 text-gray-900">
              No bookings found
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Your bookings will appear here
            </p>
          </div>
        ) : (
          filtered.map((b) => {
            const raw = (b.rawStatus || "").toLowerCase().replace(/_/g, "-")
            const isActive =
              ["accepted", "en-route", "arrived", "in-progress"].includes(
                raw,
              ) ||
              ["Accepted", "En Route", "Arrived", "In Progress"].includes(
                b.status,
              )
            const stepIdx = getActiveStepIndex(b.rawStatus, b.status)

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                      b.type === "sos" ? "bg-red-50" : "bg-blue-50"
                    }`}
                  >
                    {b.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-display font-700 text-gray-900 text-sm">
                        {b.service}
                      </p>
                      <span
                        className={`text-[10px] font-700 px-2 py-0.5 rounded-full ${
                          b.type === "sos"
                            ? "bg-red-50 text-red-600"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {b.type === "sos" ? "SOS" : "Scheduled"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {b.technician}
                    </p>
                    <p className="text-xs text-gray-400">{b.date}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display font-700 text-gray-900">
                      {b.amount}
                    </p>
                    <span
                      className={`text-xs font-600 ${
                        b.status === "Completed"
                          ? "text-emerald-600"
                          : isActive
                            ? "text-blue-600"
                            : "text-red-500"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                </div>

                {/* Interactive Multi-step Progress Stepper for Active Bookings */}
                {isActive && (
                  <div className="my-3 rounded-xl bg-slate-50 p-3 border border-slate-200/70 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Live Execution Progress
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                        {ACTIVE_STEPS[stepIdx]?.label || b.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1 relative pt-1">
                      {ACTIVE_STEPS.map((step, idx) => {
                        const isDone = idx < stepIdx
                        const isCurrent = idx === stepIdx
                        return (
                          <div key={step.key} className="text-center space-y-1">
                            <div className="relative flex items-center justify-center">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                  isDone
                                    ? "bg-emerald-500 text-white shadow-xs"
                                    : isCurrent
                                      ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm"
                                      : "bg-slate-200 text-slate-400"
                                }`}
                              >
                                {isDone ? "✓" : idx + 1}
                              </div>
                            </div>
                            <p
                              className={`text-[10px] truncate leading-tight ${
                                isCurrent
                                  ? "font-bold text-blue-700"
                                  : isDone
                                    ? "font-semibold text-emerald-700"
                                    : "text-slate-400"
                              }`}
                            >
                              {step.label}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {b.rating > 0 && (
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={`text-sm ${
                          s <= b.rating ? "text-amber-400" : "text-gray-200"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                    <span className="text-xs text-gray-400 ml-1">
                      Your rating
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t border-gray-50">
                  {b.status === "Completed" ? (
                    <>
                      <button
                        onClick={() => navigate("sos-invoice")}
                        className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-600 text-sm hover:bg-blue-100 transition-colors"
                      >
                        View Bill
                      </button>
                      <button
                        onClick={() => navigate("sos-service")}
                        className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-600 text-sm hover:bg-gray-200 transition-colors"
                      >
                        Book Again
                      </button>
                    </>
                  ) : isActive ? (
                    <>
                      <button
                        onClick={() => handleTrackLive(b)}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-600 text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/20 active:scale-[0.98]"
                      >
                        <span className="text-sm">📍</span>
                        <span>Track Technician Live</span>
                      </button>
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-600 text-xs hover:bg-slate-200 transition-colors"
                      >
                        Details
                      </button>
                    </>
                  ) : !b.status.toLowerCase().includes("cancelled") ? (
                    <>
                      <button
                        onClick={() => setBookingToCancel(b)}
                        className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 font-600 text-xs hover:bg-red-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-600 text-sm hover:bg-blue-100 transition-colors"
                      >
                        View Details
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setSelectedBooking(b)}
                      className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-600 text-sm hover:bg-blue-100 transition-colors"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <BookingDetailsModal
        isOpen={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
        onCancelled={() => {
          refetch()
          setSelectedBooking(null)
        }}
      />

      {bookingToCancel && (
        <CancelRequestModal
          isOpen={Boolean(bookingToCancel)}
          onClose={() => setBookingToCancel(null)}
          requestId={bookingToCancel.id}
          serviceName={bookingToCancel.service}
          onSuccess={() => {
            refetch()
            setBookingToCancel(null)
          }}
        />
      )}

      <BottomNav screen="bookings" navigate={navigate} />
    </div>
  )
}
