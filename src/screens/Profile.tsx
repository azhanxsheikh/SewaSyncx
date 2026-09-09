import type { Screen } from '../data/mockData';
import { savedAddresses } from '../data/mockData';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

interface Props {
  navigate: (s: Screen) => void;
}

export default function Profile({ navigate }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Profile" showNotification onNotification={() => navigate('notifications')} />

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="font-display font-800 text-2xl text-blue-600">A</span>
            </div>
            <div className="flex-1">
              <h2 className="font-display font-800 text-xl text-gray-900">Abdullah Khan</h2>
              <p className="text-sm text-gray-500">+91 99876 54321</p>
              <p className="text-sm text-gray-500">abdullah.khan@gmail.com</p>
            </div>
            <button className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="font-display font-800 text-2xl text-gray-900">12</p>
              <p className="text-xs text-gray-500">Services</p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="font-display font-800 text-2xl text-gray-900">3</p>
              <p className="text-xs text-gray-500">SOS used</p>
            </div>
            <div className="text-center">
              <p className="font-display font-800 text-2xl text-gray-900">4.8</p>
              <p className="text-xs text-gray-500">Avg rating</p>
            </div>
          </div>
        </div>

        {/* Saved Addresses */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <p className="font-display font-700 text-gray-900">Saved Addresses</p>
            <button className="text-blue-600 text-xs font-600 hover:underline">+ Add</button>
          </div>
          {savedAddresses.map((addr, i) => (
            <div key={addr.id} className={`px-4 py-3 flex items-center gap-3 ${i < savedAddresses.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <span className="text-xl">{addr.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-600 text-gray-900 text-sm">{addr.label}</p>
                <p className="text-xs text-gray-500 truncate">{addr.address}</p>
                <p className="text-xs text-gray-400">{addr.area}</p>
              </div>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <p className="px-4 pt-4 pb-2 font-display font-700 text-gray-900">Account</p>
          {[
            { icon: '🔔', label: 'Notifications', desc: 'Push & SMS alerts' },
            { icon: '🔒', label: 'Privacy & Security', desc: 'Data & location settings' },
            { icon: '💳', label: 'Payment Methods', desc: 'UPI, cards, net banking' },
            { icon: '👥', label: 'Family Members', desc: '3 members saved' },
          ].map((item, i) => (
            <button
              key={item.label}
              onClick={() => item.label === 'Family Members' ? navigate('family') : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left ${i < 3 ? 'border-b border-gray-50' : ''}`}
            >
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1">
                <p className="font-600 text-gray-900 text-sm">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Support */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <p className="px-4 pt-4 pb-2 font-display font-700 text-gray-900">Help & Support</p>
          {[
            { icon: '💬', label: 'Contact Support', desc: '24/7 assistance' },
            { icon: '⭐', label: 'Rate the App', desc: 'Share your feedback' },
            { icon: '📜', label: 'Terms & Privacy', desc: 'Legal documents' },
          ].map((item, i) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left ${i < 2 ? 'border-b border-gray-50' : ''}`}
            >
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1">
                <p className="font-600 text-gray-900 text-sm">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Logout */}
        <button className="w-full py-3.5 rounded-2xl border border-red-100 text-red-500 font-600 text-sm hover:bg-red-50 transition-colors">
          Sign Out
        </button>
      </div>

      <BottomNav screen="profile" navigate={navigate} />
    </div>
  );
}
