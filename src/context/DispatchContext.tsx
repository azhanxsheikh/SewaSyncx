import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type {
  ConfirmedLocation,
  DispatchAttachment,
  DispatchEvent,
  DispatchJob,
  DispatchStatus,
  ExecutionStep,
  JobStatus,
  TechnicianProfile,
} from "../types/dispatch"
import { forwardGeocode } from "../utils/geocoding"
import { estimateJobTotal } from "../lib/pricing"
import { defaultConfirmedLocation } from "../fixtures/account.fixture"
import { acceptRequestRpc } from "../lib/supabase"

const CHANNEL_NAME = "sos-dispatch"
const STORAGE_KEY = "sos-dispatch-job"
const EVENT_KEY = "sos-dispatch-event"
const DISPATCH_BRIDGE_URL = "http://localhost:3003/__sos_dispatch"

function canUseDispatchBridge() {
  return (
    typeof window !== "undefined" && window.location.hostname === "localhost"
  )
}

async function publishToDispatchBridge(event: DispatchEvent) {
  if (!canUseDispatchBridge()) return
  try {
    await fetch(DISPATCH_BRIDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    })
    console.log(
      "[dispatch] bridge published",
      event.type,
      event.job?.id ?? event.requestId,
    )
  } catch (error) {
    console.warn("[dispatch] bridge publish failed", error)
  }
}

function applyDispatchEvent(
  current: DispatchJob | null,
  incoming: DispatchEvent,
) {
  if (incoming.job) return incoming.job
  if (incoming.type === "NEW_REQUEST" && incoming.request)
    return incoming.request
  if (
    (incoming.type === "ACCEPTED" || incoming.type === "STATUS") &&
    incoming.requestId &&
    current?.id === incoming.requestId
  ) {
    return {
      ...current,
      status: normalizeStatus(incoming.status),
      updatedAt: Date.now(),
      ...(incoming.job ?? {}),
    }
  }
  return current
}

interface DispatchContextValue {
  job: DispatchJob | null
  activeRequest: DispatchJob | null
  assignedTechnician: TechnicianProfile | null
  pendingRequest: DispatchJob | null
  jobHistory: DispatchJob[]
  technicianOnline: boolean
  confirmedLocation: ConfirmedLocation
  setConfirmedLocation: (location: ConfirmedLocation) => void
  createJob: (
    input: Pick<DispatchJob, "service"> & Partial<Pick<DispatchJob, "priority" | "symptoms" | "description" | "location" | "attachments" | "customerName" | "customerPhone" | "requesterUserId" | "requesterName" | "requesterPhone" | "requestedForMemberId" | "requestedForRelation" | "serviceLatitude" | "serviceLongitude" | "landmarkAndInstructions">>,
  ) => DispatchJob
  submitSOSRequest: (
    input: Pick<DispatchJob, "service"> & Partial<Pick<DispatchJob, "priority" | "symptoms" | "description" | "location" | "attachments" | "requesterUserId" | "requesterName" | "requesterPhone" | "requestedForMemberId" | "requestedForRelation" | "serviceLatitude" | "serviceLongitude" | "landmarkAndInstructions">> & {
      locationOverride?: { address: string; area: string }
      requestedFor?: {
        memberId: string
        name: string
        relation: string
        phone: string
        address: string
        area: string
        requesterUserId?: string
        requesterName?: string
        requesterPhone?: string
      }
    },
  ) => DispatchJob
  updateJob: (patch: Partial<DispatchJob>) => void
  setStatus: (status: DispatchStatus) => void
  setExecutionStep: (step: ExecutionStep) => void
  acceptJob: () => void
  declineJob: () => void
  acceptRequest: () => void
  declineRequest: () => void
  updateJobStatus: (status: JobStatus) => void
  completeJob: () => void
  setTechOnline: (online: boolean) => void
  addAttachments: (attachments: DispatchAttachment[]) => void
  updateSosDraft: (
    patch: Partial<Pick<DispatchJob, "symptoms" | "description" | "attachments">>,
  ) => void
  sosDraft: Pick<DispatchJob, "symptoms" | "description" | "attachments">
  sosDraftFiles: File[]
  setSosDraftFiles: (files: File[]) => void
}

const DispatchContext = createContext<DispatchContextValue | null>(null)

