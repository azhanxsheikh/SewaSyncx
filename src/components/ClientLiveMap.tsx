import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface ClientLiveMapProps {
  clientCoordinates: { latitude: number; longitude: number; accuracy?: number };
  technicianCoordinates?: { latitude: number; longitude: number } | null;
  bearing?: number;
  etaMinutes?: number;
  roadDistanceKm?: number;
  serviceAddress?: string;
  className?: string;
  heightClass?: string;
  onMapReady?: (map: L.Map) => void;
}

export function ClientLiveMap({
  clientCoordinates,
  technicianCoordinates,
  bearing = 0,
  etaMinutes,
  roadDistanceKm,
  serviceAddress,
  className = '',
  heightClass = 'h-full min-h-[300px]',
  onMapReady,
}: ClientLiveMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clientMarkerRef = useRef<L.Marker | null>(null);
  const techMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;

    const initialPoint: L.LatLngExpression = [
      clientCoordinates.latitude,
      clientCoordinates.longitude,
    ];

    const map = L.map(mapElement.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(initialPoint, 15);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Client Marker
    const clientIcon = L.divIcon({
      className: 'sos-leaflet-marker',
      html: '<span class="relative flex h-6 w-6"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-6 w-6 bg-red-600 border-2 border-white shadow-md"></span></span>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const clientMarker = L.marker(initialPoint, { icon: clientIcon }).addTo(map);
    if (serviceAddress) {
      clientMarker.bindTooltip(serviceAddress, { direction: 'top', offset: [0, -12] });
    }
    clientMarkerRef.current = clientMarker;

    mapRef.current = map;
    onMapReady?.(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Client position
  useEffect(() => {
    if (!mapRef.current || !clientMarkerRef.current) return;
    const point: L.LatLngExpression = [
      clientCoordinates.latitude,
      clientCoordinates.longitude,
    ];
    clientMarkerRef.current.setLatLng(point);
  }, [clientCoordinates.latitude, clientCoordinates.longitude]);

  // Update Technician position, rotation, and polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

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
    const clientPoint: L.LatLngExpression = [
      clientCoordinates.latitude,
      clientCoordinates.longitude,
    ];

    // Technician Marker with rotational bearing
    const techHtml = `
      <div style="transform: rotate(${Math.round(bearing)}deg); transition: transform 0.3s ease;" class="relative flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg text-white">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
        </svg>
      </div>
    `;

    const techIcon = L.divIcon({
      className: 'technician-live-marker',
      html: techHtml,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (!techMarkerRef.current) {
      techMarkerRef.current = L.marker(techPoint, { icon: techIcon }).addTo(map);
    } else {
      techMarkerRef.current.setLatLng(techPoint);
      techMarkerRef.current.setIcon(techIcon);
    }

    const tooltipContent = etaMinutes !== undefined
      ? `Technician (${etaMinutes} min away · ${roadDistanceKm ?? ''} km)`
      : 'Technician on the way';
    techMarkerRef.current.bindTooltip(tooltipContent, { direction: 'top', offset: [0, -16] });

    // Polyline Route
    if (!routePolylineRef.current) {
      routePolylineRef.current = L.polyline([techPoint, clientPoint], {
        color: '#2563eb',
        dashArray: '8, 6',
        weight: 4,
        opacity: 0.85,
      }).addTo(map);
    } else {
      routePolylineRef.current.setLatLngs([techPoint, clientPoint]);
    }

    // Auto fit bounds to include both points
    const bounds = L.latLngBounds([clientPoint, techPoint]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [
    technicianCoordinates?.latitude,
    technicianCoordinates?.longitude,
    clientCoordinates.latitude,
    clientCoordinates.longitude,
    bearing,
    etaMinutes,
    roadDistanceKm,
  ]);

  return (
    <div className={`relative w-full ${heightClass} ${className}`}>
      <div ref={mapElement} className="absolute inset-0 z-0" />
      {etaMinutes !== undefined && (
        <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none flex justify-center">
          <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-gray-100 flex items-center gap-3 text-xs font-600 text-gray-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ETA: {etaMinutes} min</span>
            {roadDistanceKm !== undefined && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-500">{roadDistanceKm} km road distance</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientLiveMap;
