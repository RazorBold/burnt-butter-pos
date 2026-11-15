"use client"

import { ChefHat, CircleCheck, LoaderCircle } from "lucide-react"
import { type ReactNode, useTransition } from "react"
import { toast } from "sonner"

import {
  BulkActionBar,
  BulkActionButton,
  RowSelectionProvider,
  TableCheckbox,
  useRowSelection,
} from "@/components/app/row-selection"
import { updateProductionStatuses } from "@/features/orders/actions"
import type { OrderStatus } from "@/features/orders/filters"
import { cn } from "@/lib/utils"

type SelectableOrder = { id: string; orderNo: string; status: OrderStatus }

/**
 * Pilih Semua di papan Produksi (permintaan pemilik toko, 14 Nov 2026): checkbox di kartu
 * pesanan Baru dan Diproses, lalu Mulai masak / Selesai masak sekaligus lewat bar bawah.
 * `key` dari daftar id supaya pilihan kosong lagi saat tanggal atau filter berganti.
 */
export function ProductionSelection({
  orders,
  children,
}: {
  orders: SelectableOrder[]
  children: ReactNode
}) {
  return (
    <RowSelectionProvider
      key={orders.map((order) => order.id).join()}
      ids={orders.map((o) => o.id)}
    >
      {children}
      <ProductionBulkBar orders={orders} />
    </RowSelectionProvider>
  )
}

/** "Pilih semua" untuk sekumpulan pesanan (seluruh papan atau satu kolom). */
export function SelectGroup({
  ids,
  label,
  className,
}: {
  ids: string[]
  label: string
  className?: string
}) {
  const { isSelected, toggle } = useRowSelection()
  if (ids.length === 0) return null
  const count = ids.filter(isSelected).length
  const state = count === 0 ? false : count === ids.length ? true : "indeterminate"
  return (
    <label
      className={cn(
        "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-1 text-sm font-medium text-text-strong",
        className,
      )}
    >
      <TableCheckbox
        checked={state}
        onCheckedChange={(checked) => {
          for (const id of ids) toggle(id, checked === true)
        }}
      />
      {label}
    </label>
  )
}

/** Checkbox di pojok kartu pesanan. */
export function SelectOrder({ id, orderNo }: { id: string; orderNo: string }) {
  const { isSelected, toggle } = useRowSelection()
  return (
    <label className="-m-2 flex size-10 shrink-0 cursor-pointer items-center justify-center">
      <TableCheckbox
        aria-label={`Pilih ${orderNo}`}
        checked={isSelected(id)}
        onCheckedChange={(checked) => toggle(id, checked === true)}
      />
    </label>
  )
}

function ProductionBulkBar({ orders }: { orders: SelectableOrder[] }) {
  const { selected, clear } = useRowSelection()
  const [pending, startTransition] = useTransition()
  const chosen = orders.filter((order) => selected.includes(order.id))
  const toStart = chosen.filter((order) => order.status === "baru")
  const toFinish = chosen.filter((order) => order.status === "diproses")
  const partial = (count: number) => (count > 0 && count < chosen.length ? ` (${count})` : "")

  function move(targets: SelectableOrder[], target: "diproses" | "siap_packing") {
    startTransition(async () => {
      const result = await updateProductionStatuses(
        targets.map((order) => order.id),
        target,
      )
      if (result.ok) {
        toast.success(result.message, { description: result.details })
        clear()
      } else toast.error(result.message, { description: result.details })
    })
  }

  return (
    <BulkActionBar noun="pesanan">
      <BulkActionButton
        disabled={pending}
        onClick={() => move(toStart, "diproses")}
        unavailable={
          toStart.length === 0 ? "Tidak ada pesanan Belum Mulai yang dipilih." : undefined
        }
      >
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <ChefHat aria-hidden />}
        Mulai masak{partial(toStart.length)}
      </BulkActionButton>
      <BulkActionButton
        disabled={pending}
        onClick={() => move(toFinish, "siap_packing")}
        unavailable={
          toFinish.length === 0 ? "Tidak ada pesanan Sedang Dimasak yang dipilih." : undefined
        }
      >
        {pending ? (
          <LoaderCircle className="animate-spin" aria-hidden />
        ) : (
          <CircleCheck aria-hidden />
        )}
        Selesai masak{partial(toFinish.length)}
      </BulkActionButton>
    </BulkActionBar>
  )
}
