import { useCallback, useEffect, useRef, useState } from 'react';
import type { Screen } from '../../data/mockData';
import { savedAddresses } from '../../data/mockData';
import Header, { SOSProgress } from '../../components/Header';
import LeafletLocationMap, { reverseGeocode } from '../../components/LeafletLocationMap';
import { useDispatch } from '../../context/DispatchContext';
import type { ConfirmedLocation } from '../../types/dispatch';

interface Props {
  navigate: (s: Screen) => void;
  onBack: () => void;
}

export default function LocationSelect({ navigate, onBack }: Props) {
  const { confirmedLocation, setConfirmedLocation } = useDispatch();
  const [selected, setSelected] = useState('a1');
  const [mapLocation, setMapLocation] = useState(confirmedLocation.fullAddress);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; accuracy?: number; address?: string } | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [locationError, setLocationError] = useState('');
  const watchIdRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  const clearLocationWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => clearLocationWatch, [clearLocationWatch]);

  const updateLiveLocation = useCallback((position: GeolocationPosition, address?: string) => {
    const { latitude, longitude, accuracy } = position.coords;
    const coordinates = { latitude, longitude, accuracy, address };
    setCurrentLocation(previous => ({ ...previous, ...coordinates }));
    setSelected('current-location');
    const fullAddress = address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    setMapLocation(fullAddress);
    setConfirmedLocation({
      id: 'current-location',
      label: 'Current Location',
      fullAddress,
      area: 'Live GPS location',
      latitude,
      longitude,
    });
  }, [setConfirmedLocation]);

  const resolveLiveLocation = useCallback(async (position: GeolocationPosition, requestId: number) => {
    const { latitude, longitude } = position.coords;
    const address = await reverseGeocode(latitude, longitude);
    if (requestId === requestIdRef.current) updateLiveLocation(position, address);
  }, [updateLiveLocation]);

  const locateCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) return;
    clearLocationWatch();
    const requestId = ++requestIdRef.current;
    setLocationState('loading');
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      position => {
        if (requestId !== requestIdRef.current) return;
        setLocationState('idle');
        void resolveLiveLocation(position, requestId);
        watchIdRef.current = navigator.geolocation.watchPosition(
          nextPosition => {
            if (requestId === requestIdRef.current) updateLiveLocation(nextPosition);
          },
          () => undefined,
          { enableHighAccuracy: true, maximumAge: 0 },
        );
      },
      error => {
        if (requestId !== requestIdRef.current) return;
        setLocationState('error');
        setLocationError(error.code === 1
          ? 'Location access denied - enable it in browser/app settings'
          : "Couldn't get your location, try again");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [clearLocationWatch, resolveLiveLocation, updateLiveLocation]);

  const selectAddress = useCallback((address: typeof savedAddresses[number]) => {
    clearLocationWatch();
    ++requestIdRef.current;
    setLocationState('idle');
    setLocationError('');
    setSelected(address.id);
    const fullAddress = `${address.address}, ${address.area}`;
    setMapLocation(fullAddress);
    setConfirmedLocation({ id: address.id, label: address.label, fullAddress, area: address.area });
  }, [clearLocationWatch, setConfirmedLocation]);

  const setDraggedLocation = useCallback((fullAddress: string) => {
    setMapLocation(fullAddress);
    const location: ConfirmedLocation = { ...confirmedLocation, id: 'map-pin', label: 'Pinned location', fullAddress };
    setConfirmedLocation(location);
  }, [confirmedLocation, setConfirmedLocation]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title="Emergency SOS" onBack={onBack} showNotification={false} />
      <SOSProgress step={3} total={7} label="Confirm location" />

      <div className="flex-1 pb-28 max-w-md mx-auto w-full">
        {/* Map */}
        <div className="mx-4 mt-4">
          <LeafletLocationMap initialAddress={mapLocation} activeCoordinates={selected === 'current-location' ? currentLocation ?? undefined : undefined} onLocationChange={setDraggedLocation} />
        </div>

        <div className="px-4 mt-5">
          <h2 className="font-display font-800 text-xl text-gray-900">Where do you need help?</h2>
          <p className="text-gray-500 text-sm mt-1">We'll dispatch the nearest available technician to this address</p>

          {/* Saved addresses */}
          <div className="mt-4 space-y-2">
            {'geolocation' in navigator && (
              <button
                onClick={locateCurrentPosition}
                disabled={locationState === 'loading'}
                className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  selected === 'current-location'
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selected === 'current-location' ? 'bg-red-100' : 'bg-gray-100'}`}>
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" strokeWidth="2" />
                    <path strokeLinecap="round" strokeWidth="2" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-display font-700 text-gray-900 text-sm">Current Location</p>
                    {selected === 'current-location' && (
                      <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293z" clipRule="evenodd" /></svg>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {locationState === 'loading' ? 'Locating...' : locationError || currentLocation?.address || 'Tap to use your live GPS location'}
                  </p>
                  {selected === 'current-location' && !locationError && <p className="text-xs text-gray-400">Live GPS location</p>}
                </div>
              </button>
            )}
            {savedAddresses.map((addr) => (
              <button
                key={addr.id}
                onClick={() => selectAddress(addr)}
                className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                  selected === addr.id
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                  selected === addr.id ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  {addr.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-display font-700 text-gray-900 text-sm">{addr.label}</p>
                    {selected === addr.id && (
                      <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{selected === addr.id ? mapLocation : `${addr.address}, ${addr.area}`}</p>
                  <p className="text-xs text-gray-400">{addr.area}</p>
                </div>
              </button>
            ))}

          </div>

          {/* Privacy notice */}
          <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p>Your location is shared only with the technician assigned to this request.</p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => navigate('sos-photo')}
            className="w-full py-4 rounded-xl font-display font-700 text-base bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200 active:scale-[0.98] transition-all"
          >
            Use This Location →
          </button>
        </div>
      </div>
    </div>
  );
}
