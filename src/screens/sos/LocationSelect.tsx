import { useCallback, useState } from 'react';
import type { Screen } from '../../data/mockData';
import { savedAddresses } from '../../data/mockData';
import Header, { SOSProgress } from '../../components/Header';
import LeafletLocationMap from '../../components/LeafletLocationMap';
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

  const selectAddress = useCallback((address: typeof savedAddresses[number]) => {
    setSelected(address.id);
    const fullAddress = `${address.address}, ${address.area}`;
    setMapLocation(fullAddress);
    setConfirmedLocation({ id: address.id, label: address.label, fullAddress, area: address.area });
  }, [setConfirmedLocation]);

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
          <LeafletLocationMap initialAddress={mapLocation} onLocationChange={setDraggedLocation} />
        </div>

        <div className="px-4 mt-5">
          <h2 className="font-display font-800 text-xl text-gray-900">Where do you need help?</h2>
          <p className="text-gray-500 text-sm mt-1">We'll dispatch the nearest available technician to this address</p>

          {/* Saved addresses */}
          <div className="mt-4 space-y-2">
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

            {/* Add new address */}
            <button className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-gray-200 text-left hover:border-blue-300 hover:bg-blue-50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="font-600 text-gray-600 text-sm">Use current location</p>
                <p className="text-xs text-gray-400 mt-0.5">Detect automatically via GPS</p>
              </div>
            </button>
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
