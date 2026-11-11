"use client"

import {
  CircleAlert,
  Gift,
  LoaderCircle,
  MessageSquareText,
  PackageCheck,
  StickyNote,
  Undo2,
} from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { OrderStatusBadge, UrgentBadge } from "@/components/app/order-badges"
import { isUrgent } from "@/features/orders/status"
import { SegmentedControl } from "@/components/app/segmented-control"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SHIPPING_METHOD_LABEL } from "@/features/orders/constants"
import { packOrder, unpackOrder } from "@/features/packing/actions"
import type { PackagingUse } from "@/features/packing/needs"
import type { PackingOrder, PackingPackaging } from "@/features/packing/queries"
import { cn } from "@/lib/utils"

const SIZE_LABEL = { large: "Large", regular: "Regular", single: null } as const

/** "2 Box Large, 1 Paper Bag". */
export function usesText(uses: PackagingUse[], packagings: PackingPackaging[]): string {
  const name = new Map(packagings.map((item) => [item.id, item.name]))
  return uses.map((use) => `${use.qty} ${name.get(use.packagingId) ?? "Packaging"}`).join(", ")
}

/** Kartu pesanan di papan Packaging: isi menu, kebutuhan/pemakaian packaging, dan aksinya. */
export function PackingOrderCard({
  order,
  packagings,
  canEdit,
}: {
  order: PackingOrder
  packagings: PackingPackaging[]
  canEdit: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const waiting = order.status === "siap_packing"

  function unpack() {
    startTransition(async () => {
      const result = await unpackOrder(order.id)
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <article
      aria-labelledby={`pack-${order.id}`}
      className={cn(
        "rounded-xl border bg-white p-4",
        isUrgent(order) ? "border-[#d93a2b] shadow-[inset_4px_0_0_#d93a2b]" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 id={`pack-${order.id}`} className="font-semibold text-text-strong tabular-nums">
            {order.orderNo}
          </h4>
          <p className="text-[13px] text-text-body">
            {order.customerName}
            {order.senderName && ` (dari ${order.senderName})`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {isUrgent(order) && <UrgentBadge note={order.urgentNote} />}
          {order.type !== "normal" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-hadiah px-2 py-0.5 text-xs font-medium text-hadiah-fg">
              <Gift className="size-3.5" aria-hidden />
              {order.type === "normal_hampers" ? "Normal & Hampers" : "Hampers"}
            </span>
          )}
          {!waiting && <OrderStatusBadge status={order.status} />}
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {order.items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="w-8 shrink-0 text-right font-semibold text-brand-ink tabular-nums">
              {item.qty}×
            </span>
            <span className="min-w-0 text-text-strong">
              {item.menuName}
              {SIZE_LABEL[item.size] && (
                <span className="text-text-body"> ({SIZE_LABEL[item.size]})</span>
              )}
              {item.note && (
                <span className="mt-0.5 block text-[13px] font-medium break-words text-status-diproses-fg">
                  Catatan: {item.note}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {!waiting && (
        <div className="mt-3 rounded-lg bg-nav-active/70 px-3 py-2.5 text-[13px]">
          <p className="font-medium text-text-strong">
            Packing {order.packagingType ? PACKAGING_TYPE_LABEL[order.packagingType] : "-"}
          </p>
          {order.used.length > 0 && (
            <p className="mt-0.5 text-text-body">{usesText(order.used, packagings)}</p>
          )}
        </div>
      )}

      {order.request && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-status-diproses/60 px-2.5 py-2 text-[13px] text-status-diproses-fg">
          <MessageSquareText className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="break-words">{order.request}</span>
        </p>
      )}
      {order.note && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-status-diproses/60 px-2.5 py-2 text-[13px] text-status-diproses-fg">
          <StickyNote className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="break-words">Catatan: {order.note}</span>
        </p>
      )}

      <p className="mt-3 text-[12px] text-text-body">
        {SHIPPING_METHOD_LABEL[order.shippingMethod]}
      </p>

      {canEdit && (waiting || order.status === "siap_kirim") && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {waiting ? (
            <>
              <Button
                size="sm"
                onClick={() => setOpen(true)}
                className="h-9 rounded-lg px-3.5"
                aria-label={`Selesai packing: ${order.orderNo}`}
              >
                <PackageCheck aria-hidden />
                Selesai packing
              </Button>
              <PackingDialog open={open} onOpenChange={setOpen} order={order} />
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={unpack}
              disabled={pending}
              className="h-9 rounded-lg px-3 text-text-body"
              aria-label={`Batal packing: ${order.orderNo}`}
            >
              {pending ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Undo2 aria-hidden />
              )}
              Batal packing
            </Button>
          )}
        </div>
      )}
    </article>
  )
}

const PACKAGING_TYPE_LABEL = { normal: "Normal", hampers: "Hampers" } as const
const TYPE_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "hampers", label: "Hampers" },
] as const

/**
 * Konfirmasi packing: Normal atau Hampers. Stok tidak dipotong di sini: loyang dan box hampers
 * sudah terpotong otomatis saat pesanan Lunas (keputusan pemilik toko, Nov 2026).
 */
function PackingDialog({
  open,
  onOpenChange,
  order,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: PackingOrder
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl bg-card p-6 sm:max-w-[520px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            Packing {order.orderNo}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Pilih jenis packing. Stok box dan loyang sudah dipotong otomatis saat pesanan Lunas.
          </DialogDescription>
        </DialogHeader>
        {/* Dipasang ulang tiap dibuka, jadi pilihan selalu mulai dari awal. */}
        {open && <PackingForm order={order} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function PackingForm({ order, onDone }: { order: PackingOrder; onDone: () => void }) {
  // Pesanan Hampers / Normal & Hampers langsung terpilih Hampers.
  const [type, setType] = useState<"normal" | "hampers">(
    order.type === "normal" ? "normal" : "hampers",
  )
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()
  const hampers = type === "hampers"

  function save() {
    startTransition(async () => {
      const result = await packOrder({ orderId: order.id, type, items: [] })
      if (result.ok) {
        toast.success(result.message)
        onDone()
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <div className="mt-6 space-y-5">
      <SegmentedControl
        label="Jenis packing"
        options={TYPE_OPTIONS}
        value={type}
        onChange={(value) => {
          setType(value)
          setError(undefined)
        }}
      />

      <p className="rounded-lg bg-nav-active/70 px-4 py-3 text-sm text-text-body">
        {hampers
          ? "Packing hampers. Box hampers dan loyang sudah dipotong otomatis saat pesanan Lunas, jadi stok tidak dipotong lagi di sini."
          : "Packaging biasa. Pesanan langsung jadi Siap Kirim."}
      </p>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-trend-down px-3 py-2.5 text-sm text-trend-down-fg"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending} className="h-11 rounded-lg px-6">
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          {pending ? "Menyimpan…" : "Simpan & selesai packing"}
        </Button>
      </div>
    </div>
  )
}
