"use client"

import Image from "next/image"

import { QtyStepper } from "@/components/app/qty-stepper"
import { type CatalogVariant, groupCatalog } from "@/features/orders/catalog"
import { formatRupiah } from "@/lib/format"
import { photoSrc } from "@/lib/photos"
import { cn } from "@/lib/utils"

const SIZE_LABEL = { large: "Large", regular: "Regular", single: "" } as const

/**
 * Daftar menu berkelompok seperti template WA, dengan jumlah per varian. Bila `notes` diisi,
 * menu yang dipilih (jumlah > 0) mendapat kolom catatan sendiri (dialog Ubah menu).
 */
export function OrderMenuPicker({
  catalog,
  quantities,
  onChange,
  notes,
  onNoteChange,
}: {
  catalog: CatalogVariant[]
  quantities: Record<string, number>
  onChange: (variantId: string, qty: number) => void
  notes?: Record<string, string>
  onNoteChange?: (variantId: string, note: string) => void
}) {
  const groups = groupCatalog(catalog)

  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-text-body">
        Belum ada menu aktif. Aktifkan menu di Master Data › Produk & Menu.
      </p>
    )
  }

  return (
    <div className="grid gap-x-8 gap-y-6 xl:grid-cols-2">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`menu-group-${group.key}`}>
          <h3
            id={`menu-group-${group.key}`}
            className="mb-2 text-sm font-semibold text-text-strong"
          >
            {group.title}
          </h3>
          <ul className="divide-y divide-border rounded-xl border border-border bg-white">
            {group.variants.map((variant) => {
              const qty = quantities[variant.id] ?? 0
              const src = photoSrc(variant.photoPath)
              const label = [variant.menuName, SIZE_LABEL[variant.size]].filter(Boolean).join(" ")
              return (
                <li
                  key={variant.id}
                  className={cn(
                    "px-3 py-2.5 first:rounded-t-xl last:rounded-b-xl",
                    qty > 0 && "bg-nav-active/60",
                  )}
                >
                  <div className="flex items-center gap-3">
                    {src ? (
                      <Image
                        src={src}
                        alt=""
                        width={44}
                        height={44}
                        className="size-11 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span aria-hidden className="size-11 shrink-0 rounded-lg bg-nav-active" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug font-medium text-text-strong">
                        {variant.menuName}
                      </p>
                      <p className="text-[13px] text-text-body tabular-nums">
                        {formatRupiah(variant.price)}
                        {qty > 0 && (
                          <span className="font-medium text-brand-ink">
                            {` × ${qty} = ${formatRupiah(qty * variant.price)}`}
                          </span>
                        )}
                      </p>
                    </div>
                    <QtyStepper
                      value={qty}
                      label={label}
                      onChange={(value) => onChange(variant.id, value)}
                    />
                  </div>
                  {notes && onNoteChange && qty > 0 && (
                    <input
                      type="text"
                      value={notes[variant.id] ?? ""}
                      onChange={(event) => onNoteChange(variant.id, event.target.value)}
                      maxLength={120}
                      placeholder="Catatan menu ini (opsional), mis. extra keju"
                      aria-label={`Catatan ${label}`}
                      className="mt-2 h-9 w-full rounded-lg border border-border bg-white px-3 text-sm text-text-strong outline-none placeholder:text-text-body/70 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
