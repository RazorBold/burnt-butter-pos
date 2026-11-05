"use client"

import { CircleAlert } from "lucide-react"
import { cloneElement, type ReactElement, type ReactNode } from "react"

import { Label } from "@/components/ui/label"
import {
  SHIPPING_METHOD_LABEL,
  SHIPPING_METHOD_NOTE,
  WA_SHIPPING_METHODS,
} from "@/features/orders/constants"
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

/** Kartu radio metode pengiriman dengan keterangan dari template WA. */
export function ShippingMethodPicker({
  value,
  onChange,
  flag,
  compact = false,
}: {
  value: ShippingMethod | ""
  onChange: (method: ShippingMethod) => void
  flag?: string
  /** Tanpa keterangan, untuk dialog yang sempit. */
  compact?: boolean
}) {
  return (
    <div id="field-shippingMethod" className="scroll-mt-28">
      <div
        role="radiogroup"
        aria-label="Metode pengiriman"
        aria-describedby={flag ? "shippingMethod-flag" : undefined}
        className="grid gap-2 sm:grid-cols-3"
      >
        {WA_SHIPPING_METHODS.map((method) => {
          const checked = value === method
          return (
            <label
              key={method}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border bg-white px-3.5 py-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                checked ? "border-brand bg-nav-active" : "border-border",
                flag && "border-[#d9a441]",
              )}
            >
              <input
                type="radio"
                name="shippingMethod"
                value={method}
                checked={checked}
                onChange={() => onChange(method)}
                className="mt-1 size-4 shrink-0 accent-brand"
              />
              <span>
                <span className="block font-semibold text-text-strong">
                  {SHIPPING_METHOD_LABEL[method]}
                </span>
                {!compact && (
                  <span className="block text-[13px] leading-snug text-text-body">
                    {SHIPPING_METHOD_NOTE[method]}
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
