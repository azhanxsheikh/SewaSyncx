import type { Screen } from '../../types/navigation';
import { usePrimaryTechnician } from '../../hooks/useTechnicians';
import { useInvoiceDetails } from '../../hooks/useBilling';
import { useDispatch } from '../../context/DispatchContext';
import Header from '../../components/Header';

interface Props {
  navigate: (s: Screen) => void;
  onBack: () => void;
}

export default function DigitalInvoice({ navigate, onBack }: Props) {
  const tech = usePrimaryTechnician();
  const { job } = useDispatch();
  const { lineItems: invoiceLineItems, summary } = useInvoiceDetails(job);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Service Invoice" onBack={onBack} showNotification={false} />

      <div className="max-w-md mx-auto px-4 pt-4 pb-24">
        {/* Invoice header */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Brand header */}
          <div className="bg-gray-900 px-6 py-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-7 h-7 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-display font-800 text-xs">SH</span>
              </div>
              <span className="font-display font-700 text-white text-base">SOS HomeFix</span>
            </div>
            <p className="text-gray-400 text-xs">TAX INVOICE</p>
          </div>

          <div className="px-5 py-5">
            {/* Invoice meta */}
            <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Invoice No.</p>
                <p className="font-600 text-gray-900 text-sm">#INV-2026-09-2094</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-0.5">Date</p>
                <p className="font-600 text-gray-900 text-sm">Sep 5, 2026</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Job ID</p>
                <p className="font-600 text-gray-900 text-sm">{summary.jobId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-0.5">Time</p>
                <p className="font-600 text-gray-900 text-sm">2:42 PM – 3:54 PM</p>
              </div>
            </div>

            {/* Customer & Technician */}
            <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b border-gray-100 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-1">Billed to</p>
                <p className="font-600 text-gray-900">{summary.billedToName}</p>
                <p className="text-gray-500 text-xs">{summary.billedToAddressLine1}</p>
                <p className="text-gray-500 text-xs">{summary.billedToAddressLine2}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Technician</p>
                <p className="font-600 text-gray-900">{job?.technicianName || tech.name}</p>
                <p className="text-gray-500 text-xs">Electrician</p>
                <p className="text-gray-500 text-xs">⭐ {tech.rating} rating</p>
              </div>
            </div>

            {/* Line items */}
            <div className="mb-5">
              <div className="flex justify-between text-xs text-gray-400 mb-3 pb-2 border-b border-gray-50">
                <span>Description</span>
                <span>Amount</span>
              </div>
              {invoiceLineItems.map((item, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                  <span className="text-gray-700 pr-4">{item.desc}</span>
                  <span className="font-600 text-gray-900 flex-shrink-0">₹{item.amount}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-600 text-gray-900">₹{summary.subtotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">GST (0%)</span>
                <span className="font-600 text-gray-900">₹0</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="font-display font-800 text-gray-900">Total paid</span>
                <span className="font-display font-800 text-2xl text-gray-900">₹{summary.total}</span>
              </div>
            </div>

            {/* Payment status */}
            <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-emerald-700 font-600 text-sm">Payment confirmed</span>
              </div>
              <span className="font-display font-800 text-emerald-700 text-lg">PAID</span>
            </div>

            <div className="mt-3 text-xs text-gray-400 text-center">
              Paid via UPI · Sep 5, 2026 · 4:01 PM
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-100 px-5 py-4 text-center">
            <p className="text-xs text-gray-400">Thank you for using SOS HomeFix</p>
            <p className="text-xs text-gray-400 mt-0.5">support@soshomefix.in · 1800-SOS-HOME</p>
          </div>
        </div>

        {/* Download button */}
        <div className="mt-4 space-y-2">
          <button className="w-full py-3.5 rounded-xl font-display font-700 text-sm bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Invoice PDF
          </button>
          <button
            onClick={() => navigate('sos-rating')}
            className="w-full py-3.5 rounded-xl font-display font-700 text-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            Rate Your Experience →
          </button>
          <button
            onClick={onBack}
            className="w-full py-3 rounded-xl font-display font-600 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Done & View Bookings
          </button>
        </div>
      </div>
    </div>
  );
}
