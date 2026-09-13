import type { Screen } from '../types/navigation';
import {
  homeScheduledShortcuts,
  howItWorksSteps,
  platformFeatures,
} from '../fixtures/content.fixture';
import { useServiceCategories } from '../hooks/useServiceCatalog';
import { useClientProfile, useFamilyMembers, useUnreadNotificationsCount } from '../hooks/useAccount';
import { useRecentRequests } from '../hooks/useRequests';
import BottomNav from '../components/BottomNav';

interface HomeProps {
  navigate: (s: Screen) => void;
}

export default function Home({ navigate }: HomeProps) {
  const profile = useClientProfile();
  const serviceCategories = useServiceCategories();
  const familyMembers = useFamilyMembers();
  const recentBookings = useRecentRequests(2);
  const unreadCount = useUnreadNotificationsCount();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto flex items-center px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center shadow-sm shadow-red-200">
              <span className="text-white font-display font-800 text-xs">SH</span>
            </div>
            <span className="font-display font-700 text-gray-900 text-base">
              SOS <span className="text-red-500">HomeFix</span>
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => navigate('notifications')}
              className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => navigate('profile')}
              className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"
            >
              <span className="text-blue-700 font-display font-700 text-sm">A</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 space-y-5 pt-4">
        {/* Greeting */}
        <div>
          <p className="text-sm text-gray-500">Good afternoon,</p>
          <h1 className="font-display font-800 text-2xl text-gray-900">{profile.greetingName} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {profile.areaLabel}
          </p>
        </div>

        {/* SOS Emergency Card */}
        <div className="bg-red-500 rounded-2xl p-5 shadow-lg shadow-red-200/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-400/30 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-red-100 text-sm font-500">Need help right now?</p>
                <h2 className="font-display font-800 text-white text-xl mt-0.5 leading-tight">
                  Request Emergency<br />Help Instantly
                </h2>
                <p className="text-red-100 text-xs mt-1.5">
                  Verified professional at your door in minutes
                </p>
              </div>
              <div className="text-4xl mt-1">🚨</div>
            </div>

            <button
              onClick={() => navigate('sos-service')}
              className="mt-4 w-full bg-white text-red-600 font-display font-700 py-3 rounded-xl text-sm shadow-sm hover:bg-red-50 transition-colors active:scale-95 sos-pulse"
            >
              REQUEST SOS NOW
            </button>
          </div>
        </div>

        {/* Active booking if any */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-lg">❄️</div>
              <div>
                <p className="font-display font-600 text-gray-900 text-sm">AC Service booked</p>
                <p className="text-xs text-gray-500">Tomorrow · 10:00 AM · Amit Singh</p>
              </div>
            </div>
            <button
              onClick={() => navigate('bookings')}
              className="text-blue-600 text-xs font-600 bg-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Track
            </button>
          </div>
        </div>

        {/* Service Categories */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-700 text-gray-900">Emergency Services</h2>
            <button
              onClick={() => navigate('sos-service')}
              className="text-red-500 text-sm font-500 hover:text-red-600"
            >
              SOS →
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {serviceCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate('sos-service')}
                className="flex flex-col items-center gap-1.5 bg-white p-3 rounded-2xl border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95 group"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-500 text-gray-700 text-center leading-tight group-hover:text-red-600">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Book a Service */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-700 text-gray-900">Schedule a Service</h2>
            <button
              onClick={() => navigate('scheduled-category')}
              className="text-blue-500 text-sm font-500 hover:text-blue-600"
            >
              View all →
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {homeScheduledShortcuts.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate('scheduled-category')}
                className="flex flex-col items-center gap-1.5 bg-white p-3 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all active:scale-95 group"
              >
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xs font-500 text-gray-700 text-center leading-tight group-hover:text-blue-600">
                  {s.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Family */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-700 text-gray-900">My Family</h2>
            <button onClick={() => navigate('family')} className="text-blue-500 text-sm font-500">Manage →</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {familyMembers.map((m) => (
              <button
                key={m.id}
                onClick={() => navigate('family')}
                className="flex-shrink-0 bg-white border border-gray-100 rounded-2xl p-3 flex flex-col items-center gap-1.5 min-w-[90px] hover:border-blue-200 hover:bg-blue-50 transition-all"
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-xs font-600 text-gray-800">{m.name}</span>
                <span className="text-[10px] text-gray-400">{m.relation}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('family'); }}
                  className="mt-1 text-[10px] text-red-500 font-600 bg-red-50 px-2 py-0.5 rounded-full"
                >
                  SOS
                </button>
              </button>
            ))}
            <button
              onClick={() => navigate('family')}
              className="flex-shrink-0 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-3 flex flex-col items-center gap-1.5 min-w-[90px] text-gray-400 hover:bg-gray-100 transition-all"
            >
              <span className="text-2xl">+</span>
              <span className="text-xs">Add</span>
            </button>
          </div>
        </div>

        {/* Recent Bookings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-700 text-gray-900">Recent Activity</h2>
            <button onClick={() => navigate('bookings')} className="text-blue-500 text-sm font-500">View all →</button>
          </div>
          <div className="space-y-2">
            {recentBookings.map((b) => (
              <button
                key={b.id}
                onClick={() => navigate('bookings')}
                className="w-full bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 hover:border-gray-200 transition-colors text-left"
              >
                <span className="text-2xl">{b.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-600 text-gray-900 text-sm truncate">{b.service}</p>
                  <p className="text-xs text-gray-500">{b.technician} · {b.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-600 text-gray-900 text-sm">{b.amount}</p>
                  <span className={`text-[10px] font-500 px-2 py-0.5 rounded-full ${b.type === 'sos' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    {b.type === 'sos' ? 'SOS' : 'Scheduled'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Why SOS HomeFix */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-display font-700 text-gray-900 mb-4">Why SOS HomeFix?</h2>
          <div className="grid grid-cols-2 gap-3">
            {platformFeatures.map((f) => (
              <div key={f.text} className="flex items-center gap-2">
                <span className="text-base">{f.icon}</span>
                <span className="text-xs text-gray-600 font-500">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h2 className="font-display font-700 text-gray-900 mb-4">How it works</h2>
          <div className="space-y-3">
            {howItWorksSteps.map((step) => (
              <div key={step.n} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-red-50 text-red-500 font-display font-700 text-sm flex items-center justify-center flex-shrink-0">
                  {step.n}
                </div>
                <div>
                  <p className="font-600 text-gray-900 text-sm">{step.t}</p>
                  <p className="text-xs text-gray-500">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav screen="home" navigate={navigate} />
    </div>
  );
}
