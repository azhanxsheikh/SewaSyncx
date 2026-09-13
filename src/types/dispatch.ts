export type DispatchStatus = "requested" | "searching" | "accepted" | "en-route" | "arrived" | "in-progress" | "completed" | "declined" | "cancelled" | "unfulfilled"

export type JobStatus = "PENDING_TECHNICIAN_ACCEPTANCE" | "ACCEPTED" | "ON_THE_WAY" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DECLINED" | "UNFULFILLED"

export type ExecutionStep = "accepted" | "en-route" | "arrived" | "in-progress" | "completed"

export type PriceAdjustmentReason =
  | "standard_quote"
  | "additional_parts_replaced"
  | "unforeseen_complexity"
  | "extended_labor_hours"
  | "emergency_surcharge"

export interface DispatchAttachment {
  id: string
  name: string
  type: "image" | "video"
  dataUrl: string
}

export interface DispatchJob {
  id: string
  service: string
  priority: string
  symptoms: string[]
  description?: string
  requesterUserId?: string
  requesterName?: string
  requesterPhone?: string
  requestedForMemberId?: string
  requestedForRelation?: string
  serviceLatitude?: number
  serviceLongitude?: number
  searchRadiusKm?: number
  location: string
  customerName: string
  customerPhone: string
  estimatedTotal: number
  finalPrice?: number
  priceAdjustmentReason?: PriceAdjustmentReason
  priceAdjustmentNotes?: string
  createdAt: number
  updatedAt: number
  status: DispatchStatus
  executionStep: ExecutionStep
  technicianId?: string
  technicianName?: string
  attachments: DispatchAttachment[]
}

export type SOSRequest = DispatchJob

export interface TechnicianProfile {
  id: string
  name: string
  rating: number
  vehicle: string
  eta: string
  distance: string
  specializations: string[]
}

export interface ConfirmedLocation {
  id: string
  label: string
  fullAddress: string
  area: string
  latitude?: number
  longitude?: number
}

/**
 * Transport-level fields. Every field is optional here because an event arrives
 * from an untrusted channel (BroadcastChannel / localStorage / the dev bridge)
 * and handlers probe these fields before narrowing on `type`.
 */
interface DispatchEventPayload {
  job?: DispatchJob
  request?: DispatchJob
  requestId?: string
  status?: JobStatus
}

export type DispatchEvent =
  | (DispatchEventPayload & { type: "job-created"; job: DispatchJob })
  | (DispatchEventPayload & { type: "job-updated"; job: DispatchJob })
  | (DispatchEventPayload & { type: "NEW_REQUEST"; request: DispatchJob })
  | (DispatchEventPayload & {
    type: "ACCEPTED" | "STATUS"
    requestId: string
    status: JobStatus
  })
