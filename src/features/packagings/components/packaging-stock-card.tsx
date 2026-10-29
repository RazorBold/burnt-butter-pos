"use client"

import { Minus, Package, Plus, RefreshCw } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

import { STOCK_BAR_COLOR, StockBadge } from "@/components/app/stock-badge"
import { Button } from "@/components/ui/button"
import { StockMovementDialog } from "@/features/packagings/components/stock-movement-dialog"
import type { PackagingRow } from "@/features/packagings/queries"
import type { MovementMode } from "@/features/packagings/stock"
import { photoSrc } from "@/lib/photos"
import { cn } from "@/lib/utils"

/**
 * Kartu stok satu packaging di menu Stok Packaging: stok sekarang, bar stok / kapasitas
 * (F-19), status, dan tombol Masuk / Keluar / Hitung ulang.
 */
export function PackagingStockCard({
  packaging,
  canEdit,
}: {
  packaging: PackagingRow
  canEdit: boolean
}) {
  const [mode, setMode] = useState<MovementMode>("masuk")
  const [open, setOpen] = useState(false)
  const openWith = (next: MovementMode) => {
    setMode(next)
    setOpen(true)
  }
  const src = photoSrc(packaging.photoPath)
  const percent = packaging.capacity
    ? Math.min(100, Math.round((packaging.stock / packaging.capacity) * 100))
    : null

  return (
    <article
      aria-labelledby={`pack-${packaging.id}`}
      className="flex w-full flex-col rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-start gap-3.5">
        {src ? (
          <Image
            src={src}
            alt=""
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-icon-bg text-brand-ink">
            <Package className="size-6" strokeWidth={1.75} aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 id={`pack-${packaging.id}`} className="font-semibold text-text-strong">
            {packaging.name}
          </h3>
          <p className="mt-0.5 text-[26px] leading-tight font-bold text-brand-ink tabular-nums">
            {packaging.stock}{" "}
            <span className="text-sm font-medium text-text-body">{packaging.unit}</span>
          </p>
        </div>
        <StockBadge status={packaging.status} />
      </div>

      <div className="mt-4">
        {percent !== null && (
          <div
            role="img"
            aria-label={`${packaging.stock} dari kapasitas ${packaging.capacity} ${packaging.unit}`}
            className="h-2 overflow-hidden rounded-full bg-nav-active"
          >
            <div
              className={cn("h-full rounded-full", STOCK_BAR_COLOR[packaging.status])}
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
        <p className="mt-2 text-[13px] text-text-body tabular-nums">
          {packaging.minStock !== null
            ? `Minimum ${packaging.minStock} ${packaging.unit}`
            : "Stok minimum belum diatur"}
          {packaging.capacity !== null && `, kapasitas ${packaging.capacity}`}
        </p>
      </div>

      {canEdit && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={() => openWith("masuk")}
            className="h-10 rounded-lg bg-white px-2"
            aria-label={`Stok masuk ${packaging.name}`}
          >
            <Plus aria-hidden />
            Masuk
          </Button>
          <Button
            variant="outline"
            onClick={() => openWith("keluar")}
            disabled={packaging.stock === 0}
            className="h-10 rounded-lg bg-white px-2"
            aria-label={`Stok keluar ${packaging.name}`}
          >
            <Minus aria-hidden />
            Keluar
          </Button>
          <Button
            variant="outline"
            onClick={() => openWith("hitung")}
            className="h-10 rounded-lg bg-white px-2"
            aria-label={`Hitung ulang ${packaging.name}`}
          >
            <RefreshCw aria-hidden />
            Hitung
          </Button>
        </div>
      )}

      <StockMovementDialog
        item={packaging}
        kind="packaging"
        mode={mode}
        open={open}
        onOpenChange={setOpen}
      />
    </article>
  )
}
