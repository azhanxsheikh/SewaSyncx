import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface TechnicianInfo {
  name: string;
  photo?: string;
  phone?: string;
  rating?: number;
  vehicle?: string;
  experience?: string;
}

export interface ClientLiveTrackingMapProps {
  clientCoordinates: { latitude: number; longitude: number; accuracy?: number };
  technicianCoordinates?: { latitude: number; longitude: number } | null;
  heading?: number;
  bearing?: number;
  etaMinutes?: number;
  roadDistanceKm?: number;
  serviceAddress?: string;
  technician?: TechnicianInfo | null;
  requestId?: string;
  showOverlay?: boolean;
  onCall?: () => void;
  onChat?: () => void;
  className?: string;
  heightClass?: string;
  onMapReady?: (map: L.Map) => void;
}

export function ClientLiveTrackingMap({
  clientCoordinates,
  technicianCoordinates,
  heading,
  bearing = 0,
  etaMinutes,
  roadDistanceKm,
  serviceAddress,
  technician,
  requestId,
  showOverlay = false,
  onChat,
  className = '',
  heightClass = 'h-full min-h-[350px]',
  onMapReady,
}: ClientLiveTrackingMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clientMarkerRef = useRef<L.Marker | null>(null);
  const techMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const effectiveHeading = heading !== undefined && heading !== null ? heading : bearing;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;

    const initialClientPoint: L.LatLngExpression = [
      clientCoordinates.latitude,
      clientCoordinates.longitude,
    ];

    const map = L.map(mapElement.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(initialClientPoint, 15);

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Client Home Pin: red pulsing circle
    const clientIcon = L.divIcon({
      className: 'sos-client-home-marker',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 -ml-1 -mt-1">
          <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-red-400 opacity-75"></span>
          <span class="relative inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-600 border-2 border-white shadow-xl text-white text-xs font-bold">
            🏠
          </span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const clientMarker = L.marker(initialClientPoint, { icon: clientIcon }).addTo(map);
    if (serviceAddress) {
      clientMarker.bindTooltip(`<strong>Home / Service Address</strong><br/>${serviceAddress}`, {
        direction: 'top',
        offset: [0, -16],
      });
    }
    clientMarkerRef.current = clientMarker;

    mapRef.current = map;
    onMapReady?.(map);

    // Invalidate size after mount to prevent grey/unloaded tiles
    window.setTimeout(() => map.invalidateSize(), 100);
    window.setTimeout(() => map.invalidateSize(), 300);

    return () => {
      map.remove();
      mapRef.current = null;
      clientMarkerRef.current = null;
      techMarkerRef.current = null;
      routePolylineRef.current = null;
    };
  }, []);

  // Update Client position if changed
  useEffect(() => {
    if (!mapRef.current || !clientMarkerRef.current) return;
    const point: L.LatLngExpression = [
      clientCoordinates.latitude,
      clientCoordinates.longitude,
    ];
    clientMarkerRef.current.setLatLng(point);
    if (serviceAddress) {
      clientMarkerRef.current.setTooltipContent(
        `<strong>Home / Service Address</strong><br/>${serviceAddress}`
      );
    }
  }, [clientCoordinates.latitude, clientCoordinates.longitude, serviceAddress]);

  // Update Technician position, heading rotation, route polyline, and auto-fit bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const clientPoint: L.LatLngExpression = [
      clientCoordinates.latitude,
      clientCoordinates.longitude,
    ];

    if (!technicianCoordinates) {
      if (techMarkerRef.current) {
        techMarkerRef.current.remove();
        techMarkerRef.current = null;
      }
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
        routePolylineRef.current = null;
      }
      return;
    }

    const techPoint: L.LatLngExpression = [
      technicianCoordinates.latitude,
      technicianCoordinates.longitude,
    ];

    const rotation = Math.round(effectiveHeading);

    // Create or update technician marker with directional vehicle navigation arrow
    const techIcon = L.divIcon({
      className: 'sos-technician-vehicle-marker',
      html: `
        <div style="transform: rotate(${rotation}deg); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);" class="relative flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 border-2 border-white shadow-2xl text-white">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    if (!techMarkerRef.current) {
      const marker = L.marker(techPoint, { icon: techIcon }).addTo(map);
      marker.bindTooltip(
        `<strong>${technician?.name || 'Technician'}</strong><br/>En route to your location`,
        { direction: 'top', offset: [0, -20] }
      );
      techMarkerRef.current = marker;
    } else {
      techMarkerRef.current.setLatLng(techPoint);
      techMarkerRef.current.setIcon(techIcon);
    }

    // Dynamic dashed blue polyline connecting technician and client
    if (!routePolylineRef.current) {
      routePolylineRef.current = L.polyline([techPoint, clientPoint], {
        color: '#2563eb',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
      }).addTo(map);
    } else {
      routePolylineRef.current.setLatLngs([techPoint, clientPoint]);
    }

    // Auto-Fit Bounds to keep both in view
    try {
      map.fitBounds(L.latLngBounds([clientPoint, techPoint]), {
        padding: [50, 50],
        maxZoom: 16,
      });
    } catch {
      // ignore fitBounds calculation errors
    }
  }, [
    clientCoordinates.latitude,
    clientCoordinates.longitude,
    technicianCoordinates?.latitude,
    technicianCoordinates?.longitude,
    effectiveHeading,
    technician?.name,
  ]);

  // Clean phone number for tel: and WhatsApp
  const cleanPhone = useMemo(() => {
    return technician?.phone ? technician.phone.replace(/[^0-9+]/g, '') : '+919876543210';
  }, [technician?.phone]);

  const waPhone = useMemo(() => {
    return cleanPhone.replace(/[^0-9]/g, '');
  }, [cleanPhone]);

  const waMessage = useMemo(() => {
    const techName = technician?.name || 'Technician';
    const reqText = requestId ? `Request #${requestId.slice(0, 8)}` : 'SOS Emergency Request';
    const addr = serviceAddress ? ` at ${serviceAddress}` : '';
    return `Hi ${techName}, reaching out regarding my ${reqText}${addr}.`;
  }, [technician?.name, requestId, serviceAddress]);

  const etaLabel = etaMinutes && etaMinutes > 0 ? `${etaMinutes} min` : '5-10 min';
  const distanceLabel = roadDistanceKm ? `${roadDistanceKm.toFixed(1)} km away` : 'Approaching';

  return (
    <div className={`relative w-full overflow-hidden ${heightClass} ${className}`}>
      {/* Leaflet Map Canvas */}
      <div ref={mapElement} className="h-full w-full" />

      {/* Watermark */}
      <div className="absolute top-3 left-3 z-[400] bg-white/90 backdrop-blur-md rounded-lg px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm border border-gray-100 flex items-center gap-1.5 pointer-events-none">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        Live GPS Tracking · OpenStreetMap
      </div>

      {/* Floating Service Card Overlay (When enabled) */}
      {showOverlay && technician && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] max-w-md mx-auto rounded-2xl bg-white/95 backdrop-blur-md p-4 shadow-2xl border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={technician.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&auto=format'}
              alt={technician.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/20 shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-display font-700 text-gray-900 text-sm truncate">{technician.name}</p>
                <span className="text-xs text-amber-500 font-bold">★ {technician.rating || 4.9}</span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {technician.vehicle || 'Cooperative Technician'} · Verified
              </p>
            </div>
            <div className="text-right">
              <span className="font-display font-800 text-lg text-blue-600 block">{etaLabel}</span>
              <span className="text-[10px] text-gray-400 font-medium">{distanceLabel}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {onChat && (
              <button
                type="button"
                onClick={onChat}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition-colors"
              >
                <span>💬</span> Chat
              </button>
            )}
            <a
              href={`tel:${cleanPhone}`}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs transition-colors text-center"
            >
              <span>📞</span> Call
            </a>
            <a
              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-xs transition-colors text-center shadow-sm"
            >
              <span>🟢</span> WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientLiveTrackingMap;
