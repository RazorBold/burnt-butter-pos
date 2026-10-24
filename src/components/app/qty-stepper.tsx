"use client"

import { Minus, Plus } from "lucide-react"

import { cn } from "@/lib/utils"

/** Jumlah dengan tombol − / +. Kosong berarti 0. `label` dipakai untuk nama aksesibel. */
export function QtyStepper({
  value,
  onChange,
  label,
  max = 99,
}: {
  value: number
  onChange: (value: number) => void
  label: string
  max?: number
}) {
  const button =
    "flex size-9 items-center justify-center text-brand-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:text-text-body/40"

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center rounded-lg border bg-white",
        value > 0 ? "border-brand" : "border-border",
      )}
    >
      <button
        type="button"
        aria-label={`Kurangi ${label}`}
        disabled={value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className={cn(button, "rounded-l-lg")}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={`Jumlah ${label}`}
        value={value ? String(value) : ""}
        placeholder="0"
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "")
          onChange(Math.min(max, digits ? Number(digits) : 0))
        }}
        onFocus={(event) => event.target.select()}
        className="h-9 w-9 bg-transparent text-center font-semibold text-text-strong tabular-nums outline-none placeholder:font-normal placeholder:text-text-body/60"
      />
      <button
        type="button"
        aria-label={`Tambah ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(button, "rounded-r-lg")}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  )
}
