import { useState } from 'react';
import type { Screen } from '../types/navigation';
import { bookingFilterTabs as tabs } from '../fixtures/requests.fixture';
import { useFilteredRequests } from '../hooks/useRequests';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

interface Props {
  navigate: (s: Screen) => void;
}

export default function BookingHistory({ navigate }: Props) {
  const [activeTab, setActiveTab] = useState('All');
  const filtered = useFilteredRequests(activeTab);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header
        title="My Bookings"
        showNotification
        onNotification={() => navigate('notifications')}
      />

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-[57px] z-30">
        <div className="max-w-md mx-auto flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-500 transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white font-600'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-display font-700 text-gray-900">No bookings found</p>
            <p className="text-gray-500 text-sm mt-1">Your bookings will appear here</p>
          </div>
        ) : (
          filtered.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                  b.type === 'sos' ? 'bg-red-50' : 'bg-blue-50'
                }`}>
                  {b.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-700 text-gray-900 text-sm">{b.service}</p>
                    <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full ${
                      b.type === 'sos' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {b.type === 'sos' ? 'SOS' : 'Scheduled'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{b.technician}</p>
                  <p className="text-xs text-gray-400">{b.date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-display font-700 text-gray-900">{b.amount}</p>
                  <span className={`text-xs font-500 ${
                    b.status === 'Completed' ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {b.status}
                  </span>
                </div>
              </div>

              {b.rating > 0 && (
                <div className="flex items-center gap-1 mb-3">
                  {[1,2,3,4,5].map(s => (
                    <span key={s} className={`text-sm ${s <= b.rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                  ))}
                  <span className="text-xs text-gray-400 ml-1">Your rating</span>
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-gray-50">
                {b.status === 'Completed' ? (
                  <>
                    <button
                      onClick={() => navigate('sos-invoice')}
                      className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-600 text-sm hover:bg-blue-100 transition-colors"
                    >
                      View Bill
                    </button>
                    <button
                      onClick={() => navigate('sos-service')}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-600 text-sm hover:bg-gray-200 transition-colors"
                    >
                      Book Again
                    </button>
                  </>
                ) : (
                  <button className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-600 text-sm hover:bg-blue-100 transition-colors">
                    View Details
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav screen="bookings" navigate={navigate} />
    </div>
  );
}
