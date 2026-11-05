"use client"

import { format, parseISO } from "date-fns"
import { CalendarDays } from "lucide-react"
import { useState } from "react"
import type { DateRange } from "react-day-picker"
import { id as localeId } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toJakartaDateString } from "@/lib/format"
import { cn } from "@/lib/utils"

type Range = { from: string; to: string }

const toIso = (date: Date) => format(date, "yyyy-MM-dd")
const display = (iso: string) => format(parseISO(iso), "dd/MM/yyyy")

function addDays(iso: string, days: number) {
  const date = parseISO(iso)
  date.setDate(date.getDate() + days)
  return toIso(date)
}

/** Preset dihitung dari "hari ini" WIB saat dipilih, bukan saat halaman dimuat. */
const PRESETS: { label: string; range: (today: string) => Range }[] = [
  { label: "Hari ini", range: (today) => ({ from: today, to: today }) },
  { label: "Kemarin", range: (today) => ({ from: addDays(today, -1), to: addDays(today, -1) }) },
  { label: "7 hari terakhir", range: (today) => ({ from: addDays(today, -6), to: today }) },
  { label: "Bulan ini", range: (today) => ({ from: `${today.slice(0, 8)}01`, to: today }) },
]

/**
 * Tombol rentang tanggal "21/10/2026 – 21/10/2026" dengan kalender dan preset.
 * Nilai berupa "YYYY-MM-DD" (tanggal WIB). `onChange` dipanggil saat rentang diterapkan.
 */
export function DateRangePicker({
  from,
  to,
  onChange,
  label = "Rentang tanggal",
  className,
}: {
  from: string
  to: string
  onChange: (range: Range) => void
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>()

  function apply(range: Range) {
    onChange(range)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setDraft({ from: parseISO(from), to: parseISO(to) })
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`${label}: ${display(from)} sampai ${display(to)}`}
          className={cn(
            "h-10 justify-start gap-2.5 rounded-lg bg-white px-3 font-normal text-text-strong tabular-nums",
            className,
          )}
        >
          <CalendarDays className="size-[18px] text-brand-ink" aria-hidden />
          <span>{display(from)}</span>
          <span aria-hidden className="text-text-body">
            –
          </span>
          <span>{display(to)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto rounded-xl p-0">
        <div className="flex flex-col sm:flex-row">
          <ul className="flex flex-wrap gap-1 border-b border-border p-2 sm:w-40 sm:flex-col sm:border-r sm:border-b-0">
            {PRESETS.map((preset) => (
              <li key={preset.label}>
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={() => apply(preset.range(toJakartaDateString(new Date())))}
                  className="h-9 w-full rounded-md px-3 text-left text-sm text-text-strong outline-none hover:bg-nav-active focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {preset.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="p-2">
            <Calendar
              mode="range"
              locale={localeId}
              selected={draft}
              onSelect={setDraft}
              defaultMonth={parseISO(to)}
              numberOfMonths={1}
            />
            <div className="flex items-center justify-between gap-3 border-t border-border px-2 pt-2">
              <p className="text-[13px] text-text-body tabular-nums">
                {draft?.from ? format(draft.from, "dd/MM/yyyy") : "Pilih tanggal awal"}
                {draft?.to && ` – ${format(draft.to, "dd/MM/yyyy")}`}
              </p>
              <Button
                type="button"
                size="sm"
                disabled={!draft?.from}
                onClick={() =>
                  draft?.from &&
                  apply({ from: toIso(draft.from), to: toIso(draft.to ?? draft.from) })
                }
                className="h-9 rounded-md px-4"
              >
                Terapkan
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
