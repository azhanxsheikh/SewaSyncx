import { useState } from 'react';
import type { Screen } from '../../data/mockData';
import Header, { SOSProgress } from '../../components/Header';

interface Props {
  navigate: (s: Screen) => void;
  onBack: () => void;
  setPriority: (p: string) => void;
  selectedService: string;
}

const priorities = [
  {
    id: 'high',
    label: 'HIGH',
    emoji: '🔴',
    title: 'Immediate assistance required',
    description: 'Active water leakage, electrical hazard, locked out, no access to home, or another issue requiring immediate help.',
    eta: 'ETA: 15–30 min',
    bg: 'bg-red-50',
    border: 'border-red-300',
    labelBg: 'bg-red-500',
    labelText: 'text-white',
    etaColor: 'text-red-600',
  },
  {
    id: 'medium',
    label: 'MEDIUM',
    emoji: '🟡',
    title: 'Needs attention soon',
    description: 'AC not cooling, slow drain, door not latching properly, or a problem that is inconvenient but not dangerous.',
    eta: 'ETA: 30–60 min',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    labelBg: 'bg-amber-500',
    labelText: 'text-white',
    etaColor: 'text-amber-600',
  },
  {
    id: 'low',
    label: 'LOW',
    emoji: '🟢',
    title: 'Can wait a little while',
    description: 'Minor repair, cosmetic issue, or something that is not causing immediate disruption or risk.',
    eta: 'ETA: 1–2 hrs',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    labelBg: 'bg-emerald-500',
    labelText: 'text-white',
    etaColor: 'text-emerald-600',
  },
];

export default function PriorityTriage({ navigate, onBack, setPriority, selectedService }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    if (selected) {
      setPriority(selected);
      navigate('sos-location');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title="Emergency SOS" onBack={onBack} showNotification={false} />
      <SOSProgress step={2} total={7} label="Select priority" />

      <div className="flex-1 px-4 pt-6 pb-24 max-w-md mx-auto w-full">
        <div className="mb-6">
          <h2 className="font-display font-800 text-2xl text-gray-900">How urgent is this?</h2>
          <p className="text-gray-500 text-sm mt-1">This helps us dispatch the right technician quickly</p>
        </div>

        <div className="space-y-3">
          {priorities.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all duration-200 active:scale-95 ${
                selected === p.id
                  ? `${p.bg} ${p.border} shadow-sm`
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selected === p.id ? `${p.border} bg-white` : 'border-gray-300'
                  }`}>
                    {selected === p.id && (
                      <div className={`w-2.5 h-2.5 rounded-full ${p.labelBg}`} />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-700 ${p.labelText} ${p.labelBg} px-2 py-0.5 rounded-full`}>
                      {p.label}
                    </span>
                    <span className="text-base">{p.emoji}</span>
                  </div>
                  <p className="font-display font-700 text-gray-900 text-sm">{p.title}</p>
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">{p.description}</p>
                  <p className={`text-xs font-600 mt-2 ${p.etaColor}`}>{p.eta}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-gray-700 text-xs font-500 flex items-center gap-2">
            <span>⛑️</span>
            <span>Do not attempt dangerous repairs yourself. Our technicians are trained and equipped for emergencies.</span>
          </p>
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleContinue}
            disabled={!selected}
            className={`w-full py-4 rounded-xl font-display font-700 text-base transition-all duration-200 ${
              selected
                ? 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200 active:scale-[0.98]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
