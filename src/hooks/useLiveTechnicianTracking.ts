import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LiveTechnicianTrackingState {
  technicianCoordinates: Coordinates | null;
  smoothedCoordinates: Coordinates | null;
  bearing: number;
  speedMs: number;
  distanceKm: number;
  roadDistanceKm: number;
  etaMinutes: number;
  isConnected: boolean;
  lastUpdated: Date | null;
}

const EARTH_RADIUS_KM = 6371;
const URBAN_TORTUOSITY = 1.35;
const DEFAULT_SPEED_MS = 22 / 3.6; // 22 km/h in m/s (~6.11 m/s)
const MIN_SPEED_THRESHOLD_MS = 2.0;

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Great-circle distance between two points using the Haversine formula (km).
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Initial bearing from (lat1, lon1) to (lat2, lon2) in degrees [0, 360).
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = toDeg(Math.atan2(y, x));
  return (theta + 360) % 360;
}

/**
 * Ease-out cubic function: f(t) = 1 - (1 - t)^3 for t in [0, 1].
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Parses PostGIS geography Point values from Supabase into latitude & longitude.
 */
export function parseGeoPoint(val: unknown): Coordinates | null {
  if (!val) return null;
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
      // GeoJSON [longitude, latitude]
      const lon = Number(obj.coordinates[0]);
      const lat = Number(obj.coordinates[1]);
      if (!isNaN(lat) && !isNaN(lon)) return { latitude: lat, longitude: lon };
    }
    if ('latitude' in obj && 'longitude' in obj) {
      const lat = Number(obj.latitude);
      const lon = Number(obj.longitude);
      if (!isNaN(lat) && !isNaN(lon)) return { latitude: lat, longitude: lon };
    }
    if ('lat' in obj && 'lng' in obj) {
      const lat = Number(obj.lat);
      const lon = Number(obj.lng);
      if (!isNaN(lat) && !isNaN(lon)) return { latitude: lat, longitude: lon };
    }
  }
  if (typeof val === 'string') {
    // WKT format: POINT(lng lat)
    const match = val.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      const lon = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lon)) return { latitude: lat, longitude: lon };
    }
    // EWKB hex format (e.g. 0101000020E6100000...)
    if (/^[0-9a-fA-F]{42,}$/.test(val)) {
      try {
        const matches = val.match(/../g);
        if (matches) {
          const bytes = new Uint8Array(matches.map((h) => parseInt(h, 16)));
          const view = new DataView(bytes.buffer);
          const isLittleEndian = bytes[0] === 1;
          const geomType = view.getUint32(1, isLittleEndian);
          const hasSrid = (geomType & 0x20000000) !== 0;
          const offset = hasSrid ? 9 : 5;
          const lon = view.getFloat64(offset, isLittleEndian);
          const lat = view.getFloat64(offset + 8, isLittleEndian);
          if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
            return { latitude: lat, longitude: lon };
          }
        }
      } catch {
        // ignore parse error
      }
    }
  }
  return null;
}

/**
 * Event-Driven WebSocket Live Technician Tracking Hook.
 * Enforces monotonic packet ordering, urban tortuosity ETA, and ease-out cubic LERP smoothing.
 */
