import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "../../../../packages/shared/src/lib/supabase"

export type DisputePriority = "critical" | "high" | "medium" | "low"

export interface AdminDisputeItem {
  id: string
  requestId: string
  priority: DisputePriority
  reasonCategory: string
  status: string
  clientId: string
  clientName: string
  clientPhone: string
  technicianId: string
  technicianName: string
  technicianPhone: string
  serviceCategory: string
  escrowAmount: number
  finalPrice: number
  estimatedPrice: number
  description: string
  createdAt: string
  rawCreatedAt: string
  prePhotoUrl?: string
  postPhotoUrl?: string
}

export function deriveDisputePriority(reason: string): DisputePriority {
  if (reason === "safety_concern" || reason === "harassment") return "critical"
  if (reason === "price_dispute" || reason === "property_damage") return "high"
  if (reason === "quality_issue") return "medium"
  return "low"
}

export function useAdminDisputes() {
  const [disputes, setDisputes] = useState<AdminDisputeItem[]>([])
  const [selectedId, setSelectedId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const selectedIdRef = useRef(selectedId)
  selectedIdRef.current = selectedId

  const loadDisputes = useCallback(async () => {
    try {
      // Fetch disputes sorted by created_at DESC (newest first)
      const { data: dispRows, error: dispErr } = await supabase
        .from("disputes")
        .select("*")
        .order("created_at", { ascending: false })

      if (dispErr) throw dispErr
      if (!dispRows || dispRows.length === 0) {
        setDisputes([])
        setLoading(false)
        return
      }

      const reqIds = [...new Set(dispRows.map((d) => d.request_id))]
      const { data: reqRows } = await supabase
        .from("requests")
        .select(
          "id, client_id, technician_id, category_id, estimated_total, final_price, description, contact_name, contact_phone",
        )
        .in("id", reqIds)

      const userIds = [
        ...new Set([
          ...dispRows.map((d) => d.initiator_id),
          ...(reqRows || []).map((r) => r.client_id),
          ...(reqRows || []).map((r) => r.technician_id).filter(Boolean),
        ]),
      ] as string[]

      const [{ data: userRows }, { data: catRows }, { data: attRows }] =
        await Promise.all([
          supabase.from("users").select("id, name, phone").in("id", userIds),
          supabase.from("service_categories").select("id, name"),
          supabase
            .from("request_attachments")
            .select("id, request_id, phase, storage_path, file_name")
            .in("request_id", reqIds),
        ])

      const userMap = new Map((userRows || []).map((u) => [u.id, u]))
      const catMap = new Map((catRows || []).map((c) => [c.id, c.name]))
      const reqMap = new Map((reqRows || []).map((r) => [r.id, r]))

      const attMap = new Map<string, { pre?: string; post?: string }>()
      if (attRows && attRows.length > 0) {
        for (const a of attRows) {
          const cur = attMap.get(a.request_id) || {}
          const { data } = supabase.storage
            .from("request-attachments")
            .getPublicUrl(a.storage_path)
          if (a.phase === "pre_work") {
            cur.pre = data?.publicUrl
          } else if (a.phase === "post_work") {
            cur.post = data?.publicUrl
          }
          attMap.set(a.request_id, cur)
        }
      }

      const items: AdminDisputeItem[] = dispRows.map((d) => {
        const req = reqMap.get(d.request_id)
        const clientId = req?.client_id || d.initiator_id
        const techId = req?.technician_id || ""
        const clientUser = userMap.get(clientId)
        const techUser = techId ? userMap.get(techId) : null
        const categoryName = req?.category_id
          ? catMap.get(req.category_id) || "General Service"
          : "Home Service"

        const rawDate = new Date(d.created_at)
        const dateStr = rawDate.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })

        const est = Number(req?.estimated_total || 0)
        const fin = Number(req?.final_price || est)
        const escrow = Number(d.liability_amount || fin || est || 500)
        const att = attMap.get(d.request_id)

        return {
          id: d.id,
          requestId: d.request_id,
          priority: deriveDisputePriority(d.reason_category),
          reasonCategory: d.reason_category,
          status: d.status,
          clientId,
          clientName:
            clientUser?.name || req?.contact_name || "Verified Client",
          clientPhone:
            clientUser?.phone || req?.contact_phone || "+91-XXXXXXXXXX",
          technicianId: techId,
          technicianName:
            techUser?.name || (techId ? "Kevin" : "Assigned Technician"),
          technicianPhone: techUser?.phone || "+91-XXXXXXXXXX",
          serviceCategory: categoryName,
          escrowAmount: escrow,
          finalPrice: fin,
          estimatedPrice: est,
          description: d.description,
          createdAt: dateStr,
          rawCreatedAt: d.created_at,
          prePhotoUrl: att?.pre,
          postPhotoUrl: att?.post,
        }
      })

      setDisputes(items)

      // Auto-select first if none selected or if selected item no longer exists
      if (items.length > 0) {
        if (
          !selectedIdRef.current ||
          !items.some((it) => it.id === selectedIdRef.current)
        ) {
          setSelectedId(items[0].id)
        }
      }
    } catch (err) {
      console.error("[useAdminDisputes] failed to load disputes:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDisputes()

    // Realtime channel watching disputes, status events, requests, and attachments
    const channel = supabase
      .channel(
        `admin-disputes-watcher-${Math.random().toString(36).slice(2, 8)}`,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "disputes" },
        () => {
          void loadDisputes()
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_status_events" },
        () => {
          void loadDisputes()
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        () => {
          void loadDisputes()
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_attachments" },
        () => {
          void loadDisputes()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadDisputes])

  const selectedDispute =
    disputes.find((d) => d.id === selectedId) || disputes[0] || null

  return {
    disputes,
    selectedDispute,
    selectedId,
    setSelectedId,
    loading,
    refresh: loadDisputes,
  }
}
