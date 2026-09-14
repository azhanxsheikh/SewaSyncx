import { useCallback, useEffect, useRef, useState } from "react"
import type { Screen } from "../../types/navigation"
import { useSavedAddresses } from "../../hooks/useAccount"
import Header, { SOSProgress } from "../../components/Header"
import LeafletLocationMap, {
  reverseGeocode,
} from "../../components/LeafletLocationMap"
import { useDispatch } from "../../context/DispatchContext"
import type { ConfirmedLocation } from "../../types/dispatch"
import type { SavedAddress } from "../../types/domain"
import { AddressModal } from "../../components/profile/AddressModal"
import { constructFullAddressText } from "../../utils/geocoding"

interface Props {
  navigate: (s: Screen) => void
  onBack: () => void
}

export default function LocationSelect({ navigate, onBack }: Props) {
  const { confirmedLocation, setConfirmedLocation } = useDispatch()
  const savedAddresses = useSavedAddresses()
  const [selected, setSelected] = useState("a1")
  const [mapLocation, setMapLocation] = useState(confirmedLocation.fullAddress)
  const [selectedCoords, setSelectedCoords] = useState<{
    latitude: number
    longitude: number
    accuracy?: number
  } | undefined>(() => {
    if (confirmedLocation.latitude && confirmedLocation.longitude) {
      return {
        latitude: confirmedLocation.latitude,
        longitude: confirmedLocation.longitude,
        accuracy: 15,
      }
    }
    return { latitude: 28.4744, longitude: 77.504, accuracy: 15 }
  })
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number
    longitude: number
    accuracy?: number
    address?: string
  } | null>(null)
  const [locationState, setLocationState] =
    useState<"idle" | "loading" | "error">("idle")
  const [locationError, setLocationError] = useState("")
  const [isAddAddressModalOpen, setIsAddAddressModalOpen] = useState(false)
  const [technicianNotes, setTechnicianNotes] = useState(
    confirmedLocation.landmarkAndInstructions || "",
  )
  const watchIdRef = useRef<number | null>(null)
  const requestIdRef = useRef(0)

  const clearLocationWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  useEffect(() => clearLocationWatch, [clearLocationWatch])

  const updateLiveLocation = useCallback(
    (position: GeolocationPosition, address?: string) => {
      const { latitude, longitude, accuracy } = position.coords
      const coordinates = { latitude, longitude, accuracy, address }
      setCurrentLocation((previous) => ({ ...previous, ...coordinates }))
      setSelected("current-location")
      setSelectedCoords({ latitude, longitude, accuracy })
      const fullAddress =
        address ||
        `Current GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
      setMapLocation(fullAddress)
      setConfirmedLocation({
        id: "current-location",
        label: "Current Location",
        fullAddress,
        area: "Live GPS location",
        latitude,
        longitude,
      })
    },
    [setConfirmedLocation],
  )

  const resolveLiveLocation = useCallback(
    async (position: GeolocationPosition, requestId: number) => {
      const { latitude, longitude } = position.coords
      const address = await reverseGeocode(latitude, longitude)
      if (requestId === requestIdRef.current)
        updateLiveLocation(position, address)
    },
    [updateLiveLocation],
  )

  const locateCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) return
    clearLocationWatch()
    const requestId = ++requestIdRef.current
    setLocationState("loading")
    setLocationError("")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestId !== requestIdRef.current) return
        setLocationState("idle")
        void resolveLiveLocation(position, requestId)
        watchIdRef.current = navigator.geolocation.watchPosition(
          (nextPosition) => {
            if (requestId === requestIdRef.current)
              updateLiveLocation(nextPosition)
          },
          () => undefined,
          { enableHighAccuracy: true, maximumAge: 0 },
        )
      },
      (error) => {
        if (requestId !== requestIdRef.current) return
        setLocationState("error")
        setLocationError(
          error.code === 1
            ? "Location access denied - enable it in browser/app settings"
            : "Couldn't get your location, try again",
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }, [clearLocationWatch, resolveLiveLocation, updateLiveLocation])

  const selectAddress = useCallback(
    (address: SavedAddress) => {
      clearLocationWatch()
      ++requestIdRef.current
      setLocationState("idle")
      setLocationError("")
      setSelected(address.id)
      const fullAddress = address.addressLine1
        ? constructFullAddressText({
            houseFlat: address.addressLine1,
            societyName: address.addressLine2,
            areaCity: address.city || address.area,
            pincode: address.postalCode,
            landmarkAndInstructions: address.landmark,
          })
        : `${address.address}, ${address.area}`
      setMapLocation(fullAddress)
      const notes = address.landmark || ""
      setTechnicianNotes(notes)

      const lat = address.latitude ?? 28.4744
      const lng = address.longitude ?? 77.504
      setSelectedCoords({ latitude: lat, longitude: lng, accuracy: 15 })

      setConfirmedLocation({
        id: address.id,
        label: address.label,
        fullAddress,
        area: address.area,
        latitude: lat,
        longitude: lng,
        houseFlat: address.addressLine1,
        societyName: address.addressLine2,
        areaCity: address.city || address.area,
        pincode: address.postalCode,
        landmarkAndInstructions: notes,
      })
    },
    [clearLocationWatch, setConfirmedLocation],
  )

  useEffect(() => {
    if (savedAddresses.length > 0 && selected === "a1") {
      const defaultAddr =
        savedAddresses.find((a) => a.isDefault) || savedAddresses[0]
      if (defaultAddr) {
        selectAddress(defaultAddr)
      }
    }
  }, [savedAddresses, selected, selectAddress])

  const setDraggedLocation = useCallback(
    (fullAddress: string, coords?: { latitude: number; longitude: number }) => {
      setMapLocation(fullAddress)
      if (coords) {
        setSelectedCoords({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: 10,
        })
      }
      const location: ConfirmedLocation = {
        ...confirmedLocation,
        id: "map-pin",
        label: "Pinned location",
        fullAddress,
        latitude: coords?.latitude ?? confirmedLocation.latitude,
        longitude: coords?.longitude ?? confirmedLocation.longitude,
      }
      setConfirmedLocation(location)
    },
    [confirmedLocation, setConfirmedLocation],
  )

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title="Emergency SOS" onBack={onBack} showNotification={false} />
      <SOSProgress step={3} total={7} label="Confirm location" />

      <div className="flex-1 pb-28 max-w-md mx-auto w-full">
        {/* Map */}
        <div className="mx-4 mt-4">
          <LeafletLocationMap
            initialAddress={mapLocation}
            activeCoordinates={selectedCoords}
            onLocationChange={setDraggedLocation}
          />
        </div>

        <div className="px-4 mt-5">
          <h2 className="font-display font-800 text-xl text-gray-900">
            Where do you need help?
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            We'll dispatch the nearest available technician to this address
          </p>

          {/* Saved addresses */}
          <div className="mt-4 space-y-2">
            {"geolocation" in navigator && (
              <button
                onClick={locateCurrentPosition}
                disabled={locationState === "loading"}
                className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  selected === "current-location"
                    ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/60"
                    : "border-gray-100 bg-white hover:border-gray-200"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    selected === "current-location"
                      ? "bg-red-100"
                      : "bg-gray-100"
                  }`}
                >
                  <svg
                    className="w-5 h-5 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="3" strokeWidth="2" />
                    <path
                      strokeLinecap="round"
                      strokeWidth="2"
                      d="M12 2v3m0 14v3M2 12h3m14 0h3"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-display font-700 text-gray-900 text-sm">
                      Current Location
                    </p>
                    {selected === "current-location" && (
                      <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {locationState === "loading"
                      ? "Locating..."
                      : locationError ||
                        currentLocation?.address ||
                        "Tap to use your live GPS location"}
                  </p>
                  {selected === "current-location" && !locationError && (
                    <p className="text-xs text-gray-400">Live GPS location</p>
                  )}
                </div>
              </button>
            )}
            {savedAddresses.map((addr) => (
              <button
                key={addr.id}
                onClick={() => selectAddress(addr)}
                className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  selected === addr.id
                    ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/60"
                    : "border-gray-100 bg-white hover:border-gray-200"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                    selected === addr.id ? "bg-red-100" : "bg-gray-100"
                  }`}
                >
                  {addr.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-display font-700 text-gray-900 text-sm">
                      {addr.label}
                    </p>
                    {selected === addr.id && (
                      <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {selected === addr.id
                      ? mapLocation
                      : `${addr.address}, ${addr.area}`}
                  </p>
                  <p className="text-xs text-gray-400">{addr.area}</p>
                </div>
              </button>
            ))}

            {/* Add Address button */}
            <button
              type="button"
              onClick={() => setIsAddAddressModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-dashed border-gray-200 hover:border-red-400 bg-gray-50/60 hover:bg-red-50/40 text-gray-700 hover:text-red-600 transition-all text-sm font-semibold"
            >
              <svg
                className="w-4 h-4 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>+ Add New Address with Technician Notes</span>
            </button>
          </div>

          {/* Technician helper notes */}
          <div className="mt-4 p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-base">🚩</span>
              <label className="text-xs font-bold text-amber-900">
                Landmark & Entry Instructions for Technician
              </label>
            </div>
            <p className="text-[11px] text-amber-800 mb-2 leading-relaxed">
              Help the technician find your door fast: gate number, building
              entry, lift instructions, or society security protocols.
            </p>
            <input
              type="text"
              value={technicianNotes}
              onChange={(e) => {
                const val = e.target.value
                setTechnicianNotes(val)
                setConfirmedLocation({
                  ...confirmedLocation,
                  landmarkAndInstructions: val,
                })
              }}
              placeholder="e.g. Gate 2, Tower B, tell guard Flat 402, use Service Lift"
              className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-amber-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Privacy notice */}
          <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
            <svg
              className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <p>
              Your location is shared only with the technician assigned to this
              request.
            </p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => navigate("sos-photo")}
            className="w-full py-4 rounded-xl font-display font-700 text-base bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200 active:scale-[0.98] transition-all"
          >
            Use This Location →
          </button>
        </div>
      </div>

      <AddressModal
        isOpen={isAddAddressModalOpen}
        onClose={() => setIsAddAddressModalOpen(false)}
      />
    </div>
  )
}
