import { useState } from 'react';
import type { Screen } from '../types/navigation';
import {
  availableDates as dates,
  scheduledOfferings,
  timeSlots,
} from '../fixtures/services.fixture';
import { scheduledAddressOptions } from '../fixtures/account.fixture';
import { useScheduledCategories } from '../hooks/useServiceCatalog';
import type { ServiceOffering } from '../types/domain';
import Header from '../components/Header';

interface Props {
  navigate: (s: Screen) => void;
  subScreen: 'category' | 'service' | 'datetime' | 'address' | 'pricing' | 'confirmation';
  setSubScreen: (s: 'category' | 'service' | 'datetime' | 'address' | 'pricing' | 'confirmation') => void;
  onBack: () => void;
}

export default function ScheduledBooking({ navigate, subScreen, setSubScreen, onBack }: Props) {
  const scheduledCategories = useScheduledCategories();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceOffering | null>(null);
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState('');
  const [confirming, setConfirming] = useState(false);

  const stepNames: Record<string, string> = {
    category: 'Select category',
    service: 'Select service',
    datetime: 'Pick date & time',
    address: 'Confirm address',
    pricing: 'Review & pay',
    confirmation: 'Confirmed!',
  };

  const stepNumber: Record<string, number> = {
    category: 1, service: 2, datetime: 3, address: 4, pricing: 5, confirmation: 6,
  };

  const stepBar = (
    <div className="bg-white border-b border-gray-100 px-4 py-2">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-500 text-gray-500">{stepNames[subScreen]}</span>
          <span className="text-xs text-gray-400">{stepNumber[subScreen]}/5</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${(stepNumber[subScreen] / 5) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );

  if (subScreen === 'confirmation') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display font-800 text-2xl text-gray-900 mb-2">Booking confirmed!</h2>
        <p className="text-gray-500 text-sm mb-8">Your appointment has been scheduled successfully</p>

        <div className="w-full max-w-xs bg-gray-50 rounded-2xl border border-gray-100 p-5 text-left space-y-3 mb-8">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Service</span>
            <span className="font-600 text-gray-900">{selectedService?.name || 'AC Service'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Date</span>
            <span className="font-600 text-gray-900">{dates[selectedDate].date}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Time</span>
            <span className="font-600 text-gray-900">{selectedTime || '10:00 AM'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Address</span>
            <span className="font-600 text-gray-900 text-right text-xs">Gaur City 2, GN West</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="font-700 text-gray-900">Total</span>
            <span className="font-display font-800 text-gray-900">₹{selectedService?.price || 499}</span>
          </div>
        </div>

        <button onClick={() => navigate('bookings')} className="w-full max-w-xs py-4 rounded-xl font-display font-700 bg-blue-600 text-white hover:bg-blue-700 transition-all">
          View Booking →
        </button>
        <button onClick={() => navigate('home')} className="mt-2 text-gray-400 text-sm py-2">
          Back to Home
        </button>
      </div>
    );
  }

  if (subScreen === 'pricing') {
    const price = selectedService?.price || 499;
    const platform = Math.round(price * 0.05);
    const taxes = Math.round(price * 0.18);
    const total = price + platform;

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header title="Schedule Service" onBack={() => setSubScreen('address')} showNotification={false} />
        {stepBar}
        <div className="flex-1 px-4 pt-6 pb-28 max-w-md mx-auto w-full space-y-4">
          <h2 className="font-display font-800 text-xl text-gray-900">Review & Confirm</h2>

          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
            <p className="font-display font-700 text-gray-900 mb-3">Booking summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Service</span><span className="font-600 text-gray-900">{selectedService?.name || 'AC Service'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date & Time</span><span className="font-600 text-gray-900">{dates[selectedDate].date} · {selectedTime || '10:00 AM'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-600 text-gray-900">{selectedService?.duration || '1–2 hrs'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Address</span><span className="font-600 text-gray-900 text-xs text-right">Gaur City 2, GN West</span></div>
              <div className="h-px bg-gray-200" />
              <div className="flex justify-between"><span className="text-gray-500">Service charge</span><span className="font-600">₹{price}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Platform fee</span><span className="font-600">₹{platform}</span></div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-display font-700 text-gray-900">Total</span>
                <span className="font-display font-800 text-xl text-gray-900">₹{total}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <span className="text-2xl">📱</span>
            <div className="flex-1">
              <p className="font-600 text-gray-900 text-sm">Pay after service</p>
              <p className="text-xs text-gray-500">UPI · Card · Cash</p>
            </div>
            <button className="text-blue-600 text-xs font-600">Change</button>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => { setConfirming(true); setTimeout(() => { setConfirming(false); setSubScreen('confirmation'); }, 1500); }}
              className="w-full py-4 rounded-xl font-display font-700 text-base bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {confirming ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Confirming...</> : <>✓ Book Appointment — ₹{total}</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (subScreen === 'address') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header title="Schedule Service" onBack={() => setSubScreen('datetime')} showNotification={false} />
        {stepBar}
        <div className="flex-1 px-4 pt-6 pb-28 max-w-md mx-auto w-full space-y-4">
          <h2 className="font-display font-800 text-xl text-gray-900">Service address</h2>
          {scheduledAddressOptions.map((a, i) => (
            <button
              key={i}
              onClick={() => setSubScreen('pricing')}
              className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${i === 0 ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
            >
              <span className="text-xl">{a.icon}</span>
              <div>
                <p className="font-700 text-gray-900 text-sm">{a.label}</p>
                <p className="text-xs text-gray-600 mt-0.5">{a.addr}</p>
                <p className="text-xs text-gray-400">{a.area}</p>
              </div>
              {i === 0 && <span className="ml-auto text-blue-500">✓</span>}
            </button>
          ))}
          <button className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all">
            <span className="text-xl text-gray-400">+</span>
            <span className="font-600 text-gray-600 text-sm">Add new address</span>
          </button>
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
          <div className="max-w-md mx-auto">
            <button onClick={() => setSubScreen('pricing')} className="w-full py-4 rounded-xl font-display font-700 text-base bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all">
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (subScreen === 'datetime') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header title="Schedule Service" onBack={() => setSubScreen('service')} showNotification={false} />
        {stepBar}
        <div className="flex-1 px-4 pt-6 pb-28 max-w-md mx-auto w-full">
          <h2 className="font-display font-800 text-xl text-gray-900 mb-5">Pick a date & time</h2>

          <p className="font-600 text-gray-700 text-sm mb-3">Select date</p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-6">
            {dates.map((d, i) => (
              <button
                key={i}
                onClick={() => setSelectedDate(i)}
                className={`flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-xl border-2 transition-all min-w-[72px] ${selectedDate === i ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
              >
                <span className={`text-xs font-500 ${selectedDate === i ? 'text-blue-500' : 'text-gray-400'}`}>{d.label}</span>
                <span className={`font-display font-700 text-sm mt-0.5 ${selectedDate === i ? 'text-blue-700' : 'text-gray-900'}`}>{d.date.split(' ')[1] || d.date}</span>
              </button>
            ))}
          </div>

          <p className="font-600 text-gray-700 text-sm mb-3">Select time</p>
          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                className={`py-3 rounded-xl text-sm font-500 border-2 transition-all ${selectedTime === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-700 hover:border-gray-200'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-5 bg-blue-50 rounded-xl p-4 flex gap-2">
            <span className="text-blue-500">ℹ️</span>
            <p className="text-xs text-blue-700">A professional will be assigned 30 minutes before your appointment. You'll receive a confirmation SMS.</p>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setSubScreen('address')}
              disabled={!selectedTime}
              className={`w-full py-4 rounded-xl font-display font-700 text-base transition-all ${selectedTime ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (subScreen === 'service') {
    const catId = selectedCategory || 'ac';
    const catServices = scheduledOfferings[catId] || scheduledOfferings.default;
    const cat = scheduledCategories.find(c => c.id === catId);

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header title="Schedule Service" onBack={() => setSubScreen('category')} showNotification={false} />
        {stepBar}
        <div className="flex-1 px-4 pt-6 pb-28 max-w-md mx-auto w-full">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-2xl">{cat?.icon || '🔧'}</span>
            <h2 className="font-display font-800 text-xl text-gray-900">{cat?.name || 'Service'}</h2>
          </div>
          <div className="space-y-3">
            {catServices.map((s, i) => (
              <button
                key={i}
                onClick={() => { setSelectedService(s); setSubScreen('datetime'); }}
                className="w-full flex items-start gap-4 p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50 transition-all text-left active:scale-95"
              >
                <div className="flex-1">
                  <p className="font-display font-700 text-gray-900 text-sm">{s.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  <p className="text-xs text-gray-400 mt-1">⏱ {s.duration}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-display font-700 text-gray-900">₹{s.price}</p>
                  <p className="text-xs text-gray-400">onwards</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Category selection
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title="Schedule Service" onBack={onBack} showNotification={false} />
      {stepBar}
      <div className="flex-1 px-4 pt-6 pb-8 max-w-md mx-auto w-full">
        <h2 className="font-display font-800 text-xl text-gray-900 mb-5">What do you need?</h2>
        <div className="grid grid-cols-2 gap-3">
          {scheduledCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); setSubScreen('service'); }}
              className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50 transition-all text-left active:scale-95"
            >
              <span className="text-3xl">{cat.icon}</span>
              <div>
                <p className="font-display font-700 text-gray-900 text-sm">{cat.name}</p>
                <p className="text-xs text-gray-400">From ₹{cat.price}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
