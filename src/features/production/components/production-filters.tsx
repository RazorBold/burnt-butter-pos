"use client"

import { ORDER_KINDS } from "@/features/orders/constants"
import { PACKING_KIND_LABEL } from "@/features/packing/filters"
import { useUrlFilters } from "@/hooks/use-url-filters"
import { cn } from "@/lib/utils"
import type { OrderKind } from "@/lib/wa-parser"

/** Filter Jenis (PO / RS / MTO) papan Produksi, disimpan di URL (?jenis=). Sama seperti Packaging. */
export function ProductionFiltersBar({ kind }: { kind: OrderKind | undefined }) {
  const { update, pending } = useUrlFilters()
  return (
    <div
      className={cn(
        "mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3",
        pending && "opacity-80",
      )}
    >
      <span id="production-filter-jenis" className="text-[13px] font-medium text-text-body">
        Jenis
      </span>
      <div
        role="group"
        aria-labelledby="production-filter-jenis"
        className="flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-border bg-white p-1 sm:gap-1"
      >
        {[undefined, ...ORDER_KINDS].map((option) => {
          const active = option === kind
          return (
            <button
              key={option ?? "semua"}
              type="button"
              aria-pressed={active}
              onClick={() => update({ jenis: option ?? null })}
              className={cn(
                "h-8 shrink-0 rounded-md px-2 text-[13px] font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-3",
                active ? "bg-brand text-white" : "text-text-strong hover:bg-nav-active",
              )}
            >
              {option ? PACKING_KIND_LABEL[option] : "Semua"}
            </button>
          )
        })}
      </div>
    </div>
  )
}
