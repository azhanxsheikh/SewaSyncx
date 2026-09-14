import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { useOptionalDispatch } from "../context/DispatchContext"
import { useData } from "../context/DataProvider"
import type { DispatchStatus } from "../types/dispatch"

export interface ActiveTechnicianInfo {
  id: string
  name: string
  phone: string
  vehicle: string
  vehicleType: string
  vehicleRegistration: string
  rating: number
  totalJobs: number
  category: string
  photo: string
  eta: string
  distance: string
}

export function dbStatusToDispatchStatus(
  dbStatus?: string | null,
): DispatchStatus {
  switch (dbStatus) {
    case "pending":
      return "searching"
    case "accepted":
      return "accepted"
    case "en_route":
      return "en-route"
    case "arrived":
      return "arrived"
    case "in_progress":
      return "in-progress"
    case "completed":
      return "completed"
    case "declined":
      return "declined"
    case "cancelled":
      return "cancelled"
    case "unfulfilled":
      return "unfulfilled"
    default:
      return "searching"
  }
}

export function isUuid(value?: string | null): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
}

export function useActiveRequest(explicitRequestId?: string) {
  const dispatch = useOptionalDispatch()
  const { currentRequest } = useData()

  // Resolve target request ID with priority: explicit -> job.id -> currentRequest.id -> localStorage
  const storedId =
    typeof window !== "undefined"
      ? window.localStorage.getItem("active-request-id")
      : null
  const targetId =
    explicitRequestId && isUuid(explicitRequestId)
      ? explicitRequestId
      : dispatch?.job?.id && isUuid(dispatch.job.id)
        ? dispatch.job.id
        : currentRequest?.id && isUuid(currentRequest.id)
          ? currentRequest.id
          : storedId && isUuid(storedId)
            ? storedId
            : null

  const [activeRequest, setActiveRequest] = useState<any | null>(null)
  const [technician, setTechnician] = useState<ActiveTechnicianInfo | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(targetId))
  const [error, setError] = useState<string | null>(null)

  const activeRequestRef = useRef(activeRequest)
  activeRequestRef.current = activeRequest

  const fetchDetails = useCallback(async () => {
    if (!targetId) {
      setIsLoading(false)
      return
    }

    try {
      const { data, error: queryErr } = await supabase
        .from("requests")
        .select(`
          id,
          status,
          priority,
          address_line,
          area,
          address_text,
          address_notes,
          service_location,
          description,
          symptoms,
          estimated_total,
          final_price,
          created_at,
          updated_at,
          technician_id,
          search_radius_km,
          service_categories(id, name, slug, icon),
          technician:technician_id(
            id,
            name,
            phone,
            email,
            technician_profiles(
              id,
              vehicle_type,
              vehicle_registration,
              rating,
              review_count,
              total_jobs,
              experience_years
            )
          )
        `)
        .eq("id", targetId)
        .maybeSingle()

      if (queryErr) {
        console.warn("[useActiveRequest] fetch error:", queryErr.message)
        setError(queryErr.message)
        setIsLoading(false)
        return
      }

      if (!data) {
        setIsLoading(false)
        return
      }

      setActiveRequest(data)
      setIsLoading(false)

      const dispatchStatus = dbStatusToDispatchStatus(data.status)

      // Extract joined technician & profile details
      let techInfo: ActiveTechnicianInfo | null = null
      const techUser = data.technician as any
      if (data.technician_id) {
        const tp = Array.isArray(techUser?.technician_profiles)
          ? techUser.technician_profiles[0]
          : techUser?.technician_profiles

        const name = techUser?.name || "Kevin"
        const phone = techUser?.phone || "+91 95103 35730"
        const vehicleType = tp?.vehicle_type || "Two-Wheeler / Scooter"
        const vehicleRegistration = tp?.vehicle_registration || "UP 16 AB 1234"
        const vehicle = vehicleRegistration
          ? `${vehicleType} · ${vehicleRegistration}`
          : vehicleType
        const rating = Number(tp?.rating ?? 4.9)
        const totalJobs = Number(tp?.total_jobs ?? 64)
        const category = (data.service_categories as any)?.name || "AC Repair"
        const photo =
          "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150"

        techInfo = {
          id: data.technician_id,
          name,
          phone,
          vehicle,
          vehicleType,
          vehicleRegistration,
          rating,
          totalJobs,
          category,
          photo,
          eta: dispatchStatus === "arrived" ? "Arrived" : "8 min",
          distance: "1.8 km",
        }
        setTechnician(techInfo)
      }

      // Synchronize back into DispatchContext
      if (dispatch?.updateJob) {
        dispatch.updateJob({
          id: data.id,
          status: dispatchStatus,
          executionStep:
            dispatchStatus === "completed"
              ? "completed"
              : dispatchStatus as any,
          technicianId: data.technician_id || undefined,
          technicianName: techInfo?.name,
          technicianVehicle: techInfo?.vehicle,
          technicianRating: techInfo?.rating,
          technicianPhone: techInfo?.phone,
          technicianCategory: techInfo?.category,
          technicianTotalJobs: techInfo?.totalJobs,
          technicianPhoto: techInfo?.photo,
          estimatedTotal: Number(data.estimated_total),
          finalPrice:
            data.final_price !== null ? Number(data.final_price) : undefined,
          location:
            data.address_text || data.address_line || dispatch.job?.location,
          searchRadiusKm: data.search_radius_km ?? 20,
        })
      }
    } catch (err: any) {
      console.warn("[useActiveRequest] unexpected error:", err)
      setError(err?.message || "Failed to load active request")
      setIsLoading(false)
    }
  }, [targetId, dispatch])

  useEffect(() => {
    void fetchDetails()
  }, [fetchDetails])

  // Realtime subscription to public.requests for this specific request
  useEffect(() => {
    if (!targetId) return

    const channel = supabase
      .channel(`active_request_${targetId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "requests",
          filter: `id=eq.${targetId}`,
        },
        (payload) => {
          console.log(
            "[useActiveRequest] Realtime UPDATE event received:",
            payload.new,
          )
          void fetchDetails()
        },
      )
      .subscribe()

    // Fallback polling every 2.5 seconds while status is active to guarantee responsiveness
    const pollInterval = window.setInterval(() => {
      const currentStatus = activeRequestRef.current?.status
      if (
        currentStatus === "completed" ||
        currentStatus === "cancelled" ||
        currentStatus === "declined" ||
        currentStatus === "unfulfilled"
      ) {
        return
      }
      void fetchDetails()
    }, 2500)

    return () => {
      void supabase.removeChannel(channel)
      window.clearInterval(pollInterval)
    }
  }, [targetId, fetchDetails])

  return {
    activeRequest,
    status: dbStatusToDispatchStatus(activeRequest?.status),
    technician,
    isLoading,
    error,
    refetch: fetchDetails,
  }
}
