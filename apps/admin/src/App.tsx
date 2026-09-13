import { AuthProvider } from '../../../packages/shared/src/auth';
import AdminGuard from './components/AdminGuard';
import AdminDashboard from './components/AdminDashboard';

export default function AdminApp() {
  return (
    <AuthProvider>
      <AdminGuard>
        <AdminDashboard />
      </AdminGuard>
    </AuthProvider>
  );
}
