"use client"

import { Input } from "@/components/ui/input"
import { addDays } from "@/features/orders/filters"
import { useUrlFilters } from "@/hooks/use-url-filters"
import { cn } from "@/lib/utils"

/**
 * Pilih tanggal kirim (?tanggal=): Hari ini, Besok, atau tanggal lain. Default (tanpa parameter)
 * hari ini. Filter lain di URL dipertahankan; halaman kembali ke 1.
 */
export function DeliveryDatePicker({ date, today }: { date: string; today: string }) {
  const { update, pending } = useUrlFilters()
  const tomorrow = addDays(today, 1)

  function go(next: string) {
    if (next) update({ tanggal: next === today ? null : next })
  }

  const chip = (value: string, label: string) => (
    <button
      suppressHydrationWarning
      type="button"
      onClick={() => go(value)}
      aria-pressed={date === value}
      className={cn(
        "h-10 rounded-lg border px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        date === value
          ? "border-brand bg-brand text-white"
          : "border-border bg-white text-text-strong hover:bg-nav-active",
      )}
    >
      {label}
    </button>
  )

  return (
    <div className={cn("flex flex-wrap items-center gap-2", pending && "opacity-80")}>
      {chip(today, "Hari ini")}
      {chip(tomorrow, "Besok")}
      <label className="sr-only" htmlFor="delivery-date">
        Tanggal kirim
      </label>
      <Input
        id="delivery-date"
        type="date"
        value={date}
        onChange={(event) => go(event.target.value)}
        className="h-10 w-[170px] rounded-lg bg-white tabular-nums"
      />
    </div>
  )
}
