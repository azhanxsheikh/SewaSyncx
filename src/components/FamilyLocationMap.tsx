import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { forwardGeocode, type Coordinates } from "../utils/geocoding"

export interface FamilyLocationMapProps {
  address: string
  area: string
  memberName?: string
  coordinates?: Coordinates | null
  heightClass?: string
  className?: string
  onCoordinatesResolved?: (coords: Coordinates) => void
}

export function resolveMemberCoordinates(address: string, area: string): Coordinates {
  const text = `${address} ${area}`.toLowerCase()
  if (text.includes("sector 62") || text.includes("sec 62") || text.includes("noida")) {
    return { latitude: 28.6280, longitude: 77.3649 }
  }
  if (text.includes("lal kuan") || text.includes("delhi") || text.includes("old delhi")) {
    return { latitude: 28.6496, longitude: 77.2285 }
  }
  if (text.includes("gaur city") || text.includes("greater noida")) {
    return { latitude: 28.6080, longitude: 77.4370 }
  }
  return { latitude: 28.6280, longitude: 77.3649 }
}

export default function FamilyLocationMap({
  address,
  area,
  memberName,
  coordinates: propCoordinates,
  heightClass = "h-40",
  className = "",
  onCoordinatesResolved,
}: FamilyLocationMapProps) {
  const mapElement = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  const [resolvedCoords, setResolvedCoords] = useState<Coordinates>(() => {
    return propCoordinates ?? resolveMemberCoordinates(address, area)
  })

  // Geocode address when it changes
  useEffect(() => {
    if (propCoordinates) {
      setResolvedCoords(propCoordinates)
      return
    }

    const fallback = resolveMemberCoordinates(address, area)
    setResolvedCoords(fallback)

    let isMounted = true
    const fullAddress = `${address}, ${area}`.trim()

    if (fullAddress) {
      void forwardGeocode(fullAddress).then((coords) => {
        if (isMounted && coords) {
          setResolvedCoords(coords)
          onCoordinatesResolved?.(coords)
        }
      })
    }

    return () => {
      isMounted = false
    }
  }, [address, area, propCoordinates, onCoordinatesResolved])

  // Initialize Map
  useEffect(() => {
    if (!mapElement.current || mapRef.current) return

    const initialPoint: L.LatLngExpression = [
      resolvedCoords.latitude,
      resolvedCoords.longitude,
    ]

    const map = L.map(mapElement.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    }).setView(initialPoint, 15)

    L.control.zoom({ position: "bottomright" }).addTo(map)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map)

    const markerIcon = L.divIcon({
      className: "sos-family-marker",
      html: `
        <div class="relative flex items-center justify-center w-7 h-7">
          <span class="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-red-400 opacity-75"></span>
          <span class="relative inline-flex items-center justify-center h-7 w-7 rounded-full bg-red-600 border-2 border-white shadow-md text-white text-xs font-bold">
            📍
          </span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })

    const marker = L.marker(initialPoint, { icon: markerIcon }).addTo(map)
    const label = memberName ? `${memberName}'s Location` : "Family Member Location"
    marker.bindTooltip(
      `<strong>${label}</strong><br/><span style="font-size: 11px; color: #4b5563;">${address}</span>`,
      { direction: "top", offset: [0, -14] }
    )

    markerRef.current = marker
    mapRef.current = map

    window.setTimeout(() => map.invalidateSize(), 50)
    window.setTimeout(() => map.invalidateSize(), 250)

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  // Update map view & marker when coordinates or address changes
  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return

    const point: L.LatLngExpression = [
      resolvedCoords.latitude,
      resolvedCoords.longitude,
    ]

    marker.setLatLng(point)
    map.setView(point, 15)

    const label = memberName ? `${memberName}'s Location` : "Family Member Location"
    marker.setTooltipContent(
      `<strong>${label}</strong><br/><span style="font-size: 11px; color: #4b5563;">${address}</span>`
    )
  }, [resolvedCoords.latitude, resolvedCoords.longitude, address, memberName])

  return (
    <div className={`relative ${heightClass} w-full overflow-hidden rounded-2xl border border-gray-100 shadow-sm bg-gray-100 ${className}`}>
      <div ref={mapElement} className="h-full w-full" />
      <div className="absolute bottom-1 left-2 z-[400] bg-white/80 backdrop-blur-xs rounded px-1.5 py-0.5 text-[9px] font-medium text-gray-500 shadow-xs pointer-events-none">
        &copy; OpenStreetMap
      </div>
    </div>
  )
}
