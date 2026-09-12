import type { Screen } from '../types/navigation';
import { useNotifications } from '../hooks/useAccount';
import Header from '../components/Header';

interface Props {
  navigate: (s: Screen) => void;
  onBack: () => void;
}

export default function Notifications({ navigate, onBack }: Props) {
  const notifications = useNotifications();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Notifications" onBack={onBack} showNotification={false} />

      <div className="max-w-md mx-auto px-4 pt-4 space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`bg-white rounded-2xl border px-4 py-4 flex items-start gap-3 transition-all ${
              !n.read ? 'border-blue-100 bg-blue-50/50' : 'border-gray-100'
            }`}
          >
            <span className="text-xl flex-shrink-0 mt-0.5">{n.icon}</span>
            <div className="flex-1">
              <p className={`text-sm leading-relaxed ${!n.read ? 'font-600 text-gray-900' : 'font-500 text-gray-700'}`}>
                {n.title}
              </p>
              <p className="text-xs text-gray-400 mt-1">{n.time}</p>
            </div>
            {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />}
          </div>
        ))}
      </div>
    </div>
  );
}
