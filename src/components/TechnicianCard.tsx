import type { Technician } from '../types/domain';

interface TechnicianCardProps {
  tech: Technician;
  onChat?: () => void;
  onCall?: () => void;
  compact?: boolean;
}

export default function TechnicianCard({ tech, onChat, onCall, compact = false }: TechnicianCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <img
            src={tech.photo}
            alt={tech.name}
            className={`${compact ? 'w-14 h-14' : 'w-16 h-16'} rounded-full object-cover ring-2 ring-emerald-500/20`}
          />
          <span className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full w-4 h-4 border-2 border-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-700 text-gray-900 text-base">{tech.name}</h3>
            {tech.verified && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-600 px-2 py-0.5 rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-amber-400 text-sm">★</span>
            <span className="text-sm font-600 text-gray-900">{tech.rating}</span>
            <span className="text-gray-400 text-xs">· {tech.jobs.toLocaleString('en-IN')} jobs</span>
          </div>

          <p className="text-gray-500 text-xs mt-0.5">{tech.category} · {tech.experience} exp.</p>

          {!compact && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tech.identityVerified && (
                <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>✓</span> ID Verified
                </span>
              )}
              {tech.skillVerified && (
                <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>✓</span> Skill Verified
                </span>
              )}
              {tech.backgroundChecked && (
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>✓</span> Background Checked
                </span>
              )}
            </div>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-lg font-display font-700 text-blue-600">{tech.eta}</div>
          <div className="text-xs text-gray-400">{tech.distance}</div>
        </div>
      </div>

      {(onChat || onCall) && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50">
          {onChat && (
            <button
              onClick={onChat}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 text-blue-700 text-sm font-600 hover:bg-blue-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat
            </button>
          )}
          {onCall && (
            <button
              onClick={onCall}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-600 hover:bg-emerald-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call
            </button>
          )}
        </div>
      )}
    </div>
  );
}
