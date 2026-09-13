import { useState, type FormEvent } from 'react';
import { supabase } from '../../../../../packages/shared/src/lib/supabase';
import { extractValidIndianPhone } from '../../../../../packages/shared/src/lib/phone';

export interface ClientSignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ClientSignUpModal({ isOpen, onClose, onSuccess }: ClientSignUpModalProps) {
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');

  // Default address fields
  const [flatBuilding, setFlatBuilding] = useState('');
  const [areaSociety, setAreaSociety] = useState('');
  const [city, setCity] = useState('Greater Noida');
  const [pincode, setPincode] = useState('201009');
  const [addressLabel, setAddressLabel] = useState<'home' | 'work' | 'other'>('home');

  // Status & validation states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Phone validation: Indian mobile starts with 6-9 and has 10 digits
  const phoneCheck = extractValidIndianPhone(phone);
  const isPhoneValid = phoneCheck.isValid;
  const isPasswordValid = password.length >= 8;
  const isNameValid = fullName.trim().length >= 3;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isNameValid) {
      setError('Full Name must contain at least 3 characters.');
      return;
    }

    const phoneValidation = extractValidIndianPhone(phone);
    if (!phoneValidation.isValid) {
      setError(phoneValidation.error || 'Please enter a valid 10-digit Indian mobile number (starts with 6-9).');
      return;
    }

    if (!isPasswordValid) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!flatBuilding.trim() || !areaSociety.trim()) {
      setError('Please complete the service address details.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // 1. Supabase Auth Sign Up
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role: 'client',
            name: fullName.trim(),
            full_name: fullName.trim(),
            phone: phoneValidation.e164Phone,
          },
        },
      });

      if (signUpError) {
        console.error("SUPABASE AUTH/DB ERROR:", signUpError);
        if (signUpError.message.toLowerCase().includes('already registered')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
        if (signUpError.message.toLowerCase().includes('password')) {
          throw new Error('Password must be at least 8 characters long.');
        }
        throw signUpError;
      }

      const createdUser = authData.user;
      if (!createdUser) {
        throw new Error('Sign-up failed to return an authenticated session. Please try signing in.');
      }

      // If sign-in session wasn't auto-established (e.g. email confirmation required or auth setting), attempt sign-in
      if (!authData.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) {
          console.error("SUPABASE AUTH/DB ERROR:", signInErr);
          console.warn('[signup] Auto sign-in notice:', signInErr.message);
        }
      }

      // 2. Ensure profile details exist in public.users
      try {
        const { error: profErr } = await supabase.rpc('complete_profile', {
          p_name: fullName.trim(),
          p_phone: phoneValidation.e164Phone,
        });
        if (profErr) {
          console.error("SUPABASE AUTH/DB ERROR:", profErr);
          console.warn('[signup] complete_profile sync attempt:', profErr);
        }
      } catch (profErr) {
        console.error("SUPABASE AUTH/DB ERROR:", profErr);
        console.warn('[signup] complete_profile sync attempt:', profErr);
      }

      // 3. Insert initial entry into public.saved_addresses
      const iconMap = {
        home: '🏠',
        work: '🏢',
        other: '📍',
      };

      const fullArea = [areaSociety.trim(), city.trim(), pincode.trim()].filter(Boolean).join(', ');

      const { error: addressErr } = await supabase.from('saved_addresses').insert({
        user_id: createdUser.id,
        label: addressLabel,
        icon: iconMap[addressLabel],
        address_line: flatBuilding.trim(),
        area: fullArea,
        is_default: true,
      });

      if (addressErr) {
        console.error("SUPABASE AUTH/DB ERROR:", addressErr);
        console.warn('[signup] saved_address insert error:', addressErr.message);
      }

      setSubmitting(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("SUPABASE AUTH/DB ERROR:", err);
      const msg = err?.message || 'Failed to complete registration. Please try again.';
      if (msg.includes('duplicate key') || msg.includes('users_phone_key')) {
        setError('This phone number is already registered to another account.');
      } else {
        setError(msg);
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg my-8 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-600 text-white font-display font-800 text-sm shadow-md shadow-red-600/30">
              SH
            </div>
            <div>
              <h2 className="font-display font-800 text-lg text-gray-900 leading-tight">Create Client Account</h2>
              <p className="text-xs text-gray-500">SOS HomeFix · Instant Emergency Assistance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700 space-y-1">
              <div className="flex items-center gap-1.5 font-700 text-red-800">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Registration Alert</span>
              </div>
              <p>{error}</p>
            </div>
          )}

          {/* Section: Account & Contact */}
          <div className="space-y-3">
            <h3 className="text-xs font-700 uppercase tracking-wider text-gray-500">Account Credentials</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-600 text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Abdullah Sheikh"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-600 text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-600 text-gray-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[10px] ${password.length >= 8 ? 'text-emerald-600 font-600' : 'text-gray-400'}`}>
                    {password.length >= 8 ? '✓ Min 8 chars' : 'Min 8 chars'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-600 text-gray-700">
                    Mobile Phone <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[10px] ${isPhoneValid ? 'text-emerald-600 font-600' : 'text-gray-400'}`}>
                    {isPhoneValid ? '✓ Valid Indian phone' : '10 digits'}
                  </span>
                </div>
                <div className="flex rounded-xl border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-red-500 focus-within:border-red-500 transition">
                  <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 text-xs font-600 border-r border-gray-300">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="98765 43210"
                    maxLength={15}
                    className="w-full px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Service Address */}
          <div className="pt-2 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-700 uppercase tracking-wider text-gray-500">Default Service Address</h3>
              {/* Address label toggle */}
              <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                {(['home', 'work', 'other'] as const).map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setAddressLabel(label)}
                    className={`px-2 py-1 text-[11px] font-600 rounded-md capitalize transition ${
                      addressLabel === label ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {label === 'home' ? '🏠 Home' : label === 'work' ? '🏢 Work' : '📍 Other'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="block text-xs font-600 text-gray-700">
                  Flat / House No. / Building <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={flatBuilding}
                  onChange={(e) => setFlatBuilding(e.target.value)}
                  placeholder="e.g. Flat 402, Tower B"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-600 text-gray-700">
                  Area / Society / Street <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={areaSociety}
                  onChange={(e) => setAreaSociety(e.target.value)}
                  placeholder="e.g. Gaur City 2, Greater Noida West"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-600 text-gray-700">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-600 text-gray-700">Pincode</label>
                  <input
                    type="text"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="201009"
                    maxLength={6}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Terms note */}
          <p className="text-[11px] text-gray-500 leading-relaxed">
            By signing up, you agree to SewaSync Cooperative terms. Emergency requests are dispatched directly to verified local technicians.
          </p>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 rounded-xl border border-gray-300 py-3 text-sm font-600 text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-2/3 rounded-xl bg-red-600 hover:bg-red-700 py-3 text-sm font-700 text-white shadow-md shadow-red-600/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                'Register & Continue'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientSignUpModal;
