import type { Screen } from '../data/mockData';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  onNotification?: () => void;
  showLogo?: boolean;
  showNotification?: boolean;
  transparent?: boolean;
}

export default function Header({ title, onBack, onNotification, showLogo = false, showNotification = true, transparent = false }: HeaderProps) {
  return (
    <header className={`sticky top-0 z-40 ${transparent ? 'bg-transparent' : 'bg-white border-b border-gray-100'} `}>
      <div className="max-w-md mx-auto flex items-center px-4 py-3 gap-3">
        {onBack && (
          <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {showLogo && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-display font-800 text-xs">SH</span>
            </div>
            <span className="font-display font-700 text-gray-900 text-base">
              SOS <span className="text-red-500">HomeFix</span>
            </span>
          </div>
        )}

        {title && (
          <h1 className={`font-display font-700 text-gray-900 text-base flex-1 ${onBack ? '' : ''}`}>
            {title}
          </h1>
        )}

        <div className="ml-auto" />

        {showNotification && onNotification && (
          <button onClick={onNotification} className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        )}
      </div>
    </header>
  );
}

interface SOSProgressProps {
  step: number;
  total: number;
  label: string;
}

export function SOSProgress({ step, total, label }: SOSProgressProps) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-2">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-500 text-gray-500">{label}</span>
          <span className="text-xs text-gray-400">{step}/{total}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-500"
            style={{ width: `${(step / total) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
