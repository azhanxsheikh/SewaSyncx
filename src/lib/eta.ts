/**
 * Real distance/ETA math, replacing hardcoded strings like "ETA: 12-17 min".
 *
 * The formula and its constants (25 km/h urban transit speed, 4-minute
 * traffic/gated-entry buffer, 5-minute floor) are specified for Greater
 * Noida, matching this app's demo locale — not a general-purpose routing
 * estimate. A real deployment would replace this with an actual routing
 * provider's ETA (see TechnicianDirectionsMap.tsx's OSRM integration for
 * driving directions, which this does not attempt).
 */

const EARTH_RADIUS_KM = 6371;
const URBAN_TRANSIT_KMH = 25;
const TRAFFIC_BUFFER_MINUTES = 4;
const MIN_ETA_MINUTES = 5;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two points, in kilometers. */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/** ETA (mins) = max(5, round((D / 25) * 60) + 4). */
export function estimateEtaMinutes(distanceKm: number): number {
  return Math.max(MIN_ETA_MINUTES, Math.round((distanceKm / URBAN_TRANSIT_KMH) * 60) + TRAFFIC_BUFFER_MINUTES);
}

export interface EtaRange {
  eta: number;
  low: number;
  high: number;
  label: string;
}

/**
 * The point estimate plus a display range around it. The low end is
 * clamped to the formula's own 5-minute floor — `eta - 2` alone can dip
 * below it right at the floor (a 5 min ETA showing "3 - 8 mins" implies a
 * technician could arrive faster than the formula says is possible).
 */
export function etaRangeFromDistance(distanceKm: number): EtaRange {
  const eta = estimateEtaMinutes(distanceKm);
  const low = Math.max(MIN_ETA_MINUTES, eta - 2);
  const high = eta + 3;
  return { eta, low, high, label: `ETA: ${low}-${high} mins` };
}

export function etaRangeFromCoordinates(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): EtaRange {
  return etaRangeFromDistance(haversineDistanceKm(fromLat, fromLng, toLat, toLng));
}
