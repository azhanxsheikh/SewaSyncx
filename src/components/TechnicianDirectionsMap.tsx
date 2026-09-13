import { useEffect, useMemo, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface Props {
  serviceLatitude?: number
  serviceLongitude?: number
  serviceAddress: string
  mode?: "preview" | "active"
  destinationLabel?: string
}

type Route = { coordinates: L.LatLngExpression[]; distance: number; duration: number }
type Status = "idle" | "locating" | "routing" | "success" | "error"

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving"

export default function TechnicianDirectionsMap({
  serviceLatitude,
  serviceLongitude,
  serviceAddress,
  mode = "active",
  destinationLabel,
}: Props) {
  const mapElement = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const routeRef = useRef<L.Polyline | null>(null)
  const technicianMarkerRef = useRef<L.Marker | null>(null)
  const serviceMarkerRef = useRef<L.Marker | null>(null)
  const lastRouteAtRef = useRef(0)
  const [status, setStatus] = useState<Status>("idle")
  const [technicianPosition, setTechnicianPosition] = useState<GeolocationPosition | null>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [error, setError] = useState("")
  // Memoised on the numbers: a fresh array each render would re-run the
  // map-creation effect below (it depends on this), destroying and rebuilding
  // the Leaflet map on every parent re-render.
  const serviceCoordinates = useMemo(
    () => serviceLatitude !== undefined && serviceLongitude !== undefined
      ? [serviceLatitude, serviceLongitude] as L.LatLngExpression
      : null,
    [serviceLatitude, serviceLongitude],
  )

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return
    const defaultCenter: [number, number] = serviceCoordinates
      ? [serviceLatitude!, serviceLongitude!]
      : [28.608, 77.437]
    const map = L.map(mapElement.current, { zoomControl: false }).setView(defaultCenter, 13)
    L.control.zoom({ position: "bottomright" }).addTo(map)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map
    const sizeTimer = window.setTimeout(() => map.invalidateSize(), 0)
    return () => {
      window.clearTimeout(sizeTimer)
      map.remove()
      mapRef.current = null
    }
  }, [serviceLatitude, serviceLongitude, serviceCoordinates])

  useEffect(() => {
    if (!mapRef.current || !serviceCoordinates) return
    serviceMarkerRef.current?.remove()
    const tooltipText = destinationLabel || "Service destination"
    serviceMarkerRef.current = L.marker(serviceCoordinates, { icon: createIcon("#dc2626") }).addTo(mapRef.current)
      .bindTooltip(tooltipText, { direction: "top", permanent: mode === "preview" })
    if (mode === "preview") {
      mapRef.current.setView(serviceCoordinates, 14)
    }
  }, [serviceLatitude, serviceLongitude, serviceCoordinates, destinationLabel, mode])

  const openInMapsUrl = serviceLatitude !== undefined && serviceLongitude !== undefined
    ? `https://www.google.com/maps/dir/?api=1&destination=${serviceLatitude},${serviceLongitude}&travelmode=two_wheeler`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(serviceAddress)}&travelmode=two_wheeler`

  const requestRoute = () => {
    if (serviceLatitude === undefined || serviceLongitude === undefined) {
      setError("We couldn't locate this service address")
      setStatus("error")
      return
    }
    const elapsed = Date.now() - lastRouteAtRef.current
    if (lastRouteAtRef.current && elapsed < 20_000) {
      setError(`Please wait ${Math.ceil((20_000 - elapsed) / 1000)} seconds before refreshing the route.`)
      setStatus(route ? "success" : "error")
      return
    }
    if (!navigator.geolocation) {
      setError("Location is unavailable in this browser.")
      setStatus("error")
      return
    }
    setStatus("locating")
    setError("")
    lastRouteAtRef.current = Date.now()
    navigator.geolocation.getCurrentPosition(async (position) => {
      setTechnicianPosition(position)
      setStatus("routing")
      const { latitude, longitude } = position.coords
      try {
        // TODO: Phase 2 - replace with self-hosted OSRM / GraphHopper for production
        const controller = new AbortController()
        const timeout = window.setTimeout(() => controller.abort(), 10_000)
        const response = await fetch(`${OSRM_URL}/${longitude},${latitude};${serviceLongitude},${serviceLatitude}?overview=full&geometries=geojson`, { signal: controller.signal })
        window.clearTimeout(timeout)
        if (!response.ok) throw new Error("Routing request failed")
        const data = await response.json() as { code?: string; routes?: Array<{ distance: number; duration: number; geometry?: { coordinates: number[][] } }> }
        const selectedRoute = data.routes?.[0]
        if (data.code !== "Ok" || !selectedRoute?.geometry?.coordinates?.length) throw new Error("No route found")
        const nextRoute: Route = {
          coordinates: selectedRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
          distance: selectedRoute.distance,
          duration: selectedRoute.duration,
        }
        setRoute(nextRoute)
        setStatus("success")
      } catch {
        setRoute(null)
        setError("Directions are temporarily unavailable. Use Open in Maps instead.")
        setStatus("error")
      }
    }, (positionError) => {
      setError(positionError.code === 1 ? "Location access denied. Enable location permission and try again." : "Couldn't get your location. Try again.")
      setStatus("error")
    }, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 })
  }

  useEffect(() => {
    const map = mapRef.current
    if (!map || !technicianPosition || !serviceCoordinates) return
    const technicianCoordinates: L.LatLngExpression = [technicianPosition.coords.latitude, technicianPosition.coords.longitude]
    technicianMarkerRef.current?.remove()
    technicianMarkerRef.current = L.marker(technicianCoordinates, { icon: createIcon("#2563eb") }).addTo(map).bindTooltip("Your location", { direction: "top" })
    routeRef.current?.remove()
    if (route) routeRef.current = L.polyline(route.coordinates, { color: "#2563eb", weight: 5, opacity: 0.85 }).addTo(map)
    map.fitBounds(L.latLngBounds([technicianCoordinates, serviceCoordinates]), { padding: [24, 24] })
  }, [route, serviceCoordinates, technicianPosition])

  const distance = route ? `${(route.distance / 1000).toFixed(1)} km` : ""
  const duration = route ? `${Math.max(1, Math.round(route.duration / 60))} min` : ""

  return (
    <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-700 text-gray-900">
            {destinationLabel ? destinationLabel : mode === "preview" ? "Service location context" : "Directions to client"}
          </h2>
          {mode === "active" && route ? (
            <p className="mt-1 text-xs text-gray-500">{distance} · about {duration}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">{mode === "preview" ? "Static context · Navigation locked" : serviceAddress}</p>
          )}
        </div>

        {mode === "preview" ? (
          <button
            type="button"
            disabled
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed border border-slate-300/60 shrink-0"
            title="Navigation is locked until the emergency job is accepted"
          >
            <span>🔒</span>
            <span>Get Directions</span>
          </button>
        ) : (
          <a
            href={openInMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Get Directions</span>
          </a>
        )}
      </div>

      {serviceCoordinates && <div ref={mapElement} className="mt-3 h-56 w-full overflow-hidden rounded-xl bg-gray-100" />}
      {serviceCoordinates === null && <p className="mt-3 text-sm text-gray-500">We couldn't locate this service address. Directions are unavailable for this job.</p>}
      {status === "error" && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {mode === "active" && serviceCoordinates !== null && !route && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={requestRoute}
            disabled={status === "locating" || status === "routing"}
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            {status === "locating" ? "Locating..." : status === "routing" ? "Routing..." : "Preview in-app route polyline"}
          </button>
        </div>
      )}
    </section>
  )
}


function createIcon(color: string) {
  return L.divIcon({
    className: "technician-directions-marker",
    html: `<span style="background:${color}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}
