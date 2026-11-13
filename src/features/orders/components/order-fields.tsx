"use client"

import { CircleAlert } from "lucide-react"
import { cloneElement, type ReactElement, type ReactNode } from "react"

import { Label } from "@/components/ui/label"
import { SHIPPING_METHOD_LABEL, WA_SHIPPING_METHODS } from "@/features/orders/constants"
import {
  selectedOption,
  shippingNote,
  type ShippingOptionChoice,
} from "@/features/shipping-options/options"
import { cn } from "@/lib/utils"
import type { ShippingMethod } from "@/lib/wa-parser"

// Isian bersama form Input Pesanan dan dialog Ubah data pesanan.

/** Catatan kuning "perlu dicek" di bawah isian. */
export function FlagNote({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-[13px] text-[#8a5a00]">
      <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  )
}

type ControlProps = { id?: string; "aria-describedby"?: string }

/** Label + isian + catatan. Isian (satu elemen) diberi id dan aria-describedby di sini. */
export function Field({
  id,
  label,
  optional = false,
  flag,
  hint,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  flag?: string
  hint?: string
  children: ReactElement<ControlProps>
}) {
  const note = flag ? `${id}-flag` : hint ? `${id}-hint` : undefined
  return (
    <div
      id={`field-${id}`}
      className={cn(
        "scroll-mt-28 space-y-1.5 [&_input]:h-11 [&_input]:rounded-lg [&_input]:bg-white [&_textarea]:rounded-lg [&_textarea]:bg-white",
        flag && "[&_input]:border-[#d9a441] [&_textarea]:border-[#d9a441]",
      )}
    >
      <Label htmlFor={`order-${id}`} className="text-text-strong">
        {label} {optional && <span className="font-normal text-text-body">(opsional)</span>}
      </Label>
      {cloneElement(children, { id: `order-${id}`, "aria-describedby": note })}
      {hint && !flag && (
        <p id={`${id}-hint`} className="text-[13px] text-text-body">
          {hint}
        </p>
      )}
      {flag && <FlagNote id={`${id}-flag`}>{flag}</FlagNote>}
    </div>
  )
}

/**
 * Kartu radio kategori pengiriman (Master Data › Kurir & Pengiriman). Tanpa kategori (data lama
 * atau belum diatur) jatuh ke tiga alur bawaan WhatsApp. Nilai yang dikirim: alur dasar + id.
 */
export function ShippingMethodPicker({
  value,
  optionId,
  options,
  onChange,
  flag,
  compact = false,
}: {
  value: ShippingMethod | ""
  optionId?: string
  options: readonly ShippingOptionChoice[]
  onChange: (method: ShippingMethod, optionId: string) => void
  flag?: string
  /** Tanpa keterangan, untuk dialog yang sempit. */
  compact?: boolean
}) {
  // Ekspedisi hanya untuk pesanan marketplace (diisi otomatis), jadi tidak ditawarkan di sini.
  const choices: ShippingOptionChoice[] = options.some((option) => option.flow !== "ekspedisi")
    ? options.filter((option) => option.flow !== "ekspedisi")
    : WA_SHIPPING_METHODS.map((method) => ({
        id: "",
        name: SHIPPING_METHOD_LABEL[method],
        flow: method,
        liveTracking: false,
        note: null,
      }))
  const current = selectedOption(choices, value, optionId)

  return (
    <div id="field-shippingMethod" className="scroll-mt-28">
      <div
        role="radiogroup"
        aria-label="Metode pengiriman"
        aria-describedby={flag ? "shippingMethod-flag" : undefined}
        className="grid gap-2 sm:grid-cols-3"
      >
        {choices.map((choice) => {
          const checked = current ? current === choice : false
          return (
            <label
              key={choice.id || choice.flow}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border bg-white px-3.5 py-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                checked ? "border-brand bg-nav-active" : "border-border",
                flag && "border-[#d9a441]",
              )}
            >
              <input
                suppressHydrationWarning
                type="radio"
                name="shippingMethod"
                value={choice.id || choice.flow}
                checked={checked}
                onChange={() => onChange(choice.flow, choice.id)}
                className="mt-1 size-4 shrink-0 accent-brand"
              />
              <span>
                <span className="block font-semibold text-text-strong">{choice.name}</span>
                {!compact && (
                  <span className="block text-[13px] leading-snug text-text-body">
                    {shippingNote(choice)}
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>
      {flag && <FlagNote id="shippingMethod-flag">{flag}</FlagNote>}
    </div>
  )
}
