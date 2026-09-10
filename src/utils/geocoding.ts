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
