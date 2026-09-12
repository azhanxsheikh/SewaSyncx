import { useState } from 'react';
import type { Screen } from '../../types/navigation';
import type { ServiceCategory } from '../../types/domain';
import { useServiceCategory } from '../../hooks/useServiceCatalog';
import Header, { SOSProgress } from '../../components/Header';

interface Props {
  navigate: (s: Screen) => void;
  onBack: () => void;
  selectedService: string;
  priority: string;
}

export default function Pricing({ navigate, onBack, selectedService, priority }: Props) {
  const [expanded, setExpanded] = useState(false);

  const cat: ServiceCategory = useServiceCategory(selectedService);
  const priorityMultiplier = priority === 'high' ? 1.3 : priority === 'medium' ? 1.1 : 1.0;
  const basePrice = cat.basePrice;
  const emergencyFee = cat.emergencyFee;
  const taxes = Math.round((basePrice + emergencyFee) * 0.05);
  const total = basePrice + emergencyFee + taxes;

  const priorityLabel: Record<string, string> = { high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };
  const priorityColor: Record<string, string> = { high: 'text-red-600 bg-red-50', medium: 'text-amber-600 bg-amber-50', low: 'text-emerald-600 bg-emerald-50' };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title="Emergency SOS" onBack={onBack} showNotification={false} />
      <SOSProgress step={6} total={7} label="Review pricing" />

      <div className="flex-1 px-4 pt-6 pb-28 max-w-md mx-auto w-full">
        <div className="mb-6">
          <h2 className="font-display font-800 text-xl text-gray-900">Estimated emergency cost</h2>
          <p className="text-gray-500 text-sm mt-1">Transparent pricing before you confirm</p>
        </div>

        {/* Summary card */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 mb-4">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <span className="text-3xl">{cat.icon}</span>
            <div>
              <p className="font-display font-700 text-gray-900">{cat.name} Emergency</p>
              <span className={`text-xs font-700 px-2 py-0.5 rounded-full ${priorityColor[priority] || priorityColor.medium}`}>
                {priorityLabel[priority] || 'MEDIUM'} PRIORITY
              </span>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Technician service fee</span>
              <span className="font-600 text-gray-900">₹{basePrice}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-600">Emergency dispatch fee</span>
                <p className="text-xs text-gray-400">Priority routing & faster dispatch</p>
              </div>
              <span className="font-600 text-gray-900">₹{emergencyFee}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Taxes & platform fee (5%)</span>
              <span className="font-600 text-gray-900">₹{taxes}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <span className="font-display font-700 text-gray-900">Estimated total</span>
              <span className="font-display font-800 text-2xl text-gray-900">₹{total}</span>
            </div>
          </div>

          {/* Expand details */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 w-full flex items-center justify-center gap-2 text-blue-600 text-sm font-500 py-2 hover:bg-blue-50 rounded-xl transition-colors"
          >
            {expanded ? 'Hide details' : 'View full pricing breakdown'}
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-500 fade-in">
              <p>• Service fee covers technician labour (1 hour)</p>
              <p>• Emergency fee enables priority dispatch within 30 min</p>
              <p>• Parts & materials are extra and listed before billing</p>
              <p>• GST @ 18% included in platform fee</p>
              <p>• No cancellation fee if cancelled before assignment</p>
            </div>
          )}
        </div>

        {/* Estimate notice */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
          <span className="text-amber-500 text-base flex-shrink-0">ℹ️</span>
          <p className="text-amber-800 text-xs leading-relaxed">
            Final cost may change if additional parts or work is required. You will be shown an updated total and asked for your approval before any extra charges are made.
          </p>
        </div>

        {/* Payment method */}
        <div className="mt-4 bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-lg">💳</div>
          <div className="flex-1">
            <p className="font-600 text-gray-900 text-sm">Pay after service</p>
            <p className="text-xs text-gray-500">Cash · UPI · Card · Net Banking</p>
          </div>
          <button className="text-blue-600 text-xs font-600 hover:underline">Change</button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto space-y-2">
          <button
            onClick={() => navigate('sos-confirmation')}
            className="w-full py-4 rounded-xl font-display font-700 text-base bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span>🚨</span>
            Confirm Emergency Request — ₹{total}
          </button>
          <button onClick={onBack} className="w-full text-gray-400 text-sm py-2">
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
