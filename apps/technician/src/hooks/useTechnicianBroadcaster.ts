import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../../../../packages/shared/src/lib/supabase';
import { useAuth } from '../../../../packages/shared/src/auth';
import { useDispatch } from '../../../../src/context/DispatchContext';
import type { DispatchJob } from '../../../../src/types/dispatch';

interface BroadcasterOptions {
  activeJob?: DispatchJob | null;
  minIntervalMs?: number; // default 5000ms
  minDistanceMeters?: number; // default 15m
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BroadcasterState {
  isBroadcasting: boolean;
  isSimulating: boolean;
  currentCoordinates: Coordinates | null;
  heading: number | null;
  speed: number | null;
  lastTransmittedAt: Date | null;
  error: string | null;
  toggleSimulation: () => void;
}

// Greater Noida coordinates for local dev simulation
const START_SIMULATION_COORDS: Coordinates = { latitude: 28.4727, longitude: 77.4893 }; // Knowledge Park III
const DEFAULT_CLIENT_COORDS: Coordinates = { latitude: 28.6083, longitude: 77.4267 }; // Gaur City 2, Greater Noida West

function calculateHeading(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function useTechnicianBroadcaster(options?: BroadcasterOptions): BroadcasterState {
  const { userId, role } = useAuth();
  const { job: contextJob } = useDispatch();
  const job = options?.activeJob ?? contextJob;

  const minIntervalMs = options?.minIntervalMs ?? 5000;
  const minDistanceMeters = options?.minDistanceMeters ?? 15;

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentCoordinates, setCurrentCoordinates] = useState<Coordinates | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [lastTransmittedAt, setLastTransmittedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lastTransmittedTimeRef = useRef<number>(0);
  const lastTransmittedPosRef = useRef<Coordinates | null>(null);
  const simStepRef = useRef<number>(0);
  const simIntervalRef = useRef<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Active job status gate: only broadcast when en-route or arrived
  const isActive = Boolean(
    userId &&
      role === 'technician' &&
      job &&
      (job.status === 'en-route' ||
        (job.status as string) === 'en_route' ||
        job.status === 'arrived' ||
        job.executionStep === 'en-route' ||
        job.executionStep === 'arrived')
  );

  const clientTarget = useRef<Coordinates>(DEFAULT_CLIENT_COORDS);
  useEffect(() => {
    if (job?.serviceLatitude && job?.serviceLongitude) {
      clientTarget.current = {
        latitude: job.serviceLatitude,
        longitude: job.serviceLongitude,
      };
    }
  }, [job?.serviceLatitude, job?.serviceLongitude]);

  // Transmit location to Supabase with dual RPC / table update
  const transmitLocation = useCallback(
    async (coords: Coordinates, currentHeading?: number | null, currentSpeed?: number | null) => {
      if (!userId) return;

      const now = Date.now();
      const lastTime = lastTransmittedTimeRef.current;
      const lastPos = lastTransmittedPosRef.current;

      // Throttle condition: skip if < minIntervalMs AND distance < minDistanceMeters
      if (lastPos && now - lastTime < minIntervalMs) {
        const moved = distanceMeters(lastPos.latitude, lastPos.longitude, coords.latitude, coords.longitude);
        if (moved < minDistanceMeters) {
          return;
        }
      }

      lastTransmittedTimeRef.current = now;
      lastTransmittedPosRef.current = coords;
      setLastTransmittedAt(new Date(now));

      try {
        // 1. Primary: Use RPC report_technician_location (updates location, heading, speed + trajectory log)
        const { error: rpcErr } = await supabase.rpc('report_technician_location', {
          p_lat: coords.latitude,
          p_lng: coords.longitude,
          p_heading: currentHeading ?? undefined,
          p_speed: currentSpeed ?? undefined,
        });

        // 2. Fallback or parallel direct update on technician_locations
        if (rpcErr) {
          console.warn('[broadcaster] RPC failed, falling back to direct table update:', rpcErr.message);
          const { error: directErr } = await supabase
            .from('technician_locations')
            .update({
              location: `POINT(${coords.longitude} ${coords.latitude})`,
              heading: currentHeading ?? null,
              speed: currentSpeed ?? null,
              // request_id is not client-writable (20260913000013): it is
              // maintained by sync_technician_location_request on assignment.
              updated_at: new Date().toISOString(),
            })
            .eq('technician_id', userId);

          if (directErr) {
            console.error('[broadcaster] Direct update failed:', directErr.message);
            setError(directErr.message);
          } else {
            setError(null);
          }
        } else {
          setError(null);
        }

        // 3. Localhost bridge notification for low-latency dev sync
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          try {
            await fetch('http://localhost:3003/__sos_dispatch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'LOCATION_UPDATE',
                technicianId: userId,
                requestId: job?.id,
                latitude: coords.latitude,
                longitude: coords.longitude,
                heading: currentHeading,
                speed: currentSpeed,
                updatedAt: new Date().toISOString(),
              }),
            });
          } catch {
            // Ignore bridge network hiccups
          }
        }
      } catch (err) {
        console.error('[broadcaster] Transmission error:', err);
        setError(err instanceof Error ? err.message : 'Unknown location broadcast error');
      }
    },
    [userId, job?.id, minIntervalMs, minDistanceMeters]
  );

  const toggleSimulation = useCallback(() => {
    setIsSimulating((prev) => !prev);
  }, []);

  // Main effect: GPS watching or dev fallback
  useEffect(() => {
    if (!isActive) {
      setIsBroadcasting(false);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (simIntervalRef.current !== null) {
        window.clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      return;
    }

    setIsBroadcasting(true);

    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';

    // Start simulation loop function
    const startSimulation = () => {
      if (simIntervalRef.current !== null) return;
      setIsSimulating(true);

      const target = clientTarget.current;
      const start = START_SIMULATION_COORDS;
      const totalSteps = 40; // 40 steps from start to destination

      // Initialize step
      if (simStepRef.current === 0) {
        setCurrentCoordinates(start);
        void transmitLocation(start, 340, 6.1);
      }

      simIntervalRef.current = window.setInterval(() => {
        simStepRef.current = (simStepRef.current + 1) % totalSteps;
        const fraction = simStepRef.current / totalSteps;

        // Linear interpolation towards target with slight curve
        const curLat = start.latitude + (target.latitude - start.latitude) * fraction;
        const curLon = start.longitude + (target.longitude - start.longitude) * fraction;

        const nextStepLat = start.latitude + (target.latitude - start.latitude) * Math.min(1, (simStepRef.current + 1) / totalSteps);
        const nextStepLon = start.longitude + (target.longitude - start.longitude) * Math.min(1, (simStepRef.current + 1) / totalSteps);

        const curHeading = calculateHeading(curLat, curLon, nextStepLat, nextStepLon);
        const simSpeed = 7.5; // ~27 km/h

        const newCoords: Coordinates = { latitude: curLat, longitude: curLon };
        setCurrentCoordinates(newCoords);
        setHeading(curHeading);
        setSpeed(simSpeed);

        void transmitLocation(newCoords, curHeading, simSpeed);
      }, 5000);
    };

    // If explicit simulation active, run simulation immediately
    if (isSimulating) {
      startSimulation();
      return () => {
        if (simIntervalRef.current !== null) {
          window.clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
      };
    }

    // Attempt native browser GPS
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords: Coordinates = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setCurrentCoordinates(coords);
          setHeading(pos.coords.heading || null);
          setSpeed(pos.coords.speed || null);
          void transmitLocation(coords, pos.coords.heading, pos.coords.speed);
        },
        (err) => {
          console.warn('[broadcaster] Geolocation watch error:', err.message);
          setError(err.message);
          // On localhost, fallback to simulation if permission denied or unavailable
          if (isLocal) {
            console.log('[broadcaster] Localhost detected & GPS unavailable. Activating route simulation.');
            startSimulation();
          }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    } else if (isLocal) {
      startSimulation();
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (simIntervalRef.current !== null) {
        window.clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, [isActive, isSimulating, transmitLocation]);

  return {
    isBroadcasting,
    isSimulating,
    currentCoordinates,
    heading,
    speed,
    lastTransmittedAt,
    error,
    toggleSimulation,
  };
}

export default useTechnicianBroadcaster;
