import { useState, useMemo } from "react"
import type {
  AdminDisputeItem,
  DisputePriority,
} from "../../hooks/useAdminDisputes"

interface Props {
  disputes: AdminDisputeItem[]
  selectedId: string
  onSelect: (id: string) => void
  loading: boolean
  filterPriority: DisputePriority | "all"
  onFilterChange: (p: DisputePriority | "all") => void
}

const ITEMS_PER_PAGE = 10

export default function DisputesQueue({
  disputes,
  selectedId,
  onSelect,
  loading,
  filterPriority,
  onFilterChange,
}: Props) {
  const [currentPage, setCurrentPage] = useState(1)

  const filteredDisputes = useMemo(() => {
    if (filterPriority === "all") return disputes
    return disputes.filter((d) => d.priority === filterPriority)
  }, [disputes, filterPriority])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDisputes.length / ITEMS_PER_PAGE),
  )

  const paginatedDisputes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredDisputes.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredDisputes, currentPage])

  const getPriorityBadgeClass = (priority: DisputePriority) => {
    if (priority === "critical")
      return "bg-rose-50 text-rose-700 border-rose-200"
    if (priority === "high")
      return "bg-amber-50 text-amber-700 border-amber-200"
    if (priority === "medium") return "bg-sky-50 text-sky-700 border-sky-200"
    return "bg-slate-100 text-slate-700 border-slate-200"
  }

  return (
    <div className="space-y-3 lg:w-96 shrink-0">
      {/* Filter Row */}
      <div className="flex flex-wrap gap-1.5 mb-1">
        {(["all", "critical", "high", "medium", "low"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              onFilterChange(p)
              setCurrentPage(1)
            }}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase transition-all shadow-xs ${
              filterPriority === p
                ? "bg-[#0B132B] text-white shadow-sm ring-1 ring-sky-400/20"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Disputes Queue ({filteredDisputes.length})
        </p>
        <span className="text-xs text-slate-400 font-semibold">
          Page {currentPage} of {totalPages}
        </span>
      </div>

      <div className="space-y-2.5">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 shadow-xs">
            <div className="inline-block h-4 w-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
            Loading active disputes...
          </div>
        ) : paginatedDisputes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500 shadow-xs">
            No active disputes matching filter.
          </div>
        ) : (
          paginatedDisputes.map((dispute) => {
            const isSelected = dispute.id === selectedId
            return (
              <div
                key={dispute.id}
                className={`rounded-2xl border p-4 transition-all shadow-xs ${
                  isSelected
                    ? "border-sky-500 bg-sky-50/60 shadow-sm ring-2 ring-sky-400/20"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${getPriorityBadgeClass(
                      dispute.priority,
                    )}`}
                  >
                    {dispute.priority}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {dispute.createdAt}
                  </span>
                </div>

                <p className="font-display font-bold text-slate-900 text-sm capitalize">
                  {dispute.reasonCategory.replace(/_/g, " ")} ·{" "}
                  {dispute.serviceCategory}
                </p>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {dispute.description}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">
                      {dispute.clientName} · {dispute.technicianName}
                    </span>
                    <span className="font-extrabold text-slate-900 text-xs text-sky-700">
                      Escrow: ₹{dispute.escrowAmount}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelect(dispute.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-xs ${
                      isSelected
                        ? "bg-sky-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                    }`}
                  >
                    {isSelected ? "Viewing Details" : "View Details"}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <span className="text-xs font-semibold text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
