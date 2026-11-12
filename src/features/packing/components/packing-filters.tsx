"use client"

import {
  PACKING_SOURCE_LABEL,
  PACKING_SOURCES,
  PACKING_TYPE_LABEL,
  PACKING_TYPES,
  type PackingFilters,
} from "@/features/packing/filters"
import { useUrlFilters } from "@/hooks/use-url-filters"
import { cn } from "@/lib/utils"

/**
 * Filter papan Packaging: Tipe (Normal / Hampers; pesanan Normal & Hampers ikut keduanya) dan
 * Sumber (WhatsApp / Olshop = Shopee + Tokopedia, atau per marketplace). Disimpan di URL.
 */
export function PackingFiltersBar({ filters }: { filters: PackingFilters }) {
  const { update, pending } = useUrlFilters()

  const group = <T extends string>(
    label: string,
    param: string,
    value: T | undefined,
    options: readonly T[],
    labels: Record<T, string>,
  ) => (
    <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
      <span id={`packing-filter-${param}`} className="text-[13px] font-medium text-text-body">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={`packing-filter-${param}`}
        className="flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-border bg-white p-1 sm:gap-1"
      >
        {[undefined, ...options].map((option) => {
          const active = option === value
          return (
            <button
              key={option ?? "semua"}
              type="button"
              aria-pressed={active}
              onClick={() => update({ [param]: option ?? null })}
              className={cn(
                "h-8 shrink-0 rounded-md px-2 text-[13px] font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-3",
                active ? "bg-brand text-white" : "text-text-strong hover:bg-nav-active",
              )}
            >
              {option ? labels[option] : "Semua"}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div
      className={cn(
        "mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-border bg-card p-3",
        pending && "opacity-80",
      )}
    >
      {group("Tipe", "tipe", filters.type, PACKING_TYPES, PACKING_TYPE_LABEL)}
      {group("Sumber", "sumber", filters.source, PACKING_SOURCES, PACKING_SOURCE_LABEL)}
    </div>
  )
}
