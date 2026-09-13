import { useEffect, useState, type ReactNode } from 'react';
import { useAuth, LoginPage } from '../../../../packages/shared/src/auth';

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { status, role, signOut } = useAuth();
  const [deniedMsg, setDeniedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'signed-in' && role && role !== 'admin' && role !== 'mediator') {
      void signOut();
      setDeniedMsg('ACCESS DENIED: Insufficient administrative privileges.');
    }
  }, [status, role, signOut]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Verifying administrative credentials...</p>
        </div>
      </div>
    );
  }

  if (status === 'signed-out' || deniedMsg) {
    return (
      <LoginPage
        portal="admin"
        title="SewaSync Ops Control"
        subtitle="Staff & Administrator Sign-in"
        theme="dark"
        initialError={deniedMsg}
        onSuccess={() => setDeniedMsg(null)}
      />
    );
  }

  if (role !== 'admin' && role !== 'mediator') {
    return (
      <LoginPage
        portal="admin"
        title="SewaSync Ops Control"
        subtitle="Staff & Administrator Sign-in"
        theme="dark"
        initialError="ACCESS DENIED: Insufficient administrative privileges."
      />
    );
  }

  return <>{children}</>;
}

export default AdminGuard;
