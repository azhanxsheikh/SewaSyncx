import type { Screen } from '../types/navigation';

interface BottomNavProps {
  screen: Screen;
  navigate: (s: Screen) => void;
}

const tabs = [
  {
    id: 'home',
    label: 'Home',
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    screen: 'home' as Screen,
  },
  {
    id: 'bookings',
    label: 'Bookings',
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    screen: 'bookings' as Screen,
  },
  {
    id: 'sos',
    label: '',
    icon: () => (
      <div className="relative -mt-6">
        <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/40 sos-pulse">
          <span className="text-white font-display font-800 text-xs tracking-wider">SOS</span>
        </div>
      </div>
    ),
    screen: 'sos-service' as Screen,
  },
  {
    id: 'family',
    label: 'Family',
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    screen: 'family' as Screen,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    screen: 'profile' as Screen,
  },
];

const activeScreens: Record<string, string> = {
  home: 'home',
  bookings: 'bookings',
  family: 'family',
  'family-member': 'family',
  profile: 'profile',
};

export default function BottomNav({ screen, navigate }: BottomNavProps) {
  const activeTab = activeScreens[screen] || '';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-area-pb">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-2 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.screen)}
            className="flex flex-col items-center gap-1 px-3 py-1 min-w-0"
          >
            {tab.icon(activeTab === tab.id)}
            {tab.label && (
              <span className={`text-[10px] font-500 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
