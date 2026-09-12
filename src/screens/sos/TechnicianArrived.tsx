import { useEffect } from 'react';
import type { Screen } from '../../types/navigation';
import { usePrimaryTechnician } from '../../hooks/useTechnicians';
import { useDispatch } from '../../context/DispatchContext';

interface Props {
  navigate: (s: Screen) => void;
}

export default function TechnicianArrived({ navigate }: Props) {
  const { job, updateJobStatus } = useDispatch();
  const tech = usePrimaryTechnician();

  useEffect(() => {
    if (job?.status === 'in-progress') navigate('sos-inprogress');
    if (job?.status === 'completed') navigate('sos-rating');
  }, [job?.status, navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      {/* Arrived animation */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-emerald-500 opacity-10 scale-150 animate-ping" />
        <div className="w-28 h-28 rounded-full bg-emerald-50 border-4 border-emerald-400 flex items-center justify-center">
          <span className="text-5xl">🚪</span>
        </div>
      </div>

      <h2 className="font-display font-800 text-2xl text-gray-900 text-center mb-2">
        Your technician has arrived!
      </h2>
      <p className="text-gray-500 text-sm text-center mb-8">
        Rahul Kumar is at your door. Please verify his identity before starting.
      </p>

      {/* Technician identity card */}
      <div className="w-full max-w-xs bg-white border-2 border-emerald-200 rounded-2xl p-5 shadow-md shadow-emerald-50 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <img src={tech.photo} alt={tech.name} className="w-16 h-16 rounded-full object-cover ring-4 ring-emerald-100" />
          <div>
            <h3 className="font-display font-700 text-gray-900">{tech.name}</h3>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <span className="text-amber-400">★</span>
              <span>{tech.rating}</span>
              <span>·</span>
              <span>{tech.jobs.toLocaleString('en-IN')} jobs</span>
            </div>
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-600 px-2 py-0.5 rounded-full mt-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Verified Professional
            </span>
          </div>
        </div>

        <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
          <div className="flex justify-between">
            <span className="text-gray-500">Service</span>
            <span className="font-600 text-gray-900">Electrical Repair</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Vehicle</span>
            <span className="font-600 text-gray-900 text-xs">{tech.vehicle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Job ID</span>
            <span className="font-600 text-gray-900">#SH-2094</span>
          </div>
        </div>

        <div className="mt-4 bg-blue-50 rounded-xl p-3">
          <p className="text-xs text-blue-700 font-500">
            💡 Tip: Match the profile photo above with the person at your door before allowing entry.
          </p>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={() => { updateJobStatus('IN_PROGRESS'); navigate('sos-inprogress'); }}
          className="w-full py-4 rounded-xl font-display font-700 bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-md shadow-emerald-200"
        >
          ✓ Verified — Start Service
        </button>
        <button
          onClick={() => navigate('sos-chat')}
          className="w-full py-3.5 rounded-xl font-600 text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Chat with Technician
        </button>
      </div>
    </div>
  );
}
