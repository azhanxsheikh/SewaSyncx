import { useEffect, useState } from "react"
import { useAuth } from "../../../packages/shared/src/auth"
import { supabase } from "../../lib/supabaseClient"

interface CategoryOption {
  id: string
  name: string
  slug: string
  icon: string
}

interface ProfileState {
  name: string
  phone: string
  email: string
  photoUrl: string
  vehicleType: string
  vehicleRegistration: string
  isOnline: boolean
  operatingZone: string
  identityVerified: boolean
  skillVerified: boolean
  backgroundChecked: boolean
  rating: number
  reviewCount: number
  totalJobs: number
}

const VEHICLE_OPTIONS = [
  "Two-Wheeler / Scooter",
  "Three-Wheeler / Auto",
  "Van / Four-Wheeler",
  "None",
]

const POPULAR_ZONES = [
  "Gaur City 2, Greater Noida West",
  "Sector 62, Noida",
  "Indirapuram, Ghaziabad",
  "Sector 18, Noida",
  "Greater Noida Alpha 1",
  "Lal Kuan, Delhi",
]

export default function TechnicianProfilePage() {
  const { userId, user } = useAuth()
  const [profile, setProfile] = useState<ProfileState>({
    name: "",
    phone: "",
    email: "",
    photoUrl: "",
    vehicleType: "Two-Wheeler / Scooter",
    vehicleRegistration: "",
    isOnline: true,
    operatingZone: "Gaur City 2, Greater Noida West",
    identityVerified: false,
    skillVerified: false,
    backgroundChecked: false,
    rating: 0,
    reviewCount: 0,
    totalJobs: 0,
  })

  const [availableCategories, setAvailableCategories] = useState<CategoryOption[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [initialCategoryIds, setInitialCategoryIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Load technician profile data and categories from Supabase
  useEffect(() => {
    let active = true
    if (!userId) return
    const activeUid: string = userId

    async function loadProfileData() {
      setIsLoading(true)
      try {
        // 1. Fetch user record
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("name, phone, email, default_street_address")
          .eq("id", activeUid)
          .single()

        if (userError) {
          console.warn("[technician] error loading user:", userError.message)
        }

        // 2. Fetch technician profile record
        const { data: techData, error: techError } = await supabase
          .from("technician_profiles")
          .select("vehicle_type, vehicle_registration, is_online, photo_url, identity_verified, skill_verified, background_checked, rating, review_count, total_jobs")
          .eq("id", activeUid)
          .maybeSingle()

        if (techError) {
          console.warn("[technician] error loading technician profile:", techError.message)
        }

        // 3. Fetch all service categories
        const { data: catRows, error: catError } = await supabase
          .from("service_categories")
          .select("id, name, slug, icon")
          .order("name")

        if (catError) {
          console.warn("[technician] error loading service categories:", catError.message)
        }

        // 4. Fetch technician's registered categories
        const { data: techCatRows, error: techCatError } = await supabase
          .from("technician_categories")
          .select("category_id")
          .eq("technician_id", activeUid)

        if (techCatError) {
          console.warn("[technician] error loading technician categories:", techCatError.message)
        }

        if (active) {
          if (catRows) {
            setAvailableCategories(catRows)
          }

          const registeredIds = techCatRows ? techCatRows.map((r: { category_id: string }) => r.category_id) : []
          setSelectedCategoryIds(registeredIds)
          setInitialCategoryIds(registeredIds)

          setProfile({
            name: userData?.name || (user?.user_metadata?.name ? String(user.user_metadata.name) : "Technician"),
            phone: userData?.phone || "",
            email: userData?.email || user?.email || "",
            photoUrl: techData?.photo_url || "",
            vehicleType: techData?.vehicle_type || "Two-Wheeler / Scooter",
            vehicleRegistration: techData?.vehicle_registration || "",
            isOnline: techData?.is_online ?? true,
            operatingZone: userData?.default_street_address || "Gaur City 2, Greater Noida West",
            identityVerified: Boolean(techData?.identity_verified),
            skillVerified: Boolean(techData?.skill_verified),
            backgroundChecked: Boolean(techData?.background_checked),
            rating: Number(techData?.rating ?? 0),
            reviewCount: Number(techData?.review_count ?? 0),
            totalJobs: Number(techData?.total_jobs ?? 0),
          })
        }
      } catch (err) {
        console.error("[technician] error loading profile:", err)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadProfileData()

    return () => {
      active = false
    }
  }, [userId, user])

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = window.setTimeout(() => setToast(null), 4000)
      return () => window.clearTimeout(timer)
    }
  }, [toast])

  const handleCategoryToggle = (catId: string) => {
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== catId))
    } else {
      if (selectedCategoryIds.length >= 3) {
        setToast({
          type: "error",
          message: "Maximum 3 skill categories allowed by SewaSync cooperative bylaws.",
        })
        return
      }
      setSelectedCategoryIds((prev) => [...prev, catId])
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const uid = userId
    if (!uid) return

    if (!profile.name.trim()) {
      setToast({ type: "error", message: "Full Name cannot be empty." })
      return
    }

    // Strict E.164 phone format check
    const cleanPhone = profile.phone.trim()
    if (cleanPhone && !/^\+[1-9][0-9]{7,14}$/.test(cleanPhone)) {
      setToast({
        type: "error",
        message: "Mobile phone must be in international E.164 format (e.g. +919811223344).",
      })
      return
    }

    setIsSaving(true)
    setToast(null)

    try {
      // 1. Update public.users
      const userUpdates: {
        name: string
        default_street_address?: string | null
        phone?: string
        updated_at?: string
      } = {
        name: profile.name.trim(),
        default_street_address: profile.operatingZone.trim() || null,
        updated_at: new Date().toISOString(),
      }
      if (cleanPhone) {
        userUpdates.phone = cleanPhone
      }

      const { error: userError } = await supabase
        .from("users")
        .update(userUpdates)
        .eq("id", uid)

      if (userError) throw userError

      // 2. Update public.technician_profiles
      const { error: techError } = await supabase
        .from("technician_profiles")
        .update({
          vehicle_type: profile.vehicleType,
          vehicle_registration: profile.vehicleRegistration.trim() || null,
          is_online: profile.isOnline,
          photo_url: profile.photoUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", uid)

      if (techError) throw techError

      // 3. Sync categories if modified
      const toAdd = selectedCategoryIds.filter((id) => !initialCategoryIds.includes(id))
      const toRemove = initialCategoryIds.filter((id) => !selectedCategoryIds.includes(id))

      if (toRemove.length > 0) {
        const { error: delError } = await supabase
          .from("technician_categories")
          .delete()
          .eq("technician_id", uid)
          .in("category_id", toRemove)

        if (delError) console.warn("[technician] delete categories error:", delError.message)
      }

      if (toAdd.length > 0) {
        const insertRows = toAdd.map((catId) => ({
          technician_id: uid,
          category_id: catId,
        }))
        const { error: insError } = await supabase
          .from("technician_categories")
          .insert(insertRows)

        if (insError) console.warn("[technician] insert categories error:", insError.message)
      }

      setInitialCategoryIds(selectedCategoryIds)
      setToast({
        type: "success",
        message: "Technician profile updated successfully!",
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile."
      console.error("[technician] save profile error:", err)
      setToast({ type: "error", message: msg })
    } finally {
      setIsSaving(false)
    }
  }


  const isVerifiedWorker = profile.identityVerified && profile.skillVerified && profile.backgroundChecked

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <div className="h-8 w-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading technician profile...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 shadow-2xl text-sm font-bold backdrop-blur-md animate-in slide-in-from-top-4 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-300"
              : "bg-red-50 text-red-900 border border-red-300"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : "⚠️"}</span>
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-slate-500">Cooperative Member Account</p>
        <h1 className="mt-1 font-display text-3xl font-800 text-slate-900">Technician Profile</h1>
      </div>

      {/* Worker Verification & Reputation Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-amber-600 text-white font-display font-800 text-2xl shadow-lg shadow-red-500/20 overflow-hidden">
              {profile.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{profile.name.slice(0, 2).toUpperCase() || "SH"}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-xl font-800 text-slate-900">{profile.name}</h2>
                {isVerifiedWorker ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    <span>✓</span>
                    <span>Verified Cooperative Worker</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                    <span>⏳</span>
                    <span>Pending Review</span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">{profile.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:border-l sm:border-slate-200 sm:pl-6">
            <div className="text-center sm:text-left">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Rating</p>
              <p className="text-base font-display font-800 text-amber-500 mt-0.5">
                {profile.reviewCount > 0 ? `${profile.rating.toFixed(1)} ★` : "New Worker"}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center sm:text-left">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Jobs</p>
              <p className="text-base font-display font-800 text-slate-900 mt-0.5">{profile.totalJobs}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Personal Information */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 shadow-sm">
          <h3 className="font-display font-800 text-lg text-slate-900 border-b border-slate-100 pb-3">
            Personal Information
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 font-semibold placeholder:text-slate-400 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-colors text-sm"
                placeholder="Rahul Kumar"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Phone (E.164 format)
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 font-semibold placeholder:text-slate-400 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-colors text-sm"
                placeholder="+919811223344"
              />
              <p className="text-[11px] text-slate-500 mt-1">Required for emergency dispatch & customer calls</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Profile Photo URL
              </label>
              <input
                type="url"
                value={profile.photoUrl}
                onChange={(e) => setProfile((p) => ({ ...p, photoUrl: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 font-semibold placeholder:text-slate-400 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-colors text-sm"
                placeholder="https://example.com/photo.jpg"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Vehicle & Dispatch Logistics */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 shadow-sm">
          <h3 className="font-display font-800 text-lg text-slate-900 border-b border-slate-100 pb-3">
            Vehicle & Logistics
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vehicle Type
              </label>
              <select
                value={profile.vehicleType}
                onChange={(e) => setProfile((p) => ({ ...p, vehicleType: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 font-semibold focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-colors text-sm"
              >
                {VEHICLE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vehicle Registration Number
              </label>
              <input
                type="text"
                value={profile.vehicleRegistration}
                onChange={(e) => setProfile((p) => ({ ...p, vehicleRegistration: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 font-semibold focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-colors text-sm uppercase"
                placeholder="UP 16 AB 1234"
              />
              <p className="text-[11px] text-slate-500 mt-1">Verified during society gate security checks</p>
            </div>
          </div>
        </div>

        {/* Section 3: Operational Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 shadow-sm">
          <h3 className="font-display font-800 text-lg text-slate-900 border-b border-slate-100 pb-3">
            Operational Status & Operating Zone
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Duty Availability Toggle */}
            <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div>
                <p className="font-bold text-sm text-slate-900">Duty Availability</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {profile.isOnline
                    ? "You are currently online and eligible for incoming emergency dispatches."
                    : "You are currently offline and will not receive new alerts."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfile((p) => ({ ...p, isOnline: !p.isOnline }))}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  profile.isOnline ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    profile.isOnline ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Base Locality Selector */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Base Operating Zone / Locality
              </label>
              <input
                type="text"
                value={profile.operatingZone}
                onChange={(e) => setProfile((p) => ({ ...p, operatingZone: e.target.value }))}
                list="popular-zones"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 font-semibold placeholder:text-slate-400 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-colors text-sm"
                placeholder="e.g. Gaur City 2, Greater Noida West"
              />
              <datalist id="popular-zones">
                {POPULAR_ZONES.map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
              <p className="text-[11px] text-slate-500 mt-1">
                Emergency dispatch radar searches within a 20 km radius of this zone
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Registered Skill Categories (Max 3 Constraint) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-display font-800 text-lg text-slate-900">
                Registered Skill Categories
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Maximum 3 categories enforced by cooperative bylaws
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                selectedCategoryIds.length === 3
                  ? "bg-amber-50 border border-amber-300 text-amber-800"
                  : "bg-slate-100 border border-slate-200 text-slate-700"
              }`}
            >
              {selectedCategoryIds.length} / 3 Selected
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {availableCategories.map((cat) => {
              const isSelected = selectedCategoryIds.includes(cat.id)
              return (
                <div
                  key={cat.id}
                  onClick={() => handleCategoryToggle(cat.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-red-50 border-red-300 text-red-700 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="font-bold text-sm">{cat.name}</span>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-md flex items-center justify-center text-xs font-bold border transition-colors ${
                      isSelected
                        ? "bg-red-500 border-red-500 text-white"
                        : "border-slate-300 bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.98] py-4 font-bold text-white shadow-lg shadow-red-600/25 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Profile Changes...</span>
              </>
            ) : (
              <span>Save Profile Changes</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
