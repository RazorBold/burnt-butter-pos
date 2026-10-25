"use client"

import { format, parseISO } from "date-fns"
import { id as localeId } from "date-fns/locale"
import { CalendarDays } from "lucide-react"

import { PERIOD_LABEL, PERIODS, type Period } from "@/features/dashboard/period"
import { useUrlFilters } from "@/hooks/use-url-filters"
import { cn } from "@/lib/utils"

/** Tanggal acuan + periode Dashboard (F-10, F-11). Disimpan di URL (?tanggal=&periode=). */
export function PeriodPicker({
  anchor,
  period,
  today,
}: {
  anchor: string
  period: Period
  today: string
}) {
  const { update, pending } = useUrlFilters()

  return (
    <div className={cn("flex flex-wrap items-center gap-3", pending && "opacity-80")}>
      <label className="relative flex h-11 min-w-[240px] items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 text-[15px] text-text-strong focus-within:ring-3 focus-within:ring-ring/50">
        <CalendarDays className="size-5 shrink-0 text-brand-ink" aria-hidden />
        <span aria-hidden>
          {format(parseISO(anchor), "EEEE, d MMMM yyyy", { locale: localeId })}
        </span>
        {/* Input tanggal asli menutupi seluruh kotak supaya pemilih bawaan browser terbuka. */}
        <input
          type="date"
          aria-label="Tanggal acuan"
          value={anchor}
          max={today}
          onChange={(event) =>
            event.target.value &&
            update({ tanggal: event.target.value === today ? null : event.target.value })
          }
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <div
        role="group"
        aria-label="Periode"
        className="inline-flex rounded-xl border border-border bg-white p-1"
      >
        {PERIODS.map((value) => {
          const selected = value === period
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => update({ periode: value === "hari" ? null : value })}
              className={cn(
                "h-9 rounded-lg px-4 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected ? "bg-brand text-white" : "text-text-strong hover:bg-nav-active",
              )}
            >
              {PERIOD_LABEL[value]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
