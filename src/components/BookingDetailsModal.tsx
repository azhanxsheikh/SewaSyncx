import type { BookingRecord } from '../types/domain';

export interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingRecord | null;
}

export function BookingDetailsModal({ isOpen, onClose, booking }: BookingDetailsModalProps) {
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

  return (
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
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 font-500">Amount</p>
            <p className="font-display font-800 text-base text-gray-900 mt-0.5">{booking.amount}</p>
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

        {/* Close button */}
        <div className="pt-2">
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
  );
}

export default BookingDetailsModal;
