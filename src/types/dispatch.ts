export type DispatchStatus = "requested" | "searching" | "accepted" | "en-route" | "arrived" | "in-progress" | "completed" | "declined" | "cancelled"

export type JobStatus = "PENDING_TECHNICIAN_ACCEPTANCE" | "ACCEPTED" | "ON_THE_WAY" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DECLINED"

export type ExecutionStep = "accepted" | "en-route" | "arrived" | "in-progress" | "completed"

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
  location: string
  customerName: string
  customerPhone: string
  estimatedTotal: number
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

export type DispatchEvent = { type: "job-created" job: DispatchJob } | {
  type: "job-updated"
  job: DispatchJob
} | { type: "NEW_REQUEST" request: DispatchJob } | {
  type: "ACCEPTED" | "STATUS"
  requestId: string
  status: JobStatus
  job?: DispatchJob
}
