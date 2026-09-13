import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { resolveUserRole, useAuth, type ValidatedRole } from './AuthProvider';

export interface LoginPageProps {
  portal: 'client' | 'technician' | 'admin';
  title?: string;
  subtitle?: string;
  theme?: 'light' | 'dark';
  initialError?: string | null;
  onSuccess?: () => void;
  onSignUpClick?: () => void;
}


export function LoginPage({
  portal,
  title,
  subtitle,
  theme,
  initialError = null,
  onSuccess,
  onSignUpClick,
}: LoginPageProps) {
  const isDark = theme ? theme === 'dark' : portal === 'admin';
  const { signOut } = useAuth();

  const defaultTitle =
    title ??
    (portal === 'client'
      ? 'SOS HomeFix'
      : portal === 'technician'
      ? 'SewaSync Technician'
      : 'SewaSync Ops Control');

  const defaultSubtitle =
    subtitle ??
    (portal === 'client'
      ? 'Sign in to request emergency repairs & bookings'
      : portal === 'technician'
      ? 'Sign in to access real-time dispatch radar'
      : 'Authorised administrative access only');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(initialError);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialError !== undefined) {
      setError(initialError);
    }
  }, [initialError]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const cleanEmail = email.trim();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (signInError) {
      console.error("SUPABASE AUTH/DB ERROR:", signInError);
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    if (!data.user) {
      setError('Authentication failed. Please verify credentials.');
      setSubmitting(false);
      return;
    }

    // Role verification gate
    const { role: validatedRole } = await resolveUserRole(data.user.id, data.user.email);

    if (portal === 'client') {
      if (validatedRole !== 'client') {
        await signOut();
        setError('ACCESS DENIED: Client portal is restricted to registered client accounts.');
        setSubmitting(false);
        return;
      }
    } else if (portal === 'technician') {
      if (validatedRole !== 'technician') {
        await signOut();
        setError('ACCESS DENIED: Technician portal is restricted to registered technicians.');
        setSubmitting(false);
        return;
      }
    } else if (portal === 'admin') {
      if (validatedRole !== 'admin' && validatedRole !== 'mediator') {
        await signOut();
        setError('ACCESS DENIED: Insufficient administrative privileges.');
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    onSuccess?.();
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-4 transition-colors ${
        isDark ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900'
      }`}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-600 text-white font-display font-800 text-xl shadow-lg shadow-red-600/30">
            SH
          </div>
          <h1 className="font-display font-800 text-2xl tracking-tight">{defaultTitle}</h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {defaultSubtitle}
          </p>
        </div>

        {/* Card Frame */}
        <div
          className={`rounded-2xl border p-6 space-y-5 shadow-xl transition-all ${
            isDark
              ? 'border-slate-800 bg-slate-900/90 shadow-slate-950/50 backdrop-blur-sm'
              : 'border-gray-200 bg-white shadow-gray-200/50'
          }`}
        >

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="login-email"
                className={`block text-xs font-600 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@sewasync.in"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 ${
                  isDark
                    ? 'border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:ring-blue-500 focus:border-blue-500'
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-red-500 focus:border-red-500'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="login-password"
                className={`block text-xs font-600 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 ${
                  isDark
                    ? 'border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:ring-blue-500 focus:border-blue-500'
                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-red-500 focus:border-red-500'
                }`}
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400 font-500 space-y-1 animate-fade-in">
                <div className="flex items-center gap-2 font-700 text-red-500">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>Authentication Alert</span>
                </div>
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`w-full rounded-xl py-3 text-sm font-700 text-white shadow-md transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed ${
                portal === 'client'
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/25'
                  : portal === 'technician'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
              }`}
            >
              {submitting ? 'Verifying credentials...' : 'Sign In'}
            </button>

            {portal === 'client' && onSignUpClick && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={onSignUpClick}
                  className="text-xs font-600 text-red-600 hover:text-red-700 transition focus:outline-none"
                >
                  Don't have an account? <span className="underline font-700">Sign Up</span>
                </button>
              </div>
            )}

            {portal === 'technician' && onSignUpClick && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={onSignUpClick}
                  className={`text-xs font-600 transition focus:outline-none ${
                    isDark
                      ? 'text-emerald-400 hover:text-emerald-300'
                      : 'text-emerald-600 hover:text-emerald-700 font-bold'
                  }`}
                >
                  Join as a Cooperative Worker? <span className="underline font-700">Register Here</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Footer info */}
        <p className={`text-center text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          SewaSync Cooperative Platform · Port {portal === 'client' ? '3001' : portal === 'technician' ? '3002' : '3003'}
        </p>
      </div>
    </div>
  );
}
export default LoginPage;
