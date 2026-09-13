import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  title: string;
  subtitle?: string;
  /** Matches each surface's existing shell — Client is light, Technician/Admin are dark. */
  theme?: 'light' | 'dark';
}

/**
 * Shared sign-in form for every surface. New component, not a Figma export —
 * CLAUDE.md's frozen-styling rule governs existing components, not this one.
 */
export default function Login({ title, subtitle, theme = 'light' }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dark = theme === 'dark';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setSubmitting(false);
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${dark ? 'bg-slate-950' : 'bg-gray-50'}`}
    >
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-sm rounded-2xl border p-6 space-y-4 ${
          dark ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-white'
        }`}
      >
        <div>
          <h1 className={`font-display text-2xl font-800 ${dark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h1>
          {subtitle && (
            <p className={`mt-1 text-sm ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{subtitle}</p>
          )}
        </div>

        <div>
          <label className={`block text-xs mb-1 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full rounded-xl border px-4 py-2.5 focus:outline-none ${
              dark
                ? 'border-slate-700 bg-slate-800 text-white'
                : 'border-gray-200 bg-white text-gray-900'
            }`}
          />
        </div>

        <div>
          <label className={`block text-xs mb-1 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
            Password
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full rounded-xl border px-4 py-2.5 focus:outline-none ${
              dark
                ? 'border-slate-700 bg-slate-800 text-white'
                : 'border-gray-200 bg-white text-gray-900'
            }`}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-blue-600 py-3 font-700 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
