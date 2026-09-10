import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  onLocationChange?: (location: string) => void;
  initialAddress?: string;
  activeCoordinates?: { latitude: number; longitude: number; accuracy?: number };
  heightClass?: string;
  className?: string;
  showRoute?: boolean;
  onMapReady?: (map: L.Map) => void;
}

const DEFAULT_LOCATION: L.LatLngExpression = [28.608, 77.437];

export default function LeafletLocationMap({ onLocationChange, initialAddress, activeCoordinates, heightClass = 'h-56 min-h-[250px]', className = '', showRoute = false, onMapReady }: Props) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const [address, setAddress] = useState(initialAddress || 'B-204, Gaur City 2, Greater Noida West');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (initialAddress) setAddress(initialAddress);
  }, [initialAddress]);

  useEffect(() => {
    const coordinates = activeCoordinates;
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!coordinates || !map || !marker) return;
    const point: L.LatLngExpression = [coordinates.latitude, coordinates.longitude];
    map.setView(point, 16);
    marker.setLatLng(point);
    accuracyCircleRef.current?.remove();
    accuracyCircleRef.current = L.circle(point, {
      radius: Math.max(coordinates.accuracy ?? 0, 1),
      color: '#dc2626',
      fillColor: '#dc2626',
      fillOpacity: 0.12,
      weight: 1,
    }).addTo(map);
  }, [activeCoordinates?.accuracy, activeCoordinates?.latitude, activeCoordinates?.longitude]);

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;

    const map = L.map(mapElement.current, { zoomControl: false }).setView(DEFAULT_LOCATION, 14);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const markerIcon = L.divIcon({
      className: 'sos-leaflet-marker',
      html: '<span></span>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
    const marker = L.marker(DEFAULT_LOCATION, { draggable: true, icon: markerIcon }).addTo(map);
    marker.bindTooltip('Drag to set your service location', { direction: 'top', offset: [0, -24] });
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      void reverseGeocode(position.lat, position.lng).then(value => {
        setAddress(value);
        onLocationChange?.(value);
      });
    });
    if (showRoute) {
      L.polyline([DEFAULT_LOCATION, [28.61, 77.45]], { color: '#2563eb', dashArray: '8 6', weight: 4 }).addTo(map);
    }

    mapRef.current = map;
    markerRef.current = marker;
    onMapReady?.(map);
    window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      accuracyCircleRef.current = null;
    };
  }, [onLocationChange, onMapReady, showRoute]);

  const recenter = () => {
    if (!navigator.geolocation || !mapRef.current || !markerRef.current) {
      setAddress('B-204, Gaur City 2, Greater Noida West');
      return;
    }
    if (activeCoordinates) {
      const point: L.LatLngExpression = [activeCoordinates.latitude, activeCoordinates.longitude];
      mapRef.current.setView(point, 16);
      markerRef.current.setLatLng(point);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        const point: L.LatLngExpression = [position.coords.latitude, position.coords.longitude];
        mapRef.current?.setView(point, 16);
        markerRef.current?.setLatLng(point);
        void reverseGeocode(position.coords.latitude, position.coords.longitude).then(value => {
          setAddress(value);
          onLocationChange?.(value);
        }).finally(() => setLocating(false));
      },
      () => {
        setAddress('B-204, Gaur City 2, Greater Noida West');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className={`relative h-full min-h-[250px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 ${className}`}>
      <div ref={mapElement} className={`${heightClass} w-full`} />
      <button type="button" onClick={recenter} className="absolute right-3 top-3 z-[1000] rounded-xl bg-white px-3 py-2 text-xs font-700 text-gray-700 shadow-md hover:bg-gray-50" disabled={locating}>
        {locating ? 'Locating...' : 'Re-center'}
      </button>
      <div className="absolute bottom-3 left-3 right-3 z-[1000] rounded-xl bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm">
        <p className="text-[10px] font-700 uppercase tracking-wide text-gray-400">Service location</p>
        <p className="truncate text-xs font-600 text-gray-800">{address}</p>
      </div>
    </div>
  );
}

export async function reverseGeocode(latitude: number, longitude: number) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
    if (!response.ok) throw new Error('Reverse geocoding failed');
    const data = await response.json() as { display_name?: string };
    return data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  } catch {
    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }
}
