export interface Coordinates {
  latitude: number
  longitude: number
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org"

export async function forwardGeocode(addressText: string): Promise<Coordinates | null> {
  try {
    const response = await fetch(
      `${NOMINATIM_URL}/search?format=jsonv2&limit=1&q=${encodeURIComponent(addressText)}`,
      { headers: { Accept: "application/json" } },
    )
    if (!response.ok) return null
    const data = (await response.json()) as Array<{ lat?: string; lon?: string }>
    const result = data[0]
    if (!result?.lat || !result.lon) return null
    const latitude = Number(result.lat)
    const longitude = Number(result.lon)
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude }
      : null
  } catch {
    return null
  }
}

/**
 * Sanitizes address for OpenStreetMap Nominatim lookup.
 * Broad locality only: eliminates door/flat/floor noise that fails Nominatim searches.
 */
export function sanitizeOsmAddressQuery(
  societyName: string,
  areaCity: string,
  pincode?: string
): string {
  const parts = [societyName?.trim(), areaCity?.trim(), pincode?.trim()].filter(Boolean)
  return parts.join(", ")
}

export interface FullAddressOptions {
  houseFlat?: string
  societyName?: string
  areaCity?: string
  pincode?: string
  landmarkAndInstructions?: string
}

/**
 * Formulates the complete address string including technician access instructions.
 */
export function constructFullAddressText(
  houseFlatOrOptions: string | FullAddressOptions,
  societyName?: string,
  areaCity?: string,
  pincode?: string,
  landmarkAndInstructions?: string
): string {
  let houseFlat = ""
  let society = societyName || ""
  let area = areaCity || ""
  let pin = pincode
  let instructions = landmarkAndInstructions

  if (typeof houseFlatOrOptions === "object" && houseFlatOrOptions !== null) {
    houseFlat = houseFlatOrOptions.houseFlat || ""
    society = houseFlatOrOptions.societyName || ""
    area = houseFlatOrOptions.areaCity || ""
    pin = houseFlatOrOptions.pincode
    instructions = houseFlatOrOptions.landmarkAndInstructions
  } else {
    houseFlat = houseFlatOrOptions || ""
  }

  const baseParts = [houseFlat.trim(), society.trim(), area.trim()].filter(Boolean)
  const base = baseParts.join(", ") + (pin ? ` ${pin.trim()}` : "")
  if (instructions && instructions.trim()) {
    return `${base}. Landmark: ${instructions.trim()}`
  }
  return base
}

/**
 * Constructs high-precision Google Maps navigation URL for technicians.
 */
export function constructGoogleMapsNavigationUrl(
  latitude: number,
  longitude: number,
  travelMode: "two_wheeler" | "driving" = "two_wheeler"
): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=&travelmode=${travelMode}`
}