function readStoredJob(): DispatchJob | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    if (!value) return null
    const parsed = JSON.parse(value) as DispatchJob
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be blocked or full; in-memory state remains usable.
  }
}

function publish(event: DispatchEvent) {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.postMessage(event)
    channel.close()
  } catch {
    // BroadcastChannel is unavailable in older browsers; storage event handles other tabs.
  }
  try {
    writeStorage(EVENT_KEY, { ...event, sentAt: Date.now() })
  } catch {
    // Storage may be unavailable in private browsing.
  }
}

export function DispatchProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<DispatchJob | null>(() => readStoredJob())
  const [sosDraft, setSosDraft] =
    useState<Pick<DispatchJob, "symptoms" | "description" | "attachments">>({
      symptoms: [],
      description: "",
      attachments: [],
    })
  // Evidence picked during SOS intake, held in memory only (never serialised
  // into the job mirror) until SOSConfirmation has a real request id to upload
  // it under — see lib/sosMedia.ts.
  const [sosDraftFiles, setSosDraftFiles] = useState<File[]>([])
  const [technicianOnline, setTechnicianOnline] = useState(true)
  const [confirmedLocation, setConfirmedLocation] = useState<ConfirmedLocation>(
    defaultConfirmedLocation,
  )
  const updateSosDraft = useCallback(
    (
      patch: Partial<Pick<DispatchJob, "symptoms" | "description" | "attachments">>,
    ) => {
      setSosDraft((current) => ({ ...current, ...patch }))
    },
    [],
  )

  useEffect(() => {
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(CHANNEL_NAME)
      channel.onmessage = (message: MessageEvent<DispatchEvent>) => {
        const incoming = message.data
        console.log(
          "[dispatch] BroadcastChannel received",
          incoming?.type,
          incoming?.job?.id ?? incoming?.requestId,
        )
        if (incoming?.job) {
          setJob(incoming.job)
          return
        }
        if (incoming?.type === "NEW_REQUEST" && incoming.request) {
          setJob(incoming.request)
          return
        }
        if (
          (incoming?.type === "ACCEPTED" || incoming?.type === "STATUS") &&
          incoming.requestId
        ) {
          setJob((current) =>
            current?.id === incoming.requestId
              ? {
                  ...current,
                  status: normalizeStatus(incoming.status),
                  updatedAt: Date.now(),
                  ...(incoming.job ?? {}),
                }
              : current,
          )
        }
      }
    } catch {
      channel = null
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as DispatchJob
          if (parsed && typeof parsed === "object") setJob(parsed)
        } catch {
          /* Ignore malformed external storage. */
        }
      }
      if (event.key === EVENT_KEY && event.newValue) {
        try {
          const payload = JSON.parse(event.newValue) as DispatchEvent
          if (payload.job) setJob(payload.job)
          else if (payload.type === "NEW_REQUEST") setJob(payload.request)
          else if (
            (payload.type === "ACCEPTED" || payload.type === "STATUS") &&
            payload.requestId
          ) {
            setJob((current) =>
              current?.id === payload.requestId
                ? {
                    ...current,
                    status: normalizeStatus(payload.status),
                    updatedAt: Date.now(),
                    ...(payload.job ?? {}),
                  }
                : current,
            )
          }
        } catch {
          /* Ignore malformed external events. */
        }
      }
    }
    window.addEventListener("storage", onStorage)
    let disposed = false
    const pollBridge = async () => {
      if (!canUseDispatchBridge()) return
      try {
        const response = await fetch(DISPATCH_BRIDGE_URL, { cache: "no-store" })
        if (!response.ok || response.status === 204) return
        const incoming = (await response.json()) as DispatchEvent
        console.log(
          "[dispatch] bridge received",
          incoming?.type,
          incoming?.job?.id ?? incoming?.requestId,
        )
        if (!disposed)
          setJob((current) => applyDispatchEvent(current, incoming))
      } catch (error) {
        console.warn("[dispatch] bridge poll failed", error)
      }
    }
    void pollBridge()
    const bridgeTimer = window.setInterval(pollBridge, 1000)
    return () => {
      disposed = true
      channel?.close()
      window.clearInterval(bridgeTimer)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  const updateJob = useCallback((patch: Partial<DispatchJob>) => {
    setJob((current) => {
      if (!current && !patch.id) return current
      const next = current ? { ...current, ...patch, updatedAt: Date.now() } : (patch as DispatchJob)
      writeStorage(STORAGE_KEY, next)
      publish({ type: "job-updated", job: next })
      void publishToDispatchBridge({ type: "job-updated", job: next })
      console.log("[dispatch] job updated", {
        id: next.id,
        status: next.status,
        patch,
      })
      return next
    })
  }, [])

  const createJob = useCallback(
    (
      input: Pick<DispatchJob, "service"> & Partial<Pick<DispatchJob, "priority" | "symptoms" | "description" | "location" | "attachments" | "customerName" | "customerPhone" | "requesterUserId" | "requesterName" | "requesterPhone" | "requestedForMemberId" | "requestedForRelation" | "serviceLatitude" | "serviceLongitude" | "landmarkAndInstructions">>,
    ) => {
      const next: DispatchJob = {
        id: `job-${Date.now()}`,
        service: input.service,
        priority: input.priority ?? "medium",
        symptoms: input.symptoms ?? sosDraft.symptoms,
        ...(input.description !== undefined || sosDraft.description
          ? { description: input.description ?? sosDraft.description }
          : {}),
        location: input.location ?? "B-204, Gaur City 2, Greater Noida West",
        customerName: input.customerName ?? "Azaan Sheikh",
        customerPhone: input.customerPhone ?? "+91 98765 00000",
        requesterUserId: input.requesterUserId,
        requesterName: input.requesterName,
        requesterPhone: input.requesterPhone,
        requestedForMemberId: input.requestedForMemberId,
        requestedForRelation: input.requestedForRelation,
        serviceLatitude: input.serviceLatitude,
        serviceLongitude: input.serviceLongitude,
        landmarkAndInstructions: input.landmarkAndInstructions,
        searchRadiusKm: 10,
        estimatedTotal: estimateJobTotal(input.service, input.priority ?? "medium"),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "requested",
        executionStep: "accepted",
        attachments: input.attachments ?? sosDraft.attachments,
      }
      setJob(next)
      writeStorage(STORAGE_KEY, next)
      publish({ type: "job-created", job: next })
      void publishToDispatchBridge({ type: "job-created", job: next })
      console.log("[dispatch] job created", {
        id: next.id,
        service: next.service,
        priority: next.priority,
        status: next.status,
      })
      return next
    },
    [sosDraft],
  )

  const submitSOSRequest = useCallback(
    (
      input: Pick<DispatchJob, "service"> & Partial<Pick<DispatchJob, "priority" | "symptoms" | "description" | "location" | "attachments" | "requesterUserId" | "requesterName" | "requesterPhone" | "requestedForMemberId" | "requestedForRelation" | "serviceLatitude" | "serviceLongitude" | "landmarkAndInstructions">> & {
        locationOverride?: { address: string; area: string }
        requestedFor?: {
          memberId: string
          name: string
          relation: string
          phone: string
          address: string
          area: string
          requesterUserId?: string
          requesterName?: string
          requesterPhone?: string
        }
      },
    ) => {
      const requestedFor = input.requestedFor
      const location = requestedFor
        ? `${requestedFor.address}, ${requestedFor.area}`
        : input.locationOverride
          ? `${input.locationOverride.address}, ${input.locationOverride.area}`
          : confirmedLocation.fullAddress
      const createdJob = createJob({
        ...input,
        location,
        serviceLatitude: input.serviceLatitude ?? (requestedFor ? undefined : confirmedLocation.latitude),
        serviceLongitude: input.serviceLongitude ?? (requestedFor ? undefined : confirmedLocation.longitude),
        landmarkAndInstructions: input.landmarkAndInstructions ?? (requestedFor ? undefined : confirmedLocation.landmarkAndInstructions),
        ...(requestedFor
          ? {
              customerName: requestedFor.name,
              customerPhone: requestedFor.phone,
              requestedForMemberId: requestedFor.memberId,
              requestedForRelation: requestedFor.relation,
              requesterUserId: requestedFor.requesterUserId,
              requesterName: requestedFor.requesterName,
              requesterPhone: requestedFor.requesterPhone,
            }
          : {}),
      })
      if (createdJob.serviceLatitude === undefined || createdJob.serviceLongitude === undefined) {
        void forwardGeocode(createdJob.location).then((coordinates) => {
          if (!coordinates) return
          updateJob({ serviceLatitude: coordinates.latitude, serviceLongitude: coordinates.longitude })
        })
      }
      return createdJob
    },
    [confirmedLocation.fullAddress, confirmedLocation.latitude, confirmedLocation.longitude, createJob, updateJob],
  )

  const value = useMemo<DispatchContextValue>(
    () => ({
      job,
      activeRequest: job,
      pendingRequest:
        job?.status === "requested" || job?.status === "searching" ? job : null,
      assignedTechnician: job?.technicianId
        ? {
            id: job.technicianId,
            name: job.technicianName ?? "Rahul Kumar",
            rating: 4.9,
            vehicle: "Honda Activa · DL 5S 4521",
            eta: "8 min",
            distance: "1.8 km",
            specializations: ["Electrical", "Emergency repair"],
          }
        : null,
      jobHistory:
        job?.status === "completed" ||
        job?.status === "declined" ||
        job?.status === "cancelled" ||
        job?.status === "unfulfilled"
          ? [job]
          : [],
      technicianOnline,
      confirmedLocation,
      setConfirmedLocation,
      createJob,
      submitSOSRequest,
      updateJob,
      setStatus: (status) => updateJob({ status }),
      setExecutionStep: (executionStep) =>
        updateJob({
          executionStep,
          status: executionStep === "completed" ? "completed" : executionStep,
        }),
      acceptJob: () => {
        if (job?.id) {
          void acceptRequestRpc(job.id, "t1").then((res) => {
            if (res.error) {
              console.warn("[dispatch] accept_request RPC error:", res.error)
            } else {
              console.log("[dispatch] accept_request RPC succeeded:", res.data)
            }
          })
        }
        updateJob({
          status: "accepted",
          executionStep: "accepted",
          technicianId: "t1",
          technicianName: "Rahul Kumar",
        })
      },
      declineJob: () => updateJob({ status: "declined" }),
      acceptRequest: () => {
        if (job?.id) {
          void acceptRequestRpc(job.id, "t1").then((res) => {
            if (res.error) {
              console.warn("[dispatch] accept_request RPC error:", res.error)
            } else {
              console.log("[dispatch] accept_request RPC succeeded:", res.data)
            }
          })
        }
        updateJob({
          status: "accepted",
          executionStep: "accepted",
          technicianId: "t1",
          technicianName: "Rahul Kumar",
        })
      },
      declineRequest: () => updateJob({ status: "declined" }),
      updateJobStatus: (status) =>
        updateJob({
          status: normalizeStatus(status),
          executionStep: normalizeStatus(status) as ExecutionStep,
        }),
      completeJob: () =>
        updateJob({ status: "completed", executionStep: "completed" }),
      setTechOnline: setTechnicianOnline,
      addAttachments: (attachments) =>
        job
          ? updateJob({
              attachments: [...(job.attachments ?? []), ...attachments],
            })
          : setSosDraft((current) => ({
              ...current,
              attachments: [...current.attachments, ...attachments],
            })),
      updateSosDraft,
      sosDraft,
      sosDraftFiles,
      setSosDraftFiles,
    }),
    [
      sosDraftFiles,
      createJob,
      confirmedLocation,
      job,
      sosDraft,
      submitSOSRequest,
      technicianOnline,
      updateJob,
      updateSosDraft,
    ],
  )

  return (
    <DispatchContext.Provider value={value}>
      {children}
    </DispatchContext.Provider>
  )
}

function normalizeStatus(status: JobStatus): DispatchStatus {
  const statusMap: Record<JobStatus, DispatchStatus> = {
    PENDING_TECHNICIAN_ACCEPTANCE: "requested",
    ACCEPTED: "accepted",
    ON_THE_WAY: "en-route",
    ARRIVED: "arrived",
    IN_PROGRESS: "in-progress",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    DECLINED: "declined",
    UNFULFILLED: "unfulfilled",
  }
  return statusMap[status]
}

export function useDispatch() {
  const context = useContext(DispatchContext)
  if (!context)
    throw new Error("useDispatch must be used inside DispatchProvider")
  return context
}

export function useOptionalDispatch() {
  return useContext(DispatchContext)
}
