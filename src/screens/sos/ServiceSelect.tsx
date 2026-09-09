import { useState } from 'react';
import type { Screen } from '../../data/mockData';
import { serviceCategories } from '../../data/mockData';
import Header, { SOSProgress } from '../../components/Header';

interface Props {
  navigate: (s: Screen) => void;
  onBack: () => void;
  setSelectedService: (s: string) => void;
}

export default function ServiceSelect({ navigate, onBack, setSelectedService }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedService(id);
    navigate('sos-priority');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title="Emergency SOS" onBack={onBack} showNotification={false} />
      <SOSProgress step={1} total={7} label="Select service" />

      <div className="flex-1 px-4 pt-6 pb-8 max-w-md mx-auto w-full">
        <div className="mb-6">
          <h2 className="font-display font-800 text-2xl text-gray-900">What's happening?</h2>
          <p className="text-gray-500 text-sm mt-1">Select the type of emergency for faster dispatch</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {serviceCategories.map((cat) => {
            const isHovered = hovered === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleSelect(cat.id)}
                onMouseEnter={() => setHovered(cat.id)}
                onMouseLeave={() => setHovered(null)}
                className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 active:scale-95 ${
                  isHovered
                    ? 'border-red-400 bg-red-50 shadow-sm shadow-red-100'
                    : 'border-gray-100 bg-white hover:border-red-200'
                }`}
              >
                <span className="text-3xl block mb-2">{cat.icon}</span>
                <p className="font-display font-700 text-gray-900 text-sm">{cat.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">{cat.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400">From ₹{cat.basePrice}</span>
                  <span className="text-xs text-red-500 font-500">→</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
          <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
          <div>
            <p className="text-amber-800 text-sm font-600">Safety first</p>
            <p className="text-amber-700 text-xs mt-0.5">
              If you smell gas, see smoke, or feel unsafe — leave the area and call emergency services (112) immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
