"use client"

import { CircleAlert, LoaderCircle, PencilLine } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { updateOrderItems } from "@/features/orders/actions"
import type { CatalogVariant } from "@/features/orders/catalog"
import { isMarketplace } from "@/features/orders/constants"
import { OrderMenuPicker } from "@/features/orders/components/order-menu-picker"
import type { OrderDetail } from "@/features/orders/queries"
import { formatRupiah } from "@/lib/format"

/**
 * Ubah menu pesanan (Baru / Diproses): tambah, ganti jumlah, hapus (jumlah 0), dan catatan per
 * menu. Menu yang sudah dipesan tetap memakai harga saat dipesan.
 */
export function EditItemsDialog({
  order,
  catalog,
}: {
  order: OrderDetail
  catalog: CatalogVariant[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 rounded-lg bg-white px-3"
      >
        <PencilLine aria-hidden />
        Ubah menu
      </Button>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl bg-card p-6 sm:max-w-[880px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            Ubah menu {order.orderNo}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Tambah atau ganti menu, ubah jumlah, atau jadikan 0 untuk menghapus. Catatan per menu
            tampil di Produksi dan Packaging.
          </DialogDescription>
        </DialogHeader>
        {/* Dipasang ulang tiap dibuka, jadi isian selalu mulai dari menu pesanan sekarang. */}
        {open && <EditItemsForm order={order} catalog={catalog} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function EditItemsForm({
  order,
  catalog,
  onDone,
}: {
  order: OrderDetail
  catalog: CatalogVariant[]
  onDone: () => void
}) {
  // Menu pesanan yang sudah nonaktif tetap tampil supaya tidak terhapus diam-diam; harganya
  // harga saat dipesan.
  const known = new Set(catalog.map((variant) => variant.id))
  const options: CatalogVariant[] = [
    ...catalog.map((variant) => {
      const ordered = order.items.find((item) => item.menuVariantId === variant.id)
      return ordered ? { ...variant, price: ordered.unitPrice } : variant
    }),
    ...order.items
      .filter((item) => !known.has(item.menuVariantId))
      .map((item) => ({
        id: item.menuVariantId,
        menuName: `${item.menuName} (nonaktif)`,
        categoryId: "nonaktif",
        categoryName: "Menu nonaktif",
        categorySort: Number.MAX_SAFE_INTEGER,
        sized: false,
        size: item.size,
        price: item.unitPrice,
        photoPath: item.photoPath,
      })),
  ]

  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(order.items.map((item) => [item.menuVariantId, item.qty])),
  )
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(order.items.map((item) => [item.menuVariantId, item.note ?? ""])),
  )
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  const marketplace = isMarketplace(order.channel)
  const portions = Object.values(quantities).reduce((sum, qty) => sum + qty, 0)
  const menuTotal = options.reduce(
    (sum, variant) => sum + (quantities[variant.id] ?? 0) * variant.price,
    0,
  )
  const newTotal = marketplace ? order.total : menuTotal
  const paid = order.payment?.amount
  const diff = paid === undefined ? 0 : newTotal - paid

  function save() {
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([menuVariantId, qty]) => ({ menuVariantId, qty, note: notes[menuVariantId] ?? "" }))
    if (items.length === 0) {
      setError("Pesanan harus berisi minimal satu menu. Untuk membatalkan, pakai Ubah Status.")
      return
    }
    startTransition(async () => {
      const result = await updateOrderItems({ orderId: order.id, items })
      if (!result.ok) {
        setError(result.message)
        return
      }
      toast.success(result.message)
      if (result.warning) toast.warning(result.warning, { duration: 10_000 })
      onDone()
    })
  }

  return (
    <div className="mt-6 space-y-5">
      <OrderMenuPicker
        catalog={options}
        quantities={quantities}
        onChange={(id, qty) => {
          setQuantities((current) => ({ ...current, [id]: qty }))
          setError(undefined)
        }}
        notes={notes}
        onNoteChange={(id, note) => setNotes((current) => ({ ...current, [id]: note }))}
      />

      <div className="rounded-xl bg-nav-active/70 px-4 py-3.5 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-text-body">
            {portions} porsi ·{" "}
            {marketplace
              ? "Total marketplace tetap"
              : `Total sebelumnya ${formatRupiah(order.total)}`}
          </p>
          <p className="text-lg font-bold text-brand-ink tabular-nums" data-testid="edit-total">
            {formatRupiah(newTotal)}
          </p>
        </div>
        {paid !== undefined && diff !== 0 && (
          <p className="mt-2 flex items-start gap-1.5 font-medium text-status-diproses-fg">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {diff > 0
              ? `Sudah lunas ${formatRupiah(paid)}. Setelah disimpan, customer kurang bayar ${formatRupiah(diff)}.`
              : `Sudah lunas ${formatRupiah(paid)}. Setelah disimpan, customer lebih bayar ${formatRupiah(-diff)}.`}
          </p>
        )}
      </div>

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
          {pending ? "Menyimpan…" : "Simpan menu"}
        </Button>
      </div>
    </div>
  )
}
