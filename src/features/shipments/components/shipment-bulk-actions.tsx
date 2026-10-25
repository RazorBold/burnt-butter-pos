"use client"

import { CalendarClock, EllipsisVertical, ExternalLink, LoaderCircle, Truck } from "lucide-react"
import Link from "next/link"
import { createContext, type ReactNode, useContext, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  BulkActionBar,
  BulkActionButton,
  RowSelectionProvider,
  useRowSelection,
} from "@/components/app/row-selection"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateOrderStatus } from "@/features/orders/actions"
import type { OrderStatus } from "@/features/orders/filters"
import { statusSkipReason } from "@/features/orders/status"
import { markShipmentsSent } from "@/features/shipments/actions"
import { CourierDialog } from "@/features/shipments/components/shipment-actions"
import { type DeliverySlot, nextShipmentAction } from "@/features/shipments/logic"
import type { CourierOption } from "@/features/shipments/queries"
import type { BulkResult } from "@/lib/bulk"
import type { ShippingMethod } from "@/lib/wa-parser"

/** Data baris yang dibutuhkan untuk menentukan aksi mana yang berlaku. */
export type ShipmentActionRow = {
  id: string
  orderNo: string
  orderStatus: OrderStatus
  method: ShippingMethod
  courierId: string | null
  slot: DeliverySlot | null
}

const canAssign = (row: ShipmentActionRow) =>
  row.method === "kurir_internal" &&
  row.orderStatus !== "selesai" &&
  row.orderStatus !== "dibatalkan"
const canSend = (row: ShipmentActionRow) =>
  statusSkipReason(
    { status: row.orderStatus, method: row.method, hasCourier: row.courierId !== null },
    "dikirim",
    { requireCourier: true },
  ) === null

type ShipmentActions = {
  rowById: Map<string, ShipmentActionRow>
  pending: boolean
  send: (rows: ShipmentActionRow[]) => void
  advance: (row: ShipmentActionRow, target: OrderStatus) => void
  openCourier: (rows: ShipmentActionRow[]) => void
}

const ActionsContext = createContext<ShipmentActions | null>(null)

function useShipmentActions(): ShipmentActions {
  const context = useContext(ActionsContext)
  if (!context) throw new Error("useShipmentActions harus di dalam ShipmentActionsProvider.")
  return context
}

function showResult(result: BulkResult) {
  if (result.ok) toast.success(result.message, { description: result.details })
  else toast.error(result.message, { description: result.details })
}

/**
 * Aksi tabel Pengiriman (BELL-19): checkbox + bar aksi massal (atur kurir & jadwal, tandai
 * dikirim) dan menu ⋮ per baris. Hanya pesanan yang memenuhi syarat yang dikirim ke server.
 */
export function ShipmentActionsProvider({
  rows,
  couriers,
  children,
}: {
  rows: ShipmentActionRow[]
  couriers: CourierOption[]
  children: ReactNode
}) {
  return (
    <RowSelectionProvider ids={rows.map((row) => row.id)}>
      <ShipmentActionsInner rows={rows} couriers={couriers}>
        {children}
      </ShipmentActionsInner>
    </RowSelectionProvider>
  )
}

function ShipmentActionsInner({
  rows,
  couriers,
  children,
}: {
  rows: ShipmentActionRow[]
  couriers: CourierOption[]
  children: ReactNode
}) {
  const { selected, clear } = useRowSelection()
  const [pending, startTransition] = useTransition()
  const [courierRows, setCourierRows] = useState<ShipmentActionRow[]>([])
  const [courierOpen, setCourierOpen] = useState(false)
  const rowById = new Map(rows.map((row) => [row.id, row]))

  const actions: ShipmentActions = {
    rowById,
    pending,
    send: (targets) =>
      startTransition(async () => {
        const result = await markShipmentsSent(targets.map((row) => row.id))
        showResult(result)
        if (result.ok) clear()
      }),
    advance: (row, target) =>
      startTransition(async () => {
        const result = await updateOrderStatus(row.id, target)
        showResult(result)
      }),
    openCourier: (targets) => {
      setCourierRows(targets)
      setCourierOpen(true)
    },
  }
  const single = courierRows.length === 1 ? courierRows[0] : undefined

  return (
    <ActionsContext value={actions}>
      {children}
      <ShipmentBulkBar rows={selected.flatMap((id) => rowById.get(id) ?? [])} />
      {courierRows.length > 0 && (
        <CourierDialog
          open={courierOpen}
          onOpenChange={setCourierOpen}
          orders={courierRows}
          initial={single && { courierId: single.courierId, slot: single.slot }}
          couriers={couriers.filter((courier) => courier.type === "internal")}
          onDone={clear}
        />
      )}
    </ActionsContext>
  )
}

function ShipmentBulkBar({ rows }: { rows: ShipmentActionRow[] }) {
  const { pending, send, openCourier } = useShipmentActions()
  const assignable = rows.filter(canAssign)
  const sendable = rows.filter(canSend)
  const partial = (count: number) => (count > 0 && count < rows.length ? ` (${count})` : "")

  return (
    <BulkActionBar noun="pesanan">
      <BulkActionButton
        disabled={pending}
        onClick={() => openCourier(assignable)}
        unavailable={
          assignable.length === 0
            ? "Kurir dan jadwal hanya untuk pesanan Kurir Internal yang belum selesai."
            : undefined
        }
      >
        <CalendarClock aria-hidden />
        Atur kurir & jadwal{partial(assignable.length)}
      </BulkActionButton>
      <BulkActionButton
        disabled={pending}
        onClick={() => send(sendable)}
        unavailable={
          sendable.length === 0
            ? "Yang bisa ditandai dikirim hanya pesanan Siap Kirim: Instant, atau Kurir Internal yang sudah ada kurirnya."
            : undefined
        }
      >
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Truck aria-hidden />}
        Tandai dikirim{partial(sendable.length)}
      </BulkActionButton>
    </BulkActionBar>
  )
}

/** Menu ⋮ di ujung baris: langkah pengiriman berikutnya dan ubah kurir/jadwal. */
export function ShipmentRowMenu({ id }: { id: string }) {
  const { rowById, pending, send, advance, openCourier } = useShipmentActions()
  const row = rowById.get(id)
  if (!row) return null
  const next = nextShipmentAction({
    method: row.method,
    orderStatus: row.orderStatus,
    hasCourier: row.courierId !== null,
  })
  const step = next?.kind === "advance" ? next : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-lg text-text-strong"
          aria-label={`Aksi untuk ${row.orderNo}`}
          disabled={pending}
        >
          <EllipsisVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild className="h-10">
          <Link href={`/pesanan/${row.orderNo}`}>
            <ExternalLink aria-hidden />
            Lihat pesanan
          </Link>
        </DropdownMenuItem>
        {(step || canAssign(row)) && <DropdownMenuSeparator />}
        {step && (
          <DropdownMenuItem
            className="h-10"
            onSelect={() => (step.target === "dikirim" ? send([row]) : advance(row, step.target))}
          >
            <Truck aria-hidden />
            {step.label}
          </DropdownMenuItem>
        )}
        {canAssign(row) && (
          <DropdownMenuItem className="h-10" onSelect={() => openCourier([row])}>
            <CalendarClock aria-hidden />
            Ubah kurir / jadwal
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
