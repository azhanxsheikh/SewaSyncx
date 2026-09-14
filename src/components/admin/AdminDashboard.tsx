import AdminDashboard from '../../../apps/admin/src/components/AdminDashboard';
import type { Screen } from '../../types/navigation';

export default function RootAdminDashboard({ onBack }: { navigate?: (s: Screen) => void; onBack?: () => void }) {
  return <AdminDashboard onBack={onBack} />;
}
