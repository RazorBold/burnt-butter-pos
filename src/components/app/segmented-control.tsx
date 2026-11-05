"use client"

import { useRef } from "react"

import { cn } from "@/lib/utils"

type Option<T extends string> = { value: T; label: string }

/**
 * Pilihan tunggal berbentuk tombol bersebelahan (radiogroup).
 * Panah kiri/kanan berpindah pilihan, sesuai pola radiogroup WAI-ARIA.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly Option<T>[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = (index + step + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg border border-border bg-white p-1"
    >
      {options.map((option, index) => {
        const checked = option.value === value
        return (
          <button
            suppressHydrationWarning
            key={option.value}
            ref={(element) => {
              refs.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "h-9 rounded-md px-3.5 text-sm font-medium whitespace-nowrap text-text-body outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              checked && "bg-brand text-white",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
