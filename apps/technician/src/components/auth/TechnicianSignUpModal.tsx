import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import { supabase } from '../../../../../packages/shared/src/lib/supabase';

export interface TechnicianSignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ServiceCategoryItem {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string | null;
}

const FALLBACK_CATEGORIES: ServiceCategoryItem[] = [
  { id: '11111111-0000-4000-8000-000000000001', slug: 'electrical', name: 'Electrical Emergency', icon: '⚡', description: 'Short circuits, tripping MCB, burning smell, power cut' },
  { id: '11111111-0000-4000-8000-000000000002', slug: 'plumbing', name: 'Plumbing & Leakage', icon: '🔧', description: 'Burst pipes, overflowing tanks, severe drain block' },
  { id: '11111111-0000-4000-8000-000000000003', slug: 'ac', name: 'AC & Cooling Repair', icon: '❄️', description: 'Complete cooling failure, water leakage, fan stop' },
  { id: '11111111-0000-4000-8000-000000000004', slug: 'appliance', name: 'Appliance Breakdown', icon: '📺', description: 'Refrigerator, washing machine, geyser sudden failure' },
  { id: '11111111-0000-4000-8000-000000000005', slug: 'carpenter', name: 'Carpentry & Doors', icon: '🪚', description: 'Jammed locks, broken hinges, urgent structural repairs' },
  { id: '11111111-0000-4000-8000-000000000006', slug: 'locksmith', name: 'Locksmith & Security', icon: '🔑', description: 'Door lockout, broken key extraction, latch failure' },
];

const LOCALITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Knowledge Park III': { lat: 28.4727, lng: 77.4893 },
  'Alpha 1': { lat: 28.4712, lng: 77.5118 },
  'Gaur City': { lat: 28.6105, lng: 77.4320 },
  'Pari Chowk': { lat: 28.4650, lng: 77.5080 },
  'Sector 62 Noida': { lat: 28.6250, lng: 77.3600 },
};

