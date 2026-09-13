import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataProvider';
import type { SavedAddress } from '../../types/domain';
import {
  forwardGeocode,
  sanitizeOsmAddressQuery,
  constructGoogleMapsNavigationUrl,
  type Coordinates,
} from '../../utils/geocoding';
import { resolveMemberCoordinates } from '../FamilyLocationMap';

export interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  address?: SavedAddress | null;
  onSaved?: () => void;
}

export function AddressModal({ isOpen, onClose, address, onSaved }: AddressModalProps) {
  const { userId } = useAuth();
  const { refreshClientData } = useData();
  const isEditing = Boolean(address && address.id);

  const [label, setLabel] = useState('Home');
  const [icon, setIcon] = useState('🏠');

  // Structured address fields
  const [houseFlat, setHouseFlat] = useState('');
  const [societyName, setSocietyName] = useState('');
  const [areaCity, setAreaCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmarkAndInstructions, setLandmarkAndInstructions] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Resolved coordinates & geocoding state
  const [coords, setCoords] = useState<Coordinates>({ latitude: 28.608, longitude: 77.437 });
  const [geocodingState, setGeocodingState] = useState<'idle' | 'resolving' | 'resolved' | 'fallback'>('idle');

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      setLabel(address.label || 'Home');
      setIcon(address.icon || '🏠');
      setHouseFlat(address.addressLine1 || address.address || '');
      setSocietyName(address.addressLine2 || '');
      setAreaCity(address.city || address.area || 'Greater Noida West, Uttar Pradesh');
      setPincode(address.postalCode || '');
      setLandmarkAndInstructions(address.landmark || '');
      setIsDefault(Boolean(address.isDefault));
      if (address.latitude && address.longitude) {
        setCoords({ latitude: address.latitude, longitude: address.longitude });
        setGeocodingState('resolved');
      } else {
        const fb = resolveMemberCoordinates(address.address || '', address.area || '');
        setCoords(fb);
      }
    } else {
      setLabel('Home');
      setIcon('🏠');
      setHouseFlat('');
      setSocietyName('');
      setAreaCity('Greater Noida West, Uttar Pradesh');
      setPincode('201009');
      setLandmarkAndInstructions('');
      setIsDefault(false);
      setCoords({ latitude: 28.608, longitude: 77.437 });
      setGeocodingState('idle');
    }
    setError(null);
  }, [address, isOpen]);

  if (!isOpen) return null;

  const handleLabelSelect = (selected: string, selectedIcon: string) => {
    setLabel(selected);
    setIcon(selectedIcon);
  };

  // Re-geocode on broad locality change
  const handleResolveLocation = async () => {
    if (!societyName.trim() && !areaCity.trim()) return;
    setGeocodingState('resolving');
    const osmQuery = sanitizeOsmAddressQuery(societyName, areaCity, pincode);
    try {
      const result = await forwardGeocode(osmQuery);
      if (result) {
        setCoords(result);
        setGeocodingState('resolved');
      } else {
        const fallback = resolveMemberCoordinates(societyName || houseFlat, areaCity);
        setCoords(fallback);
        setGeocodingState('fallback');
      }
    } catch {
      const fallback = resolveMemberCoordinates(societyName || houseFlat, areaCity);
      setCoords(fallback);
      setGeocodingState('fallback');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!houseFlat.trim()) {
      setError('Please enter your house, flat, or floor details.');
      return;
    }
    if (!societyName.trim()) {
      setError('Please enter your society, apartment, or colony name.');
      return;
    }
    if (!areaCity.trim()) {
      setError('Please enter your locality and city.');
      return;
    }

    const cleanPin = pincode.replace(/\D/g, '');
    if (cleanPin && !/^\d{6}$/.test(cleanPin)) {
      setError('Please enter a valid 6-digit Indian postal code (pincode).');
      return;
    }

    // Authenticate caller
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id || userId;
    if (!currentUserId) {
      setError('You must be signed in to manage addresses.');
      return;
    }

    setLoading(true);
    try {
      // Final geocode check
      let finalCoords = coords;
      const osmQuery = sanitizeOsmAddressQuery(societyName, areaCity, cleanPin);
      try {
        const geo = await forwardGeocode(osmQuery);
        if (geo) finalCoords = geo;
      } catch {
        // preserve current coords
      }

      const fullAddressLine = `${houseFlat.trim()}, ${societyName.trim()}`;
      const fullArea = `${areaCity.trim()}${cleanPin ? ` - ${cleanPin}` : ''}`;
      const locationPoint = `POINT(${finalCoords.longitude} ${finalCoords.latitude})`;

      const payload = {
        user_id: currentUserId,
        label,
        icon,
        address_line1: houseFlat.trim(),
        address_line2: societyName.trim(),
        landmark: landmarkAndInstructions.trim() || null,
        city: areaCity.trim(),
        postal_code: cleanPin || null,
        latitude: finalCoords.latitude,
        longitude: finalCoords.longitude,
        is_default: isDefault,
        address_line: fullAddressLine,
        area: fullArea,
        location: locationPoint,
      };

      if (isEditing && address) {
        const { error: updateErr } = await supabase
          .from('saved_addresses')
          .update(payload)
          .eq('id', address.id)
          .eq('user_id', currentUserId);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('saved_addresses')
          .insert(payload);

        if (insertErr) throw insertErr;
      }

      await refreshClientData();
      onSaved?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save address.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!address || !window.confirm('Are you sure you want to delete this address?')) return;
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id || userId;
    if (!currentUserId) return;

    setDeleting(true);
    setError(null);
    try {
      const { error: delErr } = await supabase
        .from('saved_addresses')
        .delete()
        .eq('id', address.id)
        .eq('user_id', currentUserId);

      if (delErr) throw delErr;

      await refreshClientData();
      onSaved?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete address.';
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const googleMapsUrl = constructGoogleMapsNavigationUrl(coords.latitude, coords.longitude, 'two_wheeler');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-800 text-lg text-gray-900">
              {isEditing ? 'Edit Address' : 'Add New Address'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Door-level accuracy for fast on-site technician dispatch
            </p>
          </div>
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
          {/* Address Label Pills */}
          <div className="space-y-1.5">
            <label className="block text-xs font-600 text-gray-700">Address Type</label>
            <div className="flex gap-2">
              {[
                { name: 'Home', icon: '🏠' },
                { name: 'Work', icon: '💼' },
                { name: 'Other', icon: '📍' },
              ].map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleLabelSelect(item.name, item.icon)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs font-600 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    label === item.name
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* House / Flat / Floor */}
          <div className="space-y-1.5">
            <label className="block text-xs font-600 text-gray-700">
              House / Flat / Floor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={houseFlat}
              onChange={(e) => setHouseFlat(e.target.value)}
              placeholder="e.g. Flat 402, 4th Floor, Tower B"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          {/* Society / Apartment / Colony */}
          <div className="space-y-1.5">
            <label className="block text-xs font-600 text-gray-700">
              Society / Apartment / Colony <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={societyName}
              onChange={(e) => setSocietyName(e.target.value)}
              onBlur={handleResolveLocation}
              placeholder="e.g. Gaur City 2, 14th Avenue"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          {/* Area / Locality & City */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1.5">
              <label className="block text-xs font-600 text-gray-700">
                Area / City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={areaCity}
                onChange={(e) => setAreaCity(e.target.value)}
                onBlur={handleResolveLocation}
                placeholder="e.g. Greater Noida West, UP"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-600 text-gray-700">
                Pincode
              </label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onBlur={handleResolveLocation}
                placeholder="201009"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-center"
              />
            </div>
          </div>

          {/* Landmark & Entry Instructions for Technician */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-600 text-amber-900">
                <span>🚩</span>
                <span>Landmark & Entry Instructions for Technician</span>
              </label>
              <span className="text-[10px] text-gray-400 font-medium">For Gate/Security</span>
            </div>
            <textarea
              rows={2}
              value={landmarkAndInstructions}
              onChange={(e) => setLandmarkAndInstructions(e.target.value)}
              placeholder="e.g., Near City Plaza roundabout, enter via Gate No. 2, tell guard flat 402, use Tower B lift"
              className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50/40 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 placeholder:text-gray-400"
            />
            <p className="text-[11px] text-gray-400">
              Helps technicians clear MyGate / security gate checkpoints instantly.
            </p>
          </div>

          {/* Geocoding Status Badge & Navigation Preview */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">📍</span>
              <div>
                <p className="font-600 text-gray-800">
                  GPS: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
                </p>
                <p className="text-[10px] text-gray-500">
                  {geocodingState === 'resolving'
                    ? 'Locating via OpenStreetMap...'
                    : geocodingState === 'resolved'
                    ? '✓ High accuracy OSM pin located'
                    : 'Locality coordinates active'}
                </p>
              </div>
            </div>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:text-blue-800 font-600 text-[11px] flex items-center gap-1"
            >
              <span>Google Maps ↗</span>
            </a>
          </div>

          {/* Default Address Toggle */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-700 font-500">Set as default service address</span>
          </label>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || loading}
                className="py-3 px-4 rounded-xl border border-red-200 bg-red-50 text-red-600 font-display font-600 text-sm hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleting ? '...' : 'Delete'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 font-display font-600 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || deleting}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-display font-700 text-sm transition-all shadow-md shadow-blue-200 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving...' : isEditing ? 'Update Address' : 'Save Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddressModal;
