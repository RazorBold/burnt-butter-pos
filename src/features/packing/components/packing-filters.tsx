"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { ORDER_KINDS } from "@/features/orders/constants"
import {
  PACKING_KIND_LABEL,
  PACKING_SOURCE_LABEL,
  PACKING_SOURCES,
  PACKING_TYPE_LABEL,
  PACKING_TYPES,
  type PackingFilters,
} from "@/features/packing/filters"
import { useDebouncedQuery, useUrlFilters } from "@/hooks/use-url-filters"
import { cn } from "@/lib/utils"

/**
 * Filter papan Packaging: Tipe (Normal / Hampers; pesanan Normal & Hampers ikut keduanya) dan
 * Sumber (WhatsApp / Olshop = Shopee + Tokopedia, atau per marketplace), Jenis (PO / RS / MTO),
 * dan kotak Cari (no. pesanan, penerima, pengirim, no. telp). Disimpan di URL.
 */
export function PackingFiltersBar({ filters }: { filters: PackingFilters }) {
  const { current, update, pending } = useUrlFilters()
  const [query, setQuery] = useDebouncedQuery(current, update)

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
      <div className="relative w-full min-w-0 sm:w-72">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-body"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari no. pesanan, invoice, nama, no. telp…"
          aria-label="Cari pesanan"
          className="h-10 rounded-lg bg-white pl-9"
        />
      </div>
      {group("Jenis", "jenis", filters.kind, ORDER_KINDS, PACKING_KIND_LABEL)}
      {group("Tipe", "tipe", filters.type, PACKING_TYPES, PACKING_TYPE_LABEL)}
      {group("Sumber", "sumber", filters.source, PACKING_SOURCES, PACKING_SOURCE_LABEL)}
    </div>
  )
}