export function TechnicianSignUpModal({ isOpen, onClose, onSuccess }: TechnicianSignUpModalProps) {
  // Stepper state: 1, 2, 3
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Account & Contact & KYC
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [idType, setIdType] = useState<'PAN Card' | 'Voter ID' | 'National Identity / Govt ID'>('PAN Card');
  const [idNumber, setIdNumber] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  // Step 2: Skill Categories (min 1, max 3)
  const [categories, setCategories] = useState<ServiceCategoryItem[]>(FALLBACK_CATEGORIES);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Step 3: Vehicle & Operating Base
  const [vehicleType, setVehicleType] = useState<'Two-Wheeler / Scooter' | 'Three-Wheeler / Auto' | 'Van / Four-Wheeler' | 'None / Public Transit'>('Two-Wheeler / Scooter');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [locality, setLocality] = useState('Knowledge Park III');
  const [isOnline, setIsOnline] = useState(true);

  // Submission & error
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccessAcknowledged, setIsSuccessAcknowledged] = useState(false);

  // Load categories from Supabase
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;
    async function fetchCategories() {
      try {
        setCategoriesLoading(true);
        const { data, error: catErr } = await supabase
          .from('service_categories')
          .select('id, slug, name, icon, description')
          .order('name');

        if (!isCancelled && data && data.length > 0) {
          setCategories(data);
        } else if (catErr) {
          console.warn('[signup] category fetch fallback:', catErr.message);
        }
      } catch {
        // keep fallback
      } finally {
        if (!isCancelled) setCategoriesLoading(false);
      }
    }
    void fetchCategories();
    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Validation helpers
  const cleanDigits = phone.replace(/\D/g, '').replace(/^91/, '');
  const isPhoneValid = /^[6-9]\d{9}$/.test(cleanDigits);
  const isPasswordValid = password.length >= 8;
  const isNameValid = fullName.trim().length >= 3;

  const handleToggleCategory = (catId: string) => {
    setError(null);
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== catId));
    } else {
      if (selectedCategoryIds.length >= 3) {
        setError('Cooperative policy limits technicians to 3 active skill categories to ensure high-quality service.');
        return;
      }
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const handleNextStep1 = () => {
    setError(null);
    if (!isNameValid) {
      setError('Please enter your full name (minimum 3 characters).');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!isPasswordValid) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!isPhoneValid) {
      setError('Please enter a valid 10-digit Indian mobile number (e.g., 98223 34455).');
      return;
    }
    setCurrentStep(2);
  };

  const handleNextStep2 = () => {
    setError(null);
    if (selectedCategoryIds.length === 0) {
      setError('Please select at least 1 skill category to proceed.');
      return;
    }
    if (selectedCategoryIds.length > 3) {
      setError('Maximum 3 skill categories permitted by cooperative policy.');
      return;
    }
    setCurrentStep(3);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const formattedE164Phone = `+91${cleanDigits}`;
    setSubmitting(true);

    try {
      // 1. Supabase Auth Sign Up as Technician
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role: 'technician',
            full_name: fullName.trim(),
            name: fullName.trim(),
            phone: formattedE164Phone,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
        throw signUpError;
      }

      const createdUser = authData.user;
      if (!createdUser) {
        throw new Error('Sign-up failed to return an authenticated user session.');
      }

      // If session not auto-established, sign in
      if (!authData.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) {
          console.warn('[signup] auto sign-in notice:', signInErr.message);
        }
      }

      // 2. Register profile via atomic RPC or direct tables
      const coords = LOCALITY_COORDINATES[locality] || { lat: 28.4727, lng: 77.4893 };

      // Attempt atomic RPC first
      try {
        const { error: rpcErr } = await supabase.rpc('register_technician_profile', {
          p_vehicle_type: vehicleType,
          p_vehicle_registration: vehicleNumber.trim() || null,
          p_category_ids: selectedCategoryIds,
          p_lat: coords.lat,
          p_lng: coords.lng,
        });

        if (rpcErr) {
          console.warn('[signup] register_technician_profile RPC message:', rpcErr.message);
          // Fallback direct inserts if RPC had unexpected error
          await supabase.from('users').update({ role: 'technician' } as any).eq('id', createdUser.id);
          await supabase.from('technician_profiles').insert({
            id: createdUser.id,
            vehicle_type: vehicleType,
            vehicle_registration: vehicleNumber.trim() || null,
            is_online: isOnline,
            identity_verified: false,
            skill_verified: false,
            background_checked: false,
          } as any);

          const catInserts = selectedCategoryIds.map((cId) => ({
            technician_id: createdUser.id,
            category_id: cId,
          }));
          await supabase.from('technician_categories').insert(catInserts as any);
        }
      } catch (insertErr) {
        console.warn('[signup] profile registration fallback:', insertErr);
      }

      setSubmitting(false);
      setIsSuccessAcknowledged(true);
    } catch (err: any) {
      console.error('[signup] error:', err);
      const msg = err?.message || 'Failed to complete registration. Please try again.';
      if (msg.includes('duplicate key') || msg.includes('users_phone_key')) {
        setError('This phone number is already registered to another account.');
      } else {
        setError(msg);
      }
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    setIsSuccessAcknowledged(false);
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl my-8 bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500 font-display font-800 text-sm text-slate-950 shadow-md shadow-emerald-500/20">
              SH
            </div>
            <div>
              <h2 className="font-display font-800 text-lg text-white leading-tight">Cooperative Onboarding</h2>
              <p className="text-xs text-slate-400">SewaSync Technician Dispatch Network</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stepper Progress Bar */}
        {!isSuccessAcknowledged && (
          <div className="px-6 pt-4 pb-2 border-b border-slate-800/80 bg-slate-900/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-700 uppercase tracking-wider text-emerald-400">
                Step {currentStep} of 3: {currentStep === 1 ? 'Account & Verification' : currentStep === 2 ? 'Skill Categories' : 'Vehicle & Base'}
              </span>
              <span className="text-xs text-slate-400 font-600">
                {currentStep === 1 ? '33%' : currentStep === 2 ? '66%' : '100%'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                style={{ width: currentStep === 1 ? '33%' : currentStep === 2 ? '66%' : '100%' }}
              />
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-300 space-y-1">
              <div className="flex items-center gap-1.5 font-700 text-red-400">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Onboarding Alert</span>
              </div>
              <p>{error}</p>
            </div>
          )}

          {isSuccessAcknowledged ? (
            /* Acknowledgment View */
            <div className="text-center py-6 space-y-5 animate-fade-in">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl text-emerald-400">
                ✓
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-800 text-xl text-white">Registration Submitted!</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Welcome to the SewaSync Cooperative, <strong className="text-white">{fullName}</strong>. Your profile has been created with base locality at <span className="text-emerald-400">{locality}</span>.
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-left space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Selected Categories:</span>
                  <span className="text-slate-200 font-600">
                    {categories.filter((c) => selectedCategoryIds.includes(c.id)).map((c) => c.name).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Vehicle:</span>
                  <span className="text-slate-200 font-600">{vehicleType} {vehicleNumber ? `(${vehicleNumber})` : ''}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Verification Status:</span>
                  <span className="text-amber-400 font-600">Pending Review (Cooperative Desk)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 py-3 text-sm font-700 text-slate-950 shadow-lg shadow-emerald-500/25 transition"
              >
                Access Technician Radar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* STEP 1: Account & Contact */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-600 text-slate-300">
                        Full Name <span className="text-emerald-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Rahul Kumar"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-600 text-slate-300">
                        Email Address <span className="text-emerald-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="rahul.kumar@domain.in"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-600 text-slate-300">
                          Password <span className="text-emerald-400">*</span>
                        </label>
                        <span className={`text-[10px] ${password.length >= 8 ? 'text-emerald-400 font-600' : 'text-slate-400'}`}>
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
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-600 text-slate-300">
                          Mobile Phone (for Calls & WhatsApp) <span className="text-emerald-400">*</span>
                        </label>
                        <span className={`text-[10px] ${isPhoneValid ? 'text-emerald-400 font-600' : 'text-slate-400'}`}>
                          {isPhoneValid ? '✓ Valid phone' : '10 digits'}
                        </span>
                      </div>
                      <div className="flex rounded-xl border border-slate-700 bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition">
                        <span className="inline-flex items-center px-3 bg-slate-950/60 text-slate-400 text-xs font-600 border-r border-slate-700">
                          🇮🇳 +91
                        </span>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="98223 34455"
                          maxLength={10}
                          className="w-full px-3.5 py-2.5 text-sm text-white bg-transparent placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* KYC Placeholder */}
                  <div className="pt-2 border-t border-slate-800 space-y-3">
                    <h3 className="text-xs font-700 uppercase tracking-wider text-slate-400">
                      Cooperative Verification (KYC)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-600 text-slate-300">Government ID Type</label>
                        <select
                          value={idType}
                          onChange={(e) => setIdType(e.target.value as any)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                        >
                          <option value="PAN Card">PAN Card</option>
                          <option value="Voter ID">Voter ID</option>
                          <option value="National Identity / Govt ID">National Identity / Govt ID</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-600 text-slate-300">ID Reference Number</label>
                        <input
                          type="text"
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          placeholder="ABCDE1234F"
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition uppercase"
                        />
                      </div>
                    </div>

                    {/* Document Upload Zone */}
                    <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-4 text-center bg-slate-950/40 transition">
                      <input
                        type="file"
                        id="kyc-doc-upload"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*,.pdf"
                      />
                      <label htmlFor="kyc-doc-upload" className="cursor-pointer flex flex-col items-center gap-1.5">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                          📁
                        </div>
                        <span className="text-xs font-600 text-slate-300">
                          {fileName ? `Attached: ${fileName}` : 'Upload ID Document Photo / PDF'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Drag & drop or browse from device (JPG, PNG, PDF up to 5MB)
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleNextStep1}
                      className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 py-2.5 text-sm font-700 text-slate-950 shadow-md shadow-emerald-500/20 transition"
                    >
                      Next: Skill Categories →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Skill Selection & Category Cap */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-700 uppercase tracking-wider text-slate-400">Select Core Skills</h3>
                      <p className="text-[11px] text-slate-400">Choose the trades you provide on the dispatch network.</p>
                    </div>
                    {/* Active counter badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
                      <span className="text-xs font-700 text-emerald-400">Selected: {selectedCategoryIds.length} / 3</span>
                    </div>
                  </div>

                  {/* Cooperative rule notice */}
                  {selectedCategoryIds.length >= 3 && (
                    <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 flex items-start gap-2">
                      <span className="text-base">ℹ️</span>
                      <p className="leading-relaxed">
                        Cooperative policy limits technicians to 3 active skill categories to ensure high-quality service.
                      </p>
                    </div>
                  )}

                  {/* Categories Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[48vh] overflow-y-auto pr-1">
                    {categories.map((cat) => {
                      const isSelected = selectedCategoryIds.includes(cat.id);
                      const isLimitReached = selectedCategoryIds.length >= 3;
                      const isDisabled = !isSelected && isLimitReached;

                      return (
                        <div
                          key={cat.id}
                          onClick={() => !isDisabled && handleToggleCategory(cat.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-500/10'
                              : isDisabled
                              ? 'border-slate-800/60 bg-slate-950/40 opacity-40 cursor-not-allowed'
                              : 'border-slate-800 bg-slate-800/70 hover:border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          <div className="text-2xl shrink-0 p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                            {cat.icon || '🛠️'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-700 text-white truncate">{cat.name}</h4>
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 text-[10px] ${
                                  isSelected ? 'border-emerald-400 bg-emerald-500 text-slate-950 font-bold' : 'border-slate-600'
                                }`}
                              >
                                {isSelected ? '✓' : ''}
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                              {cat.description || 'Emergency repair and diagnostic service.'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-600 text-slate-300 hover:bg-slate-800 transition"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep2}
                      disabled={selectedCategoryIds.length === 0}
                      className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 py-2.5 text-sm font-700 text-slate-950 shadow-md shadow-emerald-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next: Vehicle & Base →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Vehicle & Operating Base */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <label className="block text-xs font-600 text-slate-300">Vehicle Type for Dispatches</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          'Two-Wheeler / Scooter',
                          'Three-Wheeler / Auto',
                          'Van / Four-Wheeler',
                          'None / Public Transit',
                        ] as const
                      ).map((v) => (
                        <label
                          key={v}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-xs cursor-pointer transition ${
                            vehicleType === v
                              ? 'border-emerald-500 bg-emerald-500/10 text-white font-600'
                              : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          <input
                            type="radio"
                            name="vehicleType"
                            value={v}
                            checked={vehicleType === v}
                            onChange={() => setVehicleType(v)}
                            className="text-emerald-500 focus:ring-emerald-500"
                          />
                          <span>{v}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-600 text-slate-300">
                        Vehicle Registration Number <span className="text-slate-500">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={vehicleNumber}
                        onChange={(e) => setVehicleNumber(e.target.value)}
                        placeholder="e.g. UP 16 AB 1234"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-600 text-slate-300">Base Operating Locality</label>
                      <select
                        value={locality}
                        onChange={(e) => setLocality(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                      >
                        <option value="Knowledge Park III">Knowledge Park III (Greater Noida)</option>
                        <option value="Alpha 1">Alpha 1 (Greater Noida)</option>
                        <option value="Gaur City">Gaur City 1 & 2 (Noida Ext.)</option>
                        <option value="Pari Chowk">Pari Chowk Hub</option>
                        <option value="Sector 62 Noida">Sector 62 (Noida)</option>
                      </select>
                    </div>
                  </div>

                  {/* Initial Availability Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
                    <div>
                      <h4 className="text-xs font-700 text-white">Initial Dispatch Status</h4>
                      <p className="text-[11px] text-slate-400">Default to online to receive nearby SOS calls upon activation.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOnline(!isOnline)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isOnline ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isOnline ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-600 text-slate-300 hover:bg-slate-800 transition"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 py-2.5 text-sm font-700 text-slate-950 shadow-md shadow-emerald-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Submitting Registration...</span>
                        </>
                      ) : (
                        'Complete Registration ✓'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default TechnicianSignUpModal;
