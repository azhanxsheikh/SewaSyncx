import { useEffect, useRef, useState } from "react"
import type { Screen } from "../../types/navigation"
import { useOptionalDispatch } from "../../context/DispatchContext"
import { useAuth } from "../../context/AuthContext"
import { supabase } from "../../lib/supabaseClient"
import { uploadSosMedia } from "../../lib/sosMedia"

interface Props {
  navigate: (s: Screen) => void
  selectedService: string
  priority: string
}

export default function SOSConfirmation({
  navigate,
  selectedService,
  priority,
}: Props) {
  const dispatch = useOptionalDispatch()
  const { userId } = useAuth()
  const activeRequest = dispatch?.activeRequest
  const submittedRef = useRef(false)
  const [countdown, setCountdown] = useState(3)
  const [finding, setFinding] = useState(false)
  const safeService =
    typeof selectedService === "string" && selectedService.length > 0
      ? selectedService
      : "electrical"
  const safePriority =
    typeof priority === "string" && priority.length > 0 ? priority : "medium"
  const safeLocation =
    dispatch?.confirmedLocation?.fullAddress ||
    "B-204, Gaur City 2, Greater Noida West"

  useEffect(() => {
    if (submittedRef.current) return
    submittedRef.current = true

    async function submitRequest() {
      try {
        if (dispatch?.submitSOSRequest) {
          const request = dispatch.submitSOSRequest({
            service: safeService,
            priority: safePriority,
            landmarkAndInstructions:
              dispatch.confirmedLocation?.landmarkAndInstructions,
          })
          console.log("[client] SOS request submitted locally", {
            id: request.id,
            service: request.service,
            priority: request.priority,
            status: request.status,
            location: request.location,
          })
        } else {
          console.error(
            "[client] SOS request not submitted: dispatch provider unavailable",
          )
        }

        // Persist the request to public.requests under auth.uid(). Pricing
        // (price_request_from_catalogue) and contact details
        // (snapshot_request_contact) are set server-side; the values sent
        // here for those columns are overwritten.
        if (userId) {
          const normalizedSlug = safeService
            .toLowerCase()
            .replace("-repair", "")
            .replace(/[^a-z]/g, "")
          const { data: matchedCat, error: catError } = await supabase
            .from("service_categories")
            .select("id, sos_base_price, sos_emergency_fee")
            .or(`slug.eq.${safeService},slug.eq.${normalizedSlug}`)
            .maybeSingle()

          if (catError || !matchedCat?.id) {
            // Never file the job under an arbitrary category.
            console.error(
              "[client] SOS request not persisted: unknown service category",
              safeService,
              catError?.message,
            )
            return
          }

          const lat = dispatch?.confirmedLocation?.latitude ?? 28.6083
          const lng = dispatch?.confirmedLocation?.longitude ?? 77.4267
          const locationText =
            dispatch?.confirmedLocation?.fullAddress || safeLocation
          const addressNotes =
            dispatch?.confirmedLocation?.landmarkAndInstructions || null
          const addressLine =
            dispatch?.confirmedLocation?.houseFlat || locationText
          const area =
            dispatch?.confirmedLocation?.societyName ||
            dispatch?.confirmedLocation?.areaCity ||
            dispatch?.confirmedLocation?.area ||
            "Greater Noida West"
          const draftSymptoms = dispatch?.sosDraft.symptoms ?? []
          const description = dispatch?.sosDraft.description?.trim() || null

          const { data: inserted, error: insertError } = await supabase
            .from("requests")
            .insert({
              client_id: userId,
              user_id: userId,
              category_id: matchedCat.id,
              priority:
                safePriority === "high" || safePriority === "low"
                  ? safePriority
                  : "medium",
              status: "pending",
              address_line: addressLine,
              area: area,
              address_text: locationText,
              address_notes: addressNotes,
              service_location: `POINT(${lng} ${lat})`,
              description,
              estimated_total:
                (matchedCat.sos_base_price ?? 0) +
                (matchedCat.sos_emergency_fee ?? 0),
              symptoms: draftSymptoms.length
                ? draftSymptoms
                : [`Emergency assistance for ${safeService}`],
              search_radius_km: 20,
            })
            .select("id")
            .single()

          if (insertError || !inserted) {
            console.error(
              "[client] SOS request not persisted",
              insertError?.message,
            )
            return
          }

          if (typeof window !== "undefined") {
            window.localStorage.setItem("active-request-id", inserted.id)
          }
          dispatch?.updateJob({
            id: inserted.id,
            searchRadiusKm: 20,
            status: "searching",
            estimatedTotal:
              (matchedCat.sos_base_price ?? 0) +
              (matchedCat.sos_emergency_fee ?? 0),
          })

          const files = dispatch?.sosDraftFiles ?? []
          if (files.length) {
            const attachments = await uploadSosMedia(inserted.id, userId, files)
            dispatch?.setSosDraftFiles([])
            if (attachments.length) dispatch?.updateJob({ attachments })
          }
        }
      } catch (error) {
        console.error("[client] SOS request submission failed", error)
      }
    }

    void submitRequest()
  }, [dispatch, safePriority, safeService, safeLocation, userId])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          setFinding(true)
          window.setTimeout(() => {
            try {
              navigate("sos-finding")
            } catch (error) {
              console.error("Unable to open technician search", error)
              window.location.assign("/")
            }
          }, 1500)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (
      activeRequest?.status !== "accepted" &&
      activeRequest?.status !== "en-route"
    )
      return
    try {
      navigate("sos-assigned")
    } catch (error) {
      console.error("Unable to open assigned technician screen", error)
    }
  }, [activeRequest?.status, navigate])

  const priorityLabel: Record<string, string> = {
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW",
  }
  const priorityColor: Record<string, string> = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-emerald-100 text-emerald-700",
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      {/* Animated SOS pulse */}
      <div className="relative mb-8">
        <div
          className={`absolute inset-0 rounded-full ${
            finding ? "bg-emerald-500" : "bg-red-500"
          } opacity-10 animate-ping scale-125`}
        />
        <div
          className={`absolute inset-0 rounded-full ${
            finding ? "bg-emerald-500" : "bg-red-500"
          } opacity-20 animate-ping scale-110 animation-delay-150`}
        />
        <div
          className={`w-28 h-28 rounded-full ${
            finding ? "bg-emerald-500" : "bg-red-500"
          } flex items-center justify-center shadow-xl ${
            finding ? "shadow-emerald-300" : "shadow-red-300"
          }`}
        >
          {finding ? (
            <svg
              className="w-14 h-14 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
                className="check-draw"
              />
            </svg>
          ) : (
            <span className="font-display font-800 text-white text-2xl">
              {countdown > 0 ? countdown : "✓"}
            </span>
          )}
        </div>
      </div>

      {finding ? (
        <>
          <h2 className="font-display font-800 text-2xl text-gray-900 mb-2">
            Request received.
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            We're finding the nearest verified technician...
          </p>
        </>
      ) : (
        <>
          <h2 className="font-display font-800 text-2xl text-gray-900 mb-2">
            Sending your request...
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Hold tight while we confirm your emergency
          </p>
        </>
      )}

      {/* Details */}
      <div className="w-full max-w-xs bg-gray-50 rounded-2xl border border-gray-100 p-5 text-left space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Service</span>
          <span className="text-sm font-600 text-gray-900 capitalize">
            {safeService.replace("-", " ")}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Priority</span>
          <span
            className={`text-xs font-700 px-2 py-0.5 rounded-full ${priorityColor[safePriority] || priorityColor.medium}`}
          >
            {priorityLabel[safePriority] || "MEDIUM"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Location</span>
          <span className="max-w-[180px] text-right text-sm font-600 text-gray-900">
            {safeLocation}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Est. arrival</span>
          <span className="text-sm font-600 text-blue-600">15–30 min</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
          <span className="text-xs text-gray-500">Estimated total</span>
          <span className="font-display font-800 text-gray-900">
            ₹{dispatch?.job?.estimatedTotal ?? 798}
          </span>
        </div>
      </div>

      {/* Loading dots */}
      <div className="flex gap-2 mt-8">
        <div className="w-2.5 h-2.5 bg-red-400 rounded-full dot-1" />
        <div className="w-2.5 h-2.5 bg-red-400 rounded-full dot-2" />
        <div className="w-2.5 h-2.5 bg-red-400 rounded-full dot-3" />
      </div>
      <p className="text-xs text-gray-400 mt-3">
        {finding ? "Finding technician..." : "Confirming your request..."}
      </p>
    </div>
  )
}
