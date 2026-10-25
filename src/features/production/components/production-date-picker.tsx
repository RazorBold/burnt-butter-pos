"use client"

import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"

import { Input } from "@/components/ui/input"
import { addDays } from "@/features/orders/filters"
import { cn } from "@/lib/utils"

/** Pilih tanggal kirim (?tanggal=): Hari ini, Besok, atau tanggal lain. Default hari ini. */
export function ProductionDatePicker({ date, today }: { date: string; today: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  const tomorrow = addDays(today, 1)

  function go(next: string) {
    if (!next) return
    startTransition(() =>
      router.replace(next === today ? pathname : `${pathname}?tanggal=${next}`, { scroll: false }),
    )
  }

  const chip = (value: string, label: string) => (
    <button
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
      <label className="sr-only" htmlFor="production-date">
        Tanggal kirim
      </label>
      <Input
        id="production-date"
        type="date"
        value={date}
        onChange={(event) => go(event.target.value)}
        className="h-10 w-[170px] rounded-lg bg-white tabular-nums"
      />
    </div>
  )
}