export function useLiveTechnicianTracking(
  technicianId?: string | null,
  clientCoordinates?: Coordinates | null,
  requestId?: string | null,
): LiveTechnicianTrackingState {
  const [techCoords, setTechCoords] = useState<Coordinates | null>(null);
  const [smoothedCoords, setSmoothedCoords] = useState<Coordinates | null>(null);
  const [bearing, setBearing] = useState<number>(0);
  const [speedMs, setSpeedMs] = useState<number>(DEFAULT_SPEED_MS);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const lastTimestampRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lerpStartPos = useRef<Coordinates | null>(null);
  const lerpTargetPos = useRef<Coordinates | null>(null);
  const lerpStartTime = useRef<number>(0);
  const LERP_DURATION_MS = 1000;

  // LERP animation loop
  const animateLerp = (now: number) => {
    if (!lerpStartPos.current || !lerpTargetPos.current) return;
    const elapsed = now - lerpStartTime.current;
    const progress = Math.min(elapsed / LERP_DURATION_MS, 1);
    const eased = easeOutCubic(progress);

    const lat =
      lerpStartPos.current.latitude +
      (lerpTargetPos.current.latitude - lerpStartPos.current.latitude) * eased;
    const lon =
      lerpStartPos.current.longitude +
      (lerpTargetPos.current.longitude - lerpStartPos.current.longitude) * eased;

    setSmoothedCoords({ latitude: lat, longitude: lon });

    if (progress < 1) {
      animFrameRef.current = requestAnimationFrame(animateLerp);
    }
  };

  const handleLocationUpdate = (
    newLocation: Coordinates,
    newSpeed?: number | null,
    newHeading?: number | null,
    timestamp?: string,
  ) => {
    // Monotonic packet ordering
    if (timestamp) {
      const timeVal = new Date(timestamp).getTime();
      if (timeVal <= lastTimestampRef.current) {
        return; // Drop out-of-order or duplicate packet
      }
      lastTimestampRef.current = timeVal;
    }

    setLastUpdated(new Date());

    // Speed handling
    const effectiveSpeed =
      typeof newSpeed === 'number' && newSpeed > MIN_SPEED_THRESHOLD_MS
        ? newSpeed
        : DEFAULT_SPEED_MS;
    setSpeedMs(effectiveSpeed);

    // Bearing handling
    if (typeof newHeading === 'number' && !isNaN(newHeading)) {
      setBearing(newHeading);
    } else if (techCoords) {
      const calcB = calculateBearing(
        techCoords.latitude,
        techCoords.longitude,
        newLocation.latitude,
        newLocation.longitude,
      );
      setBearing(calcB);
    } else if (clientCoordinates) {
      const calcB = calculateBearing(
        newLocation.latitude,
        newLocation.longitude,
        clientCoordinates.latitude,
        clientCoordinates.longitude,
      );
      setBearing(calcB);
    }

    setTechCoords(newLocation);

    // Start smooth interpolation
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    lerpStartPos.current = smoothedCoords ?? newLocation;
    lerpTargetPos.current = newLocation;
    lerpStartTime.current = performance.now();
    animFrameRef.current = requestAnimationFrame(animateLerp);
  };

  useEffect(() => {
    if (!technicianId && !requestId) {
      setTechCoords(null);
      setSmoothedCoords(null);
      setIsConnected(false);
      return;
    }

    let isSubscribed = true;

    // Fetch initial location snapshot once
    const initialQuery = supabase.from('technician_locations').select('location, speed, heading, updated_at');
    const query = requestId
      ? initialQuery.eq('request_id', requestId).maybeSingle()
      : initialQuery.eq('technician_id', technicianId!).maybeSingle();

    void query.then(({ data, error }) => {
      if (!isSubscribed || error || !data) return;
      const coords = parseGeoPoint(data.location);
      if (coords) {
        handleLocationUpdate(
          coords,
          data.speed,
          data.heading,
          data.updated_at,
        );
      }
    });

    // Pure WebSocket subscription (Zero HTTP polling)
    const channelName = requestId ? `tracking_client_${requestId}` : `tech-tracking-${technicianId}`;
    const channel = supabase.channel(channelName);

    const onPayload = (payload: { new?: unknown; old?: unknown }) => {
      const row = (payload.new || payload.old) as {
        location?: unknown;
        speed?: number;
        heading?: number;
        updated_at?: string;
      };
      if (!row) return;
      const coords = parseGeoPoint(row.location);
      if (coords) {
        handleLocationUpdate(coords, row.speed, row.heading, row.updated_at);
      }
    };

    if (requestId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'technician_locations',
          filter: `request_id=eq.${requestId}`,
        },
        onPayload,
      );
    }

    if (technicianId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'technician_locations',
          filter: `technician_id=eq.${technicianId}`,
        },
        onPayload,
      );
    }

    channel.subscribe((status) => {
      if (isSubscribed) {
        setIsConnected(status === 'SUBSCRIBED');
      }
    });

    // Local dispatch bridge listener (for local simulation / tab-to-tab sync)
    const handleBridgeEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        technicianId?: string;
        requestId?: string;
        latitude?: number;
        longitude?: number;
        heading?: number;
        speed?: number;
        updatedAt?: string;
      }>;
      const d = customEvent.detail;
      if (!d) return;
      const matchesTech = technicianId && d.technicianId === technicianId;
      const matchesReq = requestId && d.requestId === requestId;
      if (matchesTech || matchesReq || (!technicianId && !requestId)) {
        if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
          handleLocationUpdate(
            { latitude: d.latitude, longitude: d.longitude },
            d.speed,
            d.heading,
            d.updatedAt,
          );
        }
      }
    };

    window.addEventListener('technician_location_update', handleBridgeEvent);

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      window.removeEventListener('technician_location_update', handleBridgeEvent);
      supabase.removeChannel(channel);
    };
  }, [technicianId, requestId]);

  // Derive distance and ETA
  const currentPos = smoothedCoords ?? techCoords;
  let distanceKm = 0;
  let roadDistanceKm = 0;
  let etaMinutes = 0;

  if (currentPos && clientCoordinates) {
    distanceKm = haversineDistance(
      currentPos.latitude,
      currentPos.longitude,
      clientCoordinates.latitude,
      clientCoordinates.longitude,
    );
    roadDistanceKm = distanceKm * URBAN_TORTUOSITY;

    const roadDistanceMeters = roadDistanceKm * 1000;
    const etaSeconds = roadDistanceMeters / speedMs;
    etaMinutes = Math.ceil(etaSeconds / 60);

    if (roadDistanceKm < 0.05) {
      etaMinutes = 0; // Arrived
    } else {
      etaMinutes = Math.max(1, etaMinutes);
    }
  }

  return {
    technicianCoordinates: techCoords,
    smoothedCoordinates: currentPos,
    bearing,
    speedMs,
    distanceKm: Number(distanceKm.toFixed(2)),
    roadDistanceKm: Number(roadDistanceKm.toFixed(2)),
    etaMinutes,
    isConnected,
    lastUpdated,
  };
}

export default useLiveTechnicianTracking;
