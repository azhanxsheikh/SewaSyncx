import { useState } from 'react';
import type { Screen } from '../../types/navigation';
import { usePrimaryTechnician } from '../../hooks/useTechnicians';
import { additionalWorkRequest } from '../../fixtures/billing.fixture';

interface Props {
  navigate: (s: Screen) => void;
  onBack: () => void;
}

export default function AdditionalCost({ navigate, onBack }: Props) {
  const tech = usePrimaryTechnician();
  const [approving, setApproving] = useState(false);

  const handleApprove = () => {
    setApproving(true);
    setTimeout(() => navigate('sos-completed'), 2000);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-amber-500 px-4 pt-4 pb-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={onBack} className="p-2 rounded-xl bg-amber-400/50 hover:bg-amber-400 transition-colors">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-amber-100 text-xs font-500">Action required</p>
              <h2 className="font-display font-800 text-white text-lg">Additional work required</h2>
            </div>
          </div>

          <div className="bg-white/20 rounded-xl p-3 flex items-center gap-3">
            <img src={tech.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
            <p className="text-white text-sm font-500">Rahul Kumar has sent an approval request</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pt-5 pb-24 max-w-md mx-auto w-full">
        {/* Reason */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-5">
          <p className="text-xs text-gray-500 font-500 mb-1">Reason for additional charge</p>
          <p className="text-gray-900 text-sm leading-relaxed">
            {additionalWorkRequest.reason}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {additionalWorkRequest.tags.map((tag) => (
              <span key={tag} className="bg-white border border-gray-200 text-xs text-gray-600 px-2 py-1 rounded-full">{tag}</span>
            ))}
          </div>
        </div>

        {/* Pricing breakdown */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-5 mb-5">
          <p className="font-display font-700 text-gray-900 mb-4">Updated price breakdown</p>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Original estimate</span>
              <span className="font-600 text-gray-900">₹648</span>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-600 text-gray-900">MCB replacement (×2)</p>
                <p className="text-xs text-gray-400">Parts + installation</p>
              </div>
              <span className="font-600 text-amber-600">+₹350</span>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between items-center pt-1">
              <span className="font-display font-700 text-gray-900">New total</span>
              <span className="font-display font-800 text-2xl text-gray-900">₹998</span>
            </div>
          </div>
        </div>

        {/* Policy note */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 mb-6">
          <span className="text-blue-500 text-base flex-shrink-0">🔒</span>
          <p className="text-blue-800 text-xs leading-relaxed">
            Your approval is required before any additional charges. Declining will continue the service at the original estimate.
          </p>
        </div>
      </div>

      {/* Fixed actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto space-y-2">
          {approving ? (
            <div className="w-full py-4 rounded-xl bg-emerald-500 text-white font-display font-700 text-base flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Approving...
            </div>
          ) : (
            <>
              <button
                onClick={handleApprove}
                className="w-full py-4 rounded-xl font-display font-700 text-base bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-200 active:scale-[0.98] transition-all"
              >
                ✓ Approve — Pay ₹998
              </button>
              <button
                onClick={() => navigate('sos-chat')}
                className="w-full py-3.5 rounded-xl font-600 text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Decline — Chat with Rahul
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
