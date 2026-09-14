import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export interface RaiseDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  serviceName?: string;
  technicianName?: string;
  onDisputeCreated?: () => void;
}

type DisputeReason =
  | 'quality_issue'
  | 'price_dispute'
  | 'property_damage'
  | 'no_show'
  | 'safety_concern'
  | 'harassment'
  | 'other';

const DISPUTE_REASONS: { value: DisputeReason; label: string; desc: string }[] = [
  {
    value: 'quality_issue',
    label: 'Service Quality or Incomplete Work',
    desc: 'Workmanship defect, unresolved issue, or substandard repair.',
  },
  {
    value: 'price_dispute',
    label: 'Price Dispute or Unauthorized Charges',
    desc: 'Charged above agreed estimate or unapproved part costs.',
  },
  {
    value: 'property_damage',
    label: 'Property or Appliance Damage',
    desc: 'Accidental or careless damage caused to property during service.',
  },
  {
    value: 'no_show',
    label: 'Technician No-Show or Abandonment',
    desc: 'Technician accepted job but never arrived or left midway.',
  },
  {
    value: 'safety_concern',
    label: 'Safety Concern or Protocol Breach',
    desc: 'Failure to observe basic safety, electrical, or hazard standards.',
  },
  {
    value: 'harassment',
    label: 'Harassment or Inappropriate Conduct',
    desc: 'Unacceptable, abusive, or unprofessional communication.',
  },
  {
    value: 'other',
    label: 'Other Operational Issue',
    desc: 'Any other grievance requiring platform mediation.',
  },
];

export default function RaiseDisputeModal({
  isOpen,
  onClose,
  requestId,
  serviceName,
  technicianName,
  onDisputeCreated,
}: RaiseDisputeModalProps) {
  const { user, userId } = useAuth();
  const [reasonCategory, setReasonCategory] = useState<DisputeReason>('quality_issue');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedDisputeId, setSubmittedDisputeId] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeUid = user?.id || userId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUid) {
      setErrorMsg('You must be signed in to raise a complaint.');
      return;
    }
    if (description.trim().length < 10) {
      setErrorMsg('Please provide a description of at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from('disputes')
        .insert({
          request_id: requestId,
          initiator_id: activeUid,
          initiator_role: 'client',
          reason_category: reasonCategory,
          description: description.trim(),
          status: 'open',
        })
        .select('id')
        .single();

      if (error) {
        // Check if an active dispute already exists
        if (error.code === '23505' || error.message.includes('disputes_one_active_per_request')) {
          setErrorMsg('An active dispute is already open for this service request.');
        } else {
          setErrorMsg(error.message || 'Failed to file complaint. Please try again.');
        }
      } else {
        setSubmittedDisputeId(data?.id || 'SUBMITTED');
        if (onDisputeCreated) {
          onDisputeCreated();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setErrorMsg(null);
    setSubmittedDisputeId(null);
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {submittedDisputeId ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-3xl">
              ✓
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display font-800 text-xl text-gray-900">
                Complaint Registered
              </h3>
              <p className="text-sm text-gray-600 max-w-sm mx-auto">
                Your complaint has been lodged directly with the SewaSync Mediation Console.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700 max-w-sm mx-auto space-y-1 text-left">
              <div className="flex justify-between">
                <span className="font-600 text-slate-500">Dispute ID:</span>
                <span className="font-mono font-bold text-slate-900">
                  #{submittedDisputeId.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-600 text-slate-500">Status:</span>
                <span className="font-bold text-amber-600">Pending Review</span>
              </div>
              <div className="flex justify-between">
                <span className="font-600 text-slate-500">SLA:</span>
                <span className="font-semibold text-slate-800">Under 2 hours</span>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              An administrative arbitrator will examine timestamps, GPS telemetry, and photos to resolve liability.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-display font-700 text-sm transition-colors shadow-sm"
              >
                Close & Return
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Dispute Resolution</p>
                <h3 className="font-display font-800 text-lg text-gray-900 leading-tight">
                  Report an Issue / File Complaint
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Context Info */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-400 font-500">Service: </span>
                <span className="font-600 text-gray-900">{serviceName || 'Service Request'}</span>
              </div>
              {technicianName && (
                <div>
                  <span className="text-gray-400 font-500">Tech: </span>
                  <span className="font-600 text-gray-900">{technicianName}</span>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* Reason Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Issue Category *
                </label>
                <div className="space-y-2">
                  {DISPUTE_REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        reasonCategory === r.value
                          ? 'border-red-500 bg-red-50/50 ring-1 ring-red-500/20'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="dispute_reason"
                        value={r.value}
                        checked={reasonCategory === r.value}
                        onChange={() => setReasonCategory(r.value)}
                        className="mt-0.5 text-red-600 focus:ring-red-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-700 text-gray-900 leading-tight">{r.label}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{r.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Describe what happened *
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide specific details (e.g. what was broken, what extra amount was demanded, or conduct issues)..."
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-900 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none placeholder:text-gray-400"
                  required
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Minimum 10 characters. This complaint is audited directly by operations staff.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-1/3 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-600 text-xs hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || description.trim().length < 10}
                  className="w-2/3 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-display font-700 text-xs shadow-md shadow-red-600/20 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none transition-all"
                >
                  {isSubmitting ? 'Submitting Dispute...' : 'Submit Complaint'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
