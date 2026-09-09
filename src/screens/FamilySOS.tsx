import { useState } from 'react';
import type { Screen } from '../data/mockData';
import { familyMembers, serviceCategories } from '../data/mockData';
import Header from '../components/Header';
import MapView from '../components/MapView';
import BottomNav from '../components/BottomNav';

interface Props {
  navigate: (s: Screen) => void;
  onBack?: () => void;
  subScreen: 'list' | 'member' | 'tracking';
  setSubScreen: (s: 'list' | 'member' | 'tracking') => void;
  selectedMember: string;
  setSelectedMember: (id: string) => void;
}

export default function FamilySOS({ navigate, onBack, subScreen, setSubScreen, selectedMember, setSelectedMember }: Props) {
  const member = familyMembers.find(m => m.id === selectedMember) || familyMembers[0];

  if (subScreen === 'tracking') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="relative flex-1">
          <MapView height="h-full" className="rounded-none h-full" showRoute showTechnician techProgress={0.4} />

          <div className="absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 z-10">
            <div className="max-w-md mx-auto flex items-center gap-3">
              <button onClick={() => setSubScreen('member')} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1">
                <p className="font-display font-700 text-gray-900 text-sm">Help for {member.name}</p>
                <p className="text-xs text-gray-500">{member.address}</p>
              </div>
              <span className="text-xs text-blue-600 font-600 bg-blue-50 px-2 py-1 rounded-full">Live</span>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-10">
            <div className="bg-white rounded-t-3xl shadow-xl px-5 pt-5 pb-6">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="max-w-md mx-auto">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{member.emoji}</span>
                  <div className="flex-1">
                    <p className="font-display font-700 text-gray-900">Help dispatched for {member.name}</p>
                    <p className="text-xs text-gray-500">{member.address}</p>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display font-700 text-blue-900">Rahul Kumar en route</p>
                      <p className="text-xs text-blue-600">Electrician · ⭐ 4.9</p>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-800 text-2xl text-blue-600">12 min</div>
                      <p className="text-xs text-blue-500">ETA</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button className="py-3 rounded-xl bg-emerald-50 text-emerald-700 font-600 text-sm flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors">
                    📞 Call {member.name}
                  </button>
                  <button className="py-3 rounded-xl bg-blue-50 text-blue-700 font-600 text-sm flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
                    📞 Call Rahul
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subScreen === 'member') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header title={`SOS for ${member.name}`} onBack={() => setSubScreen('list')} showNotification={false} />

        <div className="flex-1 px-4 pt-5 pb-24 max-w-md mx-auto w-full space-y-4">
          {/* Member card */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center gap-4">
            <span className="text-5xl">{member.emoji}</span>
            <div>
              <h3 className="font-display font-800 text-xl text-gray-900">{member.name}</h3>
              <p className="text-sm text-gray-500">{member.relation}</p>
              <p className="text-xs text-gray-400 mt-0.5">{member.phone}</p>
            </div>
          </div>

          {/* Location */}
          <MapView height="h-40" showRoute={false} />

          <div className="bg-white border-2 border-blue-200 rounded-2xl p-4">
            <p className="text-xs text-gray-400 font-500 mb-1">Help will be sent to</p>
            <p className="font-display font-700 text-gray-900">{member.address}</p>
            <p className="text-sm text-gray-500">{member.area}</p>
          </div>

          {/* Service selection */}
          <div>
            <p className="font-display font-700 text-gray-900 mb-3">Select service type</p>
            <div className="grid grid-cols-4 gap-2">
              {serviceCategories.slice(0, 8).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSubScreen('tracking')}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl border border-gray-100 bg-white hover:border-red-200 hover:bg-red-50 transition-all text-center"
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-[10px] font-500 text-gray-600 leading-tight">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
            <span className="text-amber-500">ℹ️</span>
            <p className="text-xs text-amber-800">Help will be dispatched to <strong>{member.name}'s</strong> address. They will receive an SMS notification.</p>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setSubScreen('tracking')}
              className="w-full py-4 rounded-xl font-display font-700 text-base bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>🚨</span>
              Send Help to {member.name}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default: list
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="My Family" showNotification onNotification={() => navigate('notifications')} />

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Emergency for family */}
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="font-display font-700 text-gray-900 text-sm">Request help for a family member</p>
            <p className="text-xs text-gray-500 mt-0.5">Send an emergency technician to any saved address instantly</p>
          </div>
        </div>

        {/* Family members */}
        <div className="space-y-3">
          {familyMembers.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-full bg-${m.color}-100 flex items-center justify-center text-3xl`}>
                  {m.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-700 text-gray-900">{m.name}</h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{m.relation}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">📍 {m.address}</p>
                  <p className="text-xs text-gray-400">{m.phone}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                <button
                  onClick={() => { setSelectedMember(m.id); setSubScreen('member'); }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-display font-700 text-sm hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  🚨 Send SOS
                </button>
                <button className="flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-600 text-sm hover:bg-blue-100 transition-colors">
                  📞 Call
                </button>
                <button className="py-2.5 px-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  ⋯
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add member */}
        <button className="w-full bg-white border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center gap-2 text-gray-400 hover:border-blue-300 hover:bg-blue-50 transition-all">
          <span className="text-3xl">+</span>
          <span className="text-sm font-600">Add Family Member</span>
          <span className="text-xs text-center">Save their address and contact for quick emergency dispatch</span>
        </button>
      </div>

      <BottomNav screen="family" navigate={navigate} />
    </div>
  );
}
