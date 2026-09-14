import { useState } from 'react';
import type { BookingRecord } from '../types/domain';
import RaiseDisputeModal from './RaiseDisputeModal';

export interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingRecord | null;
}

export function BookingDetailsModal({ isOpen, onClose, booking }: BookingDetailsModalProps) {
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  if (!isOpen || !booking) return null;

  const priorityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  const priorityLabel = (booking.priority || 'medium').toLowerCase();
  const badgeClass = priorityColors[priorityLabel] || priorityColors.medium;

  const isCompleted = booking.status.toLowerCase().includes('completed');
  const isCancelled = booking.status.toLowerCase().includes('cancelled');

  const statusColorClass = isCompleted
    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
    : isCancelled
    ? 'bg-red-50 text-red-600 border-red-200'
    : 'bg-blue-50 text-blue-600 border-blue-200';

  const addressDisplay =
    booking.addressText ||
    (booking.addressLine
      ? `${booking.addressLine}${booking.area ? `, ${booking.area}` : ''}`
      : 'Primary Client Service Location');

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                booking.type === 'sos' ? 'bg-red-50' : 'bg-blue-50'
              }`}>
                {booking.icon}
              </div>
              <div>
                <h3 className="font-display font-800 text-lg text-gray-900 leading-tight">
                  {booking.service}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{booking.date}</p>
              </div>
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

          {/* Status & Priority Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-700 border ${statusColorClass}`}>
              {booking.status}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-700 border uppercase tracking-wider ${badgeClass}`}>
              {priorityLabel} Priority
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-700 ${
              booking.type === 'sos' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {booking.type === 'sos' ? 'Emergency SOS' : 'Scheduled Booking'}
            </span>
          </div>

          {/* Assigned Technician */}
          <div className="bg-gray-50 rounded-xl p-3.5 flex items-center justify-between border border-gray-100">
            <div>
              <p className="text-xs text-gray-400 font-500">Technician</p>
              <p className="font-600 text-sm text-gray-900 mt-0.5">{booking.technician || 'Pending Assignment'}</p>
              {booking.technicianPhone && (
                <p className="text-xs text-blue-600 font-500 mt-0.5">{booking.technicianPhone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 font-500">Amount</p>
              <p className="font-display font-800 text-base text-gray-900 mt-0.5">{booking.amount}</p>
            </div>
          </div>

          {/* Service Address & Access Notes */}
          <div className="space-y-1.5">
            <p className="text-xs font-700 uppercase tracking-wider text-gray-400">
              Service Address & Access Notes
            </p>
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="text-base mt-0.5 shrink-0">📍</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-600 text-gray-900 leading-snug">
                    {addressDisplay}
                  </p>
                  {booking.addressNotes && (
                    <div className="mt-2 rounded-lg bg-white p-2.5 border border-gray-200/70 text-xs text-gray-700 leading-relaxed shadow-2xs">
                      <span className="font-700 text-amber-800">Landmark / Access: </span>
                      <span>{booking.addressNotes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Problem Description & Symptoms */}
          <div className="space-y-1.5">
            <p className="text-xs font-700 uppercase tracking-wider text-gray-400">Problem Description</p>
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-700 leading-relaxed">
              {booking.description || 'Routine service inspection and repair requested at client address.'}
            </div>
          </div>

          {/* Attached Photos / Media */}
          <div className="space-y-2">
            <p className="text-xs font-700 uppercase tracking-wider text-gray-400">Attached Media & Photos</p>
            {booking.photos && booking.photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {booking.photos.map((url, idx) => (
                  <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                    <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                No photo attachments uploaded for this request
              </div>
            )}
          </div>

          {/* Report an Issue / Raise Complaint */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowDisputeModal(true)}
              className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-display font-600 text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>⚠️</span>
              <span>Report an Issue / Raise Complaint</span>
            </button>
          </div>

          {/* Close button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-display font-700 text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <RaiseDisputeModal
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        requestId={booking.id}
        serviceName={booking.service}
        technicianName={booking.technician}
      />
    </>
  );
}

export default BookingDetailsModal;
