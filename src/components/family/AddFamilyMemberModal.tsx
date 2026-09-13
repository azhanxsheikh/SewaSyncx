import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataProvider';
import type { FamilyMember } from '../../types/domain';
import { forwardGeocode } from '../../utils/geocoding';
import { resolveMemberCoordinates } from '../FamilyLocationMap';

export interface AddFamilyMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member?: FamilyMember | null;
  onSaved?: () => void;
}

const RELATION_OPTIONS = [
  'Father',
  'Mother',
  'Spouse',
  'Child',
  'Grandparent',
  'Sibling',
  'Other',
];

const EMOJI_OPTIONS = ['👨', '👩', '👵', '👴', '👦', '👧', '🧑', '🏠'];

export function AddFamilyMemberModal({
  isOpen,
  onClose,
  member,
  onSaved,
}: AddFamilyMemberModalProps) {
  const { userId } = useAuth();
  const { refreshClientData } = useData();
  const isEditing = Boolean(member && member.id);

  const [name, setName] = useState('');
  const [relation, setRelation] = useState('Father');
  const [emoji, setEmoji] = useState('👨');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [area, setArea] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setRelation(member.relation || 'Father');
      setEmoji(member.emoji || '👨');
      const rawPhone = member.phone || '';
      const cleanPhone = rawPhone.startsWith('+91')
        ? rawPhone.slice(3)
        : rawPhone.replace(/\D/g, '');
      setPhone(cleanPhone);
      setAddressLine(member.address || '');
      setArea(member.area || '');
    } else {
      setName('');
      setRelation('Father');
      setEmoji('👨');
      setPhone('');
      setAddressLine('');
      setArea('Noida, Uttar Pradesh');
    }
    setError(null);
  }, [member, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter the family member full name.');
      return;
    }
    if (!relation.trim()) {
      setError('Please select or specify the relationship.');
      return;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
      setError('Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).');
      return;
    }

    if (!addressLine.trim()) {
      setError('Please enter the street address or building details.');
      return;
    }
    if (!area.trim()) {
      setError('Please enter the area, city, or locality.');
      return;
    }
    if (!userId) {
      setError('You must be signed in to manage family members.');
      return;
    }

    setLoading(true);
    try {
      let coords = resolveMemberCoordinates(addressLine, area);
      try {
        const geo = await forwardGeocode(`${addressLine}, ${area}`);
        if (geo) coords = geo;
      } catch {
        // Fallback already assigned
      }

      const formattedPhone = `+91${phoneDigits}`;
      const locationPoint = `POINT(${coords.longitude} ${coords.latitude})`;

      if (isEditing && member) {
        const { error: updateErr } = await supabase
          .from('family_members')
          .update({
            name: name.trim(),
            relation: relation.trim(),
            emoji,
            phone: formattedPhone,
            address_line: addressLine.trim(),
            area: area.trim(),
            location: locationPoint,
          })
          .eq('id', member.id)
          .eq('owner_id', userId);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('family_members')
          .insert({
            owner_id: userId,
            name: name.trim(),
            relation: relation.trim(),
            emoji,
            phone: formattedPhone,
            address_line: addressLine.trim(),
            area: area.trim(),
            location: locationPoint,
          });

        if (insertErr) throw insertErr;
      }

      await refreshClientData();
      onSaved?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save family member.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!member?.id || !window.confirm(`Are you sure you want to delete ${member.name}?`)) return;
    if (!userId) return;

    setDeleting(true);
    setError(null);
    try {
      const { error: delErr } = await supabase
        .from('family_members')
        .delete()
        .eq('id', member.id)
        .eq('owner_id', userId);

      if (delErr) throw delErr;

      await refreshClientData();
      onSaved?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete family member.';
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-800 text-lg text-gray-900">
            {isEditing ? 'Edit Family Member' : 'Add Family Member'}
          </h3>
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
          {/* Avatar Icon */}
          <div className="space-y-1.5">
            <label className="block text-xs font-600 text-gray-700">Avatar Icon</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all border ${
                    emoji === e
                      ? 'border-red-500 bg-red-50 shadow-xs scale-105'
                      : 'border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-600 text-gray-700">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Papa, Mummy, Rohan"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
            />
          </div>

          {/* Relationship */}
          <div className="space-y-1.5">
            <label className="block text-xs font-600 text-gray-700">Relationship</label>
            <div className="flex flex-wrap gap-1.5">
              {RELATION_OPTIONS.map((rel) => (
                <button
                  key={rel}
                  type="button"
                  onClick={() => setRelation(rel)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-600 transition-all border ${
                    relation === rel
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {rel}
                </button>
              ))}
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-600 text-gray-700">Mobile Phone Number</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 text-sm font-semibold">
                +91
              </span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="98110 45678"
                className="flex-1 px-3.5 py-2.5 rounded-r-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 font-medium"
              />
            </div>
            <p className="text-[11px] text-gray-400">Emergency updates will be SMS-dispatched to this number.</p>
          </div>

          {/* Address Line */}
          <div className="space-y-1.5">
            <label className="block text-xs font-600 text-gray-700">Address Line / Building</label>
            <textarea
              required
              rows={2}
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              placeholder="e.g. A-47, Sector 62, Noida"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
            />
          </div>

          {/* Area / City */}
          <div className="space-y-1.5">
            <label className="block text-xs font-600 text-gray-700">Area / City / State</label>
            <input
              type="text"
              required
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Noida, Uttar Pradesh"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || loading}
                className="py-3 px-4 rounded-xl border border-red-200 bg-red-50 text-red-600 font-display font-600 text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {deleting ? '...' : 'Delete'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 font-display font-600 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || deleting}
              className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-display font-700 text-sm transition-all shadow-md shadow-red-200 disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEditing ? 'Update Member' : 'Save Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddFamilyMemberModal;
