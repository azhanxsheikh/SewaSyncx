import { useEffect, useState } from 'react';
import type { Screen } from '../../data/mockData';
import MapView from '../../components/MapView';
import { useDispatch } from '../../context/DispatchContext';

interface Props {
  navigate: (s: Screen) => void;
}

export default function FindingTechnician({ navigate }: Props) {
  const { job, setStatus } = useDispatch();
  const activeRequest = job;
  const [elapsed, setElapsed] = useState(0);
  const [techProgress, setTechProgress] = useState(0);

  useEffect(() => {
    if (job?.status === 'requested') setStatus('searching');
    const interval = setInterval(() => {
      setElapsed(e => e + 1);
      setTechProgress(p => Math.min(p + 0.04, 0.45));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeRequest?.status === 'accepted' || activeRequest?.status === 'en-route') {
      try {
        navigate('sos-assigned');
      } catch (error) {
        console.error('Unable to open assigned technician screen', error);
      }
    }
  }, [activeRequest?.status, navigate]);

  const dots = Math.floor(elapsed % 4);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Full-screen map */}
      <div className="relative flex-1">
        <MapView height="h-full" className="rounded-none h-full" showRoute={false} showTechnician techProgress={techProgress} />

        {/* Header overlay */}
        <div className="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-display font-800 text-xs">SH</span>
              </div>
              <span className="font-display font-700 text-gray-900 text-sm">SOS HomeFix</span>
            </div>
            <span className="text-xs text-red-500 font-600 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              Emergency Active
            </span>
          </div>
        </div>

        {/* Bottom sheet */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="bg-white rounded-t-3xl shadow-xl px-5 pt-5 pb-8">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

            <div className="max-w-md mx-auto">
              <div className="text-center mb-5">
                <h2 className="font-display font-800 text-xl text-gray-900">
                  Finding your technician{'.'.repeat(dots + 1)}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Matching based on distance, skill, availability & rating
                </p>
              </div>

              {/* Animated matching cards */}
              <div className="space-y-2 mb-5">
                {[
                  { icon: '📍', label: 'Locating nearby technicians', done: elapsed > 1 },
                  { icon: '⭐', label: 'Verifying credentials & ratings', done: elapsed > 3 },
                  { icon: '⚡', label: 'Sending emergency dispatch request', done: elapsed > 5 },
                ].map((step, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${step.done ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                    <span className="text-base">{step.icon}</span>
                    <span className={`text-sm flex-1 ${step.done ? 'text-emerald-700 font-500' : 'text-gray-500'}`}>{step.label}</span>
                    {step.done ? (
                      <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full animate-spin border-t-transparent flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-blue-700 text-sm font-600">⏱ {job?.status === 'accepted' ? 'Technician accepted your request' : 'Usually less than 60 seconds'}</p>
                <p className="text-blue-500 text-xs mt-0.5">3 technicians found in your area</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
