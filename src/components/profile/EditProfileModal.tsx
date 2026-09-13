import { useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentPhone: string;
  onUpdated: () => void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  currentName,
  currentPhone,
  onUpdated,
}: EditProfileModalProps) {
  const { userId } = useAuth();
  const [name, setName] = useState(currentName);
  const [phone, setPhone] = useState(currentPhone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '');
  const isPhoneValid = /^[6-9]\d{9}$/.test(cleanPhone);
  const isNameValid = name.trim().length >= 3;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isNameValid) {
      setError('Please enter a valid full name (at least 3 characters).');
      return;
    }

    if (!isPhoneValid) {
      setError('Please provide a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    if (!userId) {
      setError('You must be signed in to update your profile.');
      return;
    }

    setLoading(true);
    try {
      // `authenticated` has no UPDATE grant on users.phone: phone changes go
      // through complete_profile(), which normalises the number and reports a
      // taken one as phone_already_registered instead of a raw constraint error.
      const { error: updateError } = await supabase.rpc('complete_profile', {
        p_name: name.trim(),
        p_phone: `+91${cleanPhone}`,
      });

      if (updateError) {
        if (updateError.message.includes('phone_already_registered')) {
          throw new Error('This phone number is already registered to another account.');
        }
        throw updateError;
      }

      onUpdated();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-800 text-lg text-gray-900">Edit Profile</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-600 text-gray-700">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Abdullah Khan"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-600 text-gray-700">Mobile Phone</label>
            <div className="flex gap-2">
              <span className="px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-600 text-gray-600">
                +91
              </span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                maxLength={10}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <p className="text-[11px] text-gray-400">Must be a 10-digit Indian phone number starting with 6-9.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 font-display font-600 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-display font-700 text-sm transition-all shadow-md shadow-blue-200 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProfileModal;
