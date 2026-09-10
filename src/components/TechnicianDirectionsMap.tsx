import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

interface Props {
  serviceLatitude?: number
  serviceLongitude?: number
  serviceAddress: string
}

type Route = { coordinates: L.LatLngExpression[]; distance: number; duration: number }
type Status = "idle" | "locating" | "routing" | "success" | "error"

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving"

export default function TechnicianDirectionsMap({ serviceLatitude, serviceLongitude, serviceAddress }: Props) {
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
  const serviceCoordinates = serviceLatitude !== undefined && serviceLongitude !== undefined
    ? [serviceLatitude, serviceLongitude] as L.LatLngExpression
    : null

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return
    const map = L.map(mapElement.current, { zoomControl: false }).setView([28.608, 77.437], 13)
    L.control.zoom({ position: "bottomright" }).addTo(map)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map)
    mapRef.current = map
    window.setTimeout(() => map.invalidateSize(), 0)
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [serviceLatitude, serviceLongitude])

  useEffect(() => {
    if (!mapRef.current || !serviceCoordinates) return
    serviceMarkerRef.current?.remove()
    serviceMarkerRef.current = L.marker(serviceCoordinates, { icon: createIcon("#dc2626") }).addTo(mapRef.current)
      .bindTooltip("Service address", { direction: "top" })
  }, [serviceLatitude, serviceLongitude, serviceCoordinates])

  const openInMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(serviceLatitude !== undefined && serviceLongitude !== undefined ? `${serviceLatitude},${serviceLongitude}` : serviceAddress)}`

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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-700 text-gray-900">Directions to client</h2>
          {route && <p className="mt-1 text-xs text-gray-500">{distance} · about {duration}</p>}
        </div>
        <button type="button" onClick={requestRoute} disabled={serviceCoordinates === null || status === "locating" || status === "routing"} className="rounded-xl bg-red-500 px-3 py-2 text-sm font-700 text-white disabled:cursor-not-allowed disabled:opacity-60">
          {status === "locating" ? "Locating..." : status === "routing" ? "Routing..." : route ? "Refresh route" : "Get Directions"}
        </button>
      </div>
      {serviceCoordinates && <div ref={mapElement} className="mt-3 h-56 w-full overflow-hidden rounded-xl bg-gray-100" />}
      {serviceCoordinates === null && <p className="mt-3 text-sm text-gray-500">We couldn't locate this service address. Directions are unavailable for this job.</p>}
      {serviceCoordinates === null && <a href={openInMapsUrl} target="_blank" rel="noreferrer" className="mt-3 block rounded-xl bg-gray-900 px-4 py-3 text-center text-sm font-700 text-white">Open in Maps</a>}
      {status === "error" && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {status === "error" && serviceCoordinates !== null && <a href={openInMapsUrl} target="_blank" rel="noreferrer" className="mt-3 block rounded-xl bg-gray-900 px-4 py-3 text-center text-sm font-700 text-white">Open in Maps</a>}
      {status === "success" && <a href={openInMapsUrl} target="_blank" rel="noreferrer" className="mt-3 block text-center text-sm font-600 text-blue-600">Open in Maps for turn-by-turn navigation</a>}
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
