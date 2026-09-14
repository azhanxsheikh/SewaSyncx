import { useState, useEffect, useCallback } from "react"
import { supabase } from "../../../../../packages/shared/src/lib/supabase"
import type { AdminDisputeItem } from "../../hooks/useAdminDisputes"

export interface TimelineMilestone {
  id: string
  timestamp: string
  dateStr: string
  lane: "client" | "technician" | "system" | "dispute"
  title: string
  description: string
  badge?: string
  rawDate: string
}

interface Props {
  requestId: string
  dispute?: AdminDisputeItem | null
}

export default function ChronologicalTimeline({ requestId, dispute }: Props) {
  const [events, setEvents] = useState<TimelineMilestone[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTimeline = useCallback(
    async (targetReqId: string) => {
      if (!targetReqId) {
        setEvents([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        // Fetch genuine status events ordered by occurred_at ASC
        const { data: statusEvents, error } = await supabase
          .from("request_status_events")
          .select("*")
          .eq("request_id", targetReqId)
          .order("occurred_at", { ascending: true })

        if (error) {
          console.warn(
            "[ChronologicalTimeline] error fetching status events:",
            error,
          )
        }

        const milestones: TimelineMilestone[] = []

        if (statusEvents && statusEvents.length > 0) {
          statusEvents.forEach((ev) => {
            const dateObj = new Date(ev.occurred_at)
            const timeStr = dateObj.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
            const dateStr = dateObj.toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })

            let title = `Status advanced to ${ev.status.replace(/_/g, " ")}`
            let description = `Triggered by ${ev.actor_role}${
              ev.reason ? ` · Reason: ${ev.reason}` : ""
            }`
            let lane: TimelineMilestone["lane"] =
              ev.actor_role === "client" ? "client" : "technician"

            if (ev.status === "pending") {
              title = "SOS Dispatched by Client"
              description =
                "Client submitted emergency SOS request. Dispatched to regional matching pool."
              lane = "client"
            } else if (ev.status === "accepted") {
              title = "Technician Claimed Request"
              description =
                "Assigned technician acknowledged and locked the request execution window."
              lane = "technician"
            } else if (ev.status === "en_route") {
              title = "En Route Telemetry Activated"
              description =
                "GPS telemetry stream established. Technician en route to premises."
              lane = "technician"
            } else if (ev.status === "arrived") {
              title = "On-Site Arrival Registered"
              description =
                "Geofence perimeter entry registered within 50m of designated address."
              lane = "technician"
            } else if (ev.status === "in_progress") {
              title = "Service Commenced"
              description =
                "Pre-work diagnostic check completed. Restorative repair work initiated."
              lane = "technician"
            } else if (ev.status === "completed") {
              title = "Job Settled & Invoiced"
              description =
                "Work marked completed and digital tax invoice generated."
              lane = "technician"
            }

            milestones.push({
              id: ev.id,
              timestamp: timeStr,
              dateStr,
              lane,
              title,
              description,
              badge: ev.status.replace(/_/g, " ").toUpperCase(),
              rawDate: ev.occurred_at,
            })
          })
        }

        // If a dispute was filed, append dispute milestone
        if (dispute && dispute.requestId === targetReqId) {
          const dispDateObj = new Date(dispute.rawCreatedAt || Date.now())
          milestones.push({
            id: `dispute-${dispute.id}`,
            timestamp: dispDateObj.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
            dateStr: dispDateObj.toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            lane: "dispute",
            title: "Dispute Raised by Client",
            description: dispute.description,
            badge: "UNDER AUDIT",
            rawDate: dispute.rawCreatedAt,
          })
        }

        milestones.sort(
          (a, b) =>
            new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime(),
        )

        setEvents(milestones)
      } catch (err) {
        console.error("[ChronologicalTimeline] fetch error:", err)
      } finally {
        setLoading(false)
      }
    },
    [dispute],
  )

  useEffect(() => {
    void fetchTimeline(requestId)

    if (!requestId) return

    // Realtime subscription for status events on this specific request
    const channel = supabase
      .channel(`timeline_events_${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "request_status_events",
          filter: `request_id=eq.${requestId}`,
        },
        () => {
          void fetchTimeline(requestId)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [requestId, fetchTimeline])

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-[#F4F7FB] p-6 text-center text-xs text-slate-500">
        <div className="inline-block h-4 w-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
        Reconstructing dual-party chronological timeline...
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-[#F4F7FB] p-6 text-center text-xs text-slate-500">
        No lifecycle events recorded for Request {requestId.slice(0, 8)}.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold text-slate-900">
          Dual-Party Chronological Reconstruction
        </p>
        <span className="text-[11px] font-semibold text-slate-500">
          {events.length} lifecycle milestones
        </span>
      </div>

      <div className="space-y-2.5">
        {events.map((event) => {
          const isDispute = event.lane === "dispute"
          const isClient = event.lane === "client"

          return (
            <div
              key={event.id}
              className={`flex gap-4 rounded-xl border p-3 text-sm shadow-xs transition-all ${
                isDispute
                  ? "border-rose-300 bg-rose-50/70"
                  : isClient
                    ? "border-slate-200 bg-[#F4F7FB]"
                    : "border-slate-200 bg-white"
              }`}
            >
              {/* Left: Time & Lane */}
              <div className="flex flex-col items-center justify-center min-w-20 text-center">
                <span className="font-display font-extrabold text-xs text-slate-800">
                  {event.timestamp}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {event.dateStr}
                </span>
                <span
                  className={`mt-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                    isDispute
                      ? "bg-rose-100 text-rose-800 border-rose-200"
                      : isClient
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {event.lane}
                </span>
              </div>

              {/* Right: Title, description, badge */}
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-slate-900 text-xs">
                    {event.title}
                  </p>
                  {event.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isDispute
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {event.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {event.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
