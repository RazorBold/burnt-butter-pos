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

import { OrderStatusBadge } from "@/components/app/order-badges"
import { QtyStepper } from "@/components/app/qty-stepper"
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
      className="rounded-xl border border-border bg-white p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 id={`pack-${order.id}`} className="font-semibold text-text-strong tabular-nums">
            {order.orderNo}
          </h4>
          <p className="text-[13px] text-text-body">
            {order.customerName}
            {order.type === "hadiah" && order.senderName && ` (dari ${order.senderName})`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {order.type === "hadiah" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-hadiah px-2 py-0.5 text-xs font-medium text-hadiah-fg">
              <Gift className="size-3.5" aria-hidden />
              {order.hasCard ? "Hadiah + kartu" : "Hadiah"}
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
            <span className="text-text-strong">
              {item.menuName}
              {SIZE_LABEL[item.size] && (
                <span className="text-text-body"> ({SIZE_LABEL[item.size]})</span>
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
              <PackingDialog
                open={open}
                onOpenChange={setOpen}
                order={order}
                packagings={packagings}
              />
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

const SIZE_GROUPS = [
  { key: "large", title: "Size Large" },
  { key: "regular", title: "Size Regular" },
  { key: "lain", title: "Lainnya" },
] as const

/**
 * Konfirmasi packing: Normal (packaging biasa, stok tidak dicatat) atau Hampers (isi jumlah
 * tiap box hampers; stoknya terpotong).
 */
function PackingDialog({
  open,
  onOpenChange,
  order,
  packagings,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: PackingOrder
  packagings: PackingPackaging[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl bg-card p-6 sm:max-w-[520px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            Packing {order.orderNo}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Pilih jenis packing. Hampers memotong stok box hampers sesuai jumlah yang diisi.
          </DialogDescription>
        </DialogHeader>
        {/* Dipasang ulang tiap dibuka, jadi isian selalu mulai dari awal. */}
        {open && (
          <PackingForm order={order} packagings={packagings} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function PackingForm({
  order,
  packagings,
  onDone,
}: {
  order: PackingOrder
  packagings: PackingPackaging[]
  onDone: () => void
}) {
  const [type, setType] = useState<"normal" | "hampers">("normal")
  const [qty, setQty] = useState<Record<string, number>>({})
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()
  const hampers = type === "hampers"
  const short = hampers ? packagings.filter((item) => (qty[item.id] ?? 0) > item.stock) : []
  const picked = Object.values(qty).reduce((sum, value) => sum + value, 0)
  const groups = SIZE_GROUPS.map((group) => ({
    ...group,
    items: packagings.filter((item) =>
      group.key === "lain"
        ? item.size !== "large" && item.size !== "regular"
        : item.size === group.key,
    ),
  })).filter((group) => group.items.length > 0)

  function save() {
    startTransition(async () => {
      const result = await packOrder({
        orderId: order.id,
        type,
        items: hampers
          ? Object.entries(qty).map(([packagingId, value]) => ({ packagingId, qty: value }))
          : [],
      })
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

      {!hampers ? (
        <p className="rounded-lg bg-nav-active/70 px-4 py-3 text-sm text-text-body">
          Packaging biasa, stok tidak dicatat. Pesanan langsung jadi Siap Kirim.
        </p>
      ) : packagings.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-text-body">
          Belum ada box hampers. Tambahkan di Master Data › Stok Packaging.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.title}>
              <h3 className="text-sm font-semibold text-brand-ink">{group.title}</h3>
              <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-white">
                {group.items.map((item) => {
                  const value = qty[item.id] ?? 0
                  const over = value > item.stock
                  return (
                    <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-text-strong">{item.name}</p>
                        <p
                          className={cn(
                            "text-[13px] tabular-nums",
                            over ? "text-trend-down-fg" : "text-text-body",
                          )}
                        >
                          Stok {item.stock} {item.unit}
                          {over && " · kurang"}
                        </p>
                      </div>
                      <QtyStepper
                        value={value}
                        onChange={(next) => {
                          setQty((current) => ({ ...current, [item.id]: next }))
                          setError(undefined)
                        }}
                        label={item.name}
                        max={999}
                      />
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {(error || short.length > 0) && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-trend-down px-3 py-2.5 text-sm text-trend-down-fg"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error ??
            `Stok ${short.map((item) => item.name).join(", ")} tidak cukup. Tambah atau revisi stoknya di Stok Packaging dulu.`}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={pending || short.length > 0 || (hampers && picked === 0)}
          className="h-11 rounded-lg px-6"
        >
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          {pending ? "Menyimpan…" : "Simpan & selesai packing"}
        </Button>
      </div>
    </div>
  )
}
