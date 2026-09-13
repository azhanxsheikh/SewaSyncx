import { useEffect, useMemo, useState } from "react"
import type { Screen } from "../types/navigation"
import type { FamilyMember } from "../types/domain"
import { useFamilyMember, useFamilyMembers } from "../hooks/useAccount"
import { useServiceCategories } from "../hooks/useServiceCatalog"
import Header from "../components/Header"
import FamilyLocationMap, { resolveMemberCoordinates } from "../components/FamilyLocationMap"
import BottomNav from "../components/BottomNav"
import { useDispatch } from "../context/DispatchContext"
import { useAuth } from "../context/AuthContext"
import { useData } from "../context/DataProvider"
import { supabase } from "../lib/supabaseClient"
import type { Coordinates } from "../utils/geocoding"
import AddFamilyMemberModal from "../components/family/AddFamilyMemberModal"

interface Props {
  navigate: (s: Screen) => void
  onBack?: () => void
  subScreen: "list" | "member" | "tracking"
  setSubScreen: (s: "list" | "member" | "tracking") => void
  selectedMember: string
  setSelectedMember: (id: string) => void
}

export default function FamilySOS({
  navigate,
  onBack,
  subScreen,
  setSubScreen,
  selectedMember,
  setSelectedMember,
}: Props) {
  const familyMembers = useFamilyMembers()
  const member = useFamilyMember(selectedMember)
  const serviceCategories = useServiceCategories()
  const { submitSOSRequest } = useDispatch()
  const { userId } = useAuth()
  const { refreshClientData } = useData()

  const [selectedService, setSelectedService] = useState("electrical")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  const [memberCoords, setMemberCoords] = useState<Coordinates>(() => {
    if (member.latitude && member.longitude) {
      return { latitude: member.latitude, longitude: member.longitude }
    }
    return resolveMemberCoordinates(member.address, member.area)
  })

  useEffect(() => {
    if (member.latitude && member.longitude) {
      setMemberCoords({ latitude: member.latitude, longitude: member.longitude })
    } else {
      setMemberCoords(resolveMemberCoordinates(member.address, member.area))
    }
  }, [member.latitude, member.longitude, member.address, member.area])

  // Order categories to match canonical layout: AC Repair, Appliance, Carpenter, Electrical, Plumbing
  const orderedCategories = useMemo(() => {
    const preferredOrder = ["ac", "appliance", "carpenter", "electrical", "plumbing"]
    return [...serviceCategories].sort((a, b) => {
      const ia = preferredOrder.indexOf(a.id)
      const ib = preferredOrder.indexOf(b.id)
      if (ia !== -1 && ib !== -1) return ia - ib
      if (ia !== -1) return -1
      if (ib !== -1) return 1
      return 0
    })
  }, [serviceCategories])

  const sendHelp = async () => {
    if (!member.address.trim() || !member.area.trim()) {
      setError("Please add a complete address before sending help.")
      return
    }
    setError("")
    setIsSubmitting(true)

    try {
      const { data: cat } = await supabase
        .from("service_categories")
        .select("id, sos_base_price, sos_emergency_fee")
        .eq("slug", selectedService)
        .maybeSingle()

      if (userId && cat?.id) {
        const basePrice = cat.sos_base_price ?? 499
        const fee = cat.sos_emergency_fee ?? 149
        await supabase.from("requests").insert({
          client_id: userId,
          family_member_id: member.id || null,
          category_id: cat.id,
          status: "pending",
          priority: "high",
          service_location: `POINT(${memberCoords.longitude} ${memberCoords.latitude})`,
          address_line: member.address,
          area: member.area,
          contact_name: member.name,
          contact_phone: member.phone || "+919811045678",
          estimated_total: basePrice + fee,
          symptoms: [`Emergency assistance requested for ${member.name} (${member.relation})`],
          search_radius_km: 10,
        })
      }
    } catch {
      // Graceful fallback to local dispatch
    } finally {
      setIsSubmitting(false)
    }

    submitSOSRequest({
      service: selectedService,
      priority: "high",
      serviceLatitude: memberCoords.latitude,
      serviceLongitude: memberCoords.longitude,
      locationOverride: { address: member.address, area: member.area },
      requestedFor: {
        memberId: member.id,
        name: member.name,
        relation: member.relation,
        phone: member.phone,
        address: member.address,
        area: member.area,
        requesterUserId: userId ?? undefined,
        requesterName: "You",
      },
    })
    navigate("sos-tracking")
  }

  const handleDeleteMember = async (target: FamilyMember) => {
    if (!window.confirm(`Are you sure you want to delete ${target.name} from your family members?`)) return
    if (!userId) return

    try {
      const { error: delErr } = await supabase
        .from("family_members")
        .delete()
        .eq("id", target.id)
        .eq("owner_id", userId)

      if (delErr) {
        alert(`Failed to delete family member: ${delErr.message}`)
        return
      }

      await refreshClientData()
      if (selectedMember === target.id) {
        const remaining = familyMembers.filter((m) => m.id !== target.id)
        if (remaining[0]) setSelectedMember(remaining[0].id)
      }
    } catch {
      alert("Failed to delete family member.")
    }
  }

  if (subScreen === "member") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header
          title={`SOS for ${member.name}`}
          onBack={() => setSubScreen("list")}
          showNotification={false}
        />

        <div className="flex-1 px-4 pt-4 pb-28 max-w-md mx-auto w-full space-y-4">
          {/* Member card */}
          <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100 flex items-center gap-4 shadow-xs">
            <span className="text-5xl">{member.emoji || "👤"}</span>
            <div>
              <h3 className="font-display font-800 text-xl text-gray-900">
                {member.name}
              </h3>
              <p className="text-sm text-gray-500">{member.relation}</p>
              <p className="text-xs text-gray-400 mt-0.5">{member.phone}</p>
            </div>
          </div>

          {/* Location Map */}
          <FamilyLocationMap
            address={member.address}
            area={member.area}
            memberName={member.name}
            coordinates={memberCoords}
            heightClass="h-44"
            onCoordinatesResolved={setMemberCoords}
          />

          {/* Help will be sent to card */}
          <div className="bg-white border-2 border-blue-200 rounded-2xl p-4">
            <p className="text-xs text-gray-400 font-500 mb-1">
              Help will be sent to
            </p>
            <p className="font-display font-700 text-gray-900">
              {member.address}
            </p>
            <p className="text-sm text-gray-500">{member.area}</p>
          </div>

          {/* Service selection */}
          <div>
            <p className="font-display font-700 text-gray-900 mb-3">
              Select service type
            </p>
            <div className="grid grid-cols-4 gap-2.5">
              {orderedCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedService(cat.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center min-h-[76px] cursor-pointer ${
                    selectedService === cat.id
                      ? "border-red-400 bg-red-50 text-red-600 shadow-xs"
                      : "border-gray-100 bg-white hover:border-red-200 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-2xl mb-1">{cat.icon}</span>
                  <span
                    className={`text-[11px] font-600 leading-tight ${
                      selectedService === cat.id ? "text-gray-900" : "text-gray-600"
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Info banner */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2.5 items-start">
            <span className="text-amber-500 text-sm mt-0.5">ℹ️</span>
            <p className="text-xs text-amber-900 leading-relaxed">
              Help will be dispatched to <strong>{member.name}'s</strong>{" "}
              address. They will receive an SMS notification.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xs border-t border-gray-100 px-4 py-3.5 z-40">
          <div className="max-w-md mx-auto">
            <button
              onClick={sendHelp}
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl font-display font-700 text-base bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>🚨</span>
              <span>{isSubmitting ? "Dispatching..." : `Send Help to ${member.name}`}</span>
            </button>
            {error && (
              <p className="mt-2 text-xs font-600 text-red-600 text-center">{error}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Default: list of family members
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header
        title="My Family"
        showNotification
        onNotification={() => navigate("notifications")}
      />

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Emergency for family banner */}
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="font-display font-700 text-gray-900 text-sm">
              Request help for a family member
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Send an emergency technician to any saved address instantly
            </p>
          </div>
        </div>

        {/* Empty state */}
        {familyMembers.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-2">
            <span className="text-4xl block mb-1">👨‍👩‍👧‍👦</span>
            <p className="font-display font-700 text-gray-800 text-base">No Family Members Saved</p>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Add family members living at different addresses to quickly dispatch emergency repair technicians to their location.
            </p>
          </div>
        )}

        {/* Family members cards */}
        <div className="space-y-3">
          {familyMembers.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-3xl shrink-0">
                  {m.emoji || "👤"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-700 text-gray-900">
                      {m.name}
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                      {m.relation}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    📍 {m.address}{m.area ? `, ${m.area}` : ""}
                  </p>
                  <p className="text-xs text-gray-400">{m.phone}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 relative">
                <button
                  onClick={() => {
                    setSelectedMember(m.id)
                    setSubScreen("member")
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-display font-700 text-sm hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  🚨 Send SOS
                </button>
                <button
                  onClick={() => {
                    if (m.phone) window.location.href = `tel:${m.phone}`
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-600 text-sm hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  📞 Call
                </button>
                <div className="relative">
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === m.id ? null : m.id)}
                    className="py-2.5 px-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    ⋯
                  </button>
                  {activeMenuId === m.id && (
                    <div className="absolute right-0 bottom-full mb-1 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30 animate-fade-in">
                      <button
                        onClick={() => {
                          setActiveMenuId(null)
                          setEditingMember(m)
                          setIsModalOpen(true)
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                      >
                        <span>✏️</span> Edit
                      </button>
                      <button
                        onClick={() => {
                          setActiveMenuId(null)
                          void handleDeleteMember(m)
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                      >
                        <span>🗑️</span> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add member dashed card */}
        <button
          onClick={() => {
            setEditingMember(null)
            setIsModalOpen(true)
          }}
          className="w-full bg-white border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center gap-2 text-gray-400 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
        >
          <span className="text-3xl font-light text-gray-400">+</span>
          <span className="text-sm font-700 text-gray-700">Add Family Member</span>
          <span className="text-xs text-gray-400 text-center">
            Save their address and contact for quick emergency dispatch
          </span>
        </button>
      </div>

      <AddFamilyMemberModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingMember(null)
        }}
        member={editingMember}
        onSaved={async () => {
          await refreshClientData()
        }}
      />

      <BottomNav screen="family" navigate={navigate} />
    </div>
  )
}
