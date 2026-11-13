"use client"

import {
  CalendarClock,
  EllipsisVertical,
  ExternalLink,
  LoaderCircle,
  Link2,
  Truck,
} from "lucide-react"
import Link from "next/link"
import { createContext, type ReactNode, useContext, useState, useTransition } from "react"
import { toast } from "sonner"

import {
  BulkActionBar,
  BulkActionButton,
  RowSelectionProvider,
  useRowSelection,
} from "@/components/app/row-selection"
import { TrackingLink } from "@/components/app/shipment-badges"
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
import { sentStatusFor, statusSkipReason } from "@/features/orders/status"
import { markShipmentsSent } from "@/features/shipments/actions"
import { CourierDialog, TrackingLinkDialog } from "@/features/shipments/components/shipment-actions"
import {
  canSetTrackingLink,
  type DeliverySlot,
  hasTrackingLink,
  nextShipmentAction,
} from "@/features/shipments/logic"
import type { CourierOption } from "@/features/shipments/queries"
import type { BulkResult } from "@/lib/bulk"
import type { ShippingMethod } from "@/lib/wa-parser"

/** Data baris yang dibutuhkan untuk menentukan aksi mana yang berlaku. */
export type ShipmentActionRow = {
  id: string
  orderNo: string
  orderStatus: OrderStatus
  method: ShippingMethod
  /** Live tracking dari kategori pengiriman; null = bawaan alurnya. */
  liveTracking: boolean | null
  courierId: string | null
  slot: DeliverySlot | null
  trackingUrl: string | null
}

const canAssign = (row: ShipmentActionRow) =>
  row.method === "kurir_internal" &&
  row.orderStatus !== "selesai" &&
  row.orderStatus !== "dibatalkan"
const canSend = (row: ShipmentActionRow) =>
  statusSkipReason(
    { status: row.orderStatus, method: row.method, hasCourier: row.courierId !== null },
    sentStatusFor(row.method),
    { requireCourier: true },
  ) === null

type ShipmentActions = {
  rowById: Map<string, ShipmentActionRow>
  pending: boolean
  send: (rows: ShipmentActionRow[]) => void
  advance: (row: ShipmentActionRow, target: OrderStatus) => void
  openCourier: (rows: ShipmentActionRow[]) => void
  openLink: (row: ShipmentActionRow) => void
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
  const [linkRow, setLinkRow] = useState<ShipmentActionRow>()
  const [linkOpen, setLinkOpen] = useState(false)
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
    openLink: (row) => {
      setLinkRow(row)
      setLinkOpen(true)
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
      {linkRow && (
        <TrackingLinkDialog
          open={linkOpen}
          onOpenChange={setLinkOpen}
          orderId={linkRow.id}
          orderNo={linkRow.orderNo}
          trackingUrl={linkRow.trackingUrl}
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
            ? "Yang bisa ditandai dikirim hanya pesanan Siap Kirim: Instant, Olshop, atau Kurir Internal yang sudah ada kurirnya."
            : undefined
        }
      >
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Truck aria-hidden />}
        Tandai dikirim{partial(sendable.length)}
      </BulkActionButton>
    </BulkActionBar>
  )
}

/** Langkah "Tandai Dikirim" (lewat markShipmentsSent), bukan Tandai Selesai / Sudah Diambil. */
const isSend = (row: ShipmentActionRow) =>
  row.orderStatus === "siap_kirim" && row.method !== "pick_up"

function nextActionOf(row: ShipmentActionRow) {
  return nextShipmentAction({
    method: row.method,
    orderStatus: row.orderStatus,
    hasCourier: row.courierId !== null,
  })
}

/**
 * Langkah berikutnya langsung di baris, supaya pengiriman bisa diselesaikan dari daftar ini.
 * Bila terhalang kurir, tombolnya membuka isian kurir. Belum dimasak = kosong.
 */
export function ShipmentRowAction({ id }: { id: string }) {
  const { rowById, pending, send, advance, openCourier } = useShipmentActions()
  const row = rowById.get(id)
  if (!row) return null
  const next = nextActionOf(row)
  const stepClass = "h-9 rounded-lg px-3 whitespace-nowrap"

  if (next?.kind === "advance") {
    return (
      <Button
        size="sm"
        disabled={pending}
        aria-label={`${next.label} ${row.orderNo}`}
        onClick={() => (isSend(row) ? send([row]) : advance(row, next.target))}
        className={stepClass}
      >
        {next.label}
      </Button>
    )
  }
  if (next?.kind !== "blocked" || row.orderStatus !== "siap_kirim") return null
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      aria-label={`Atur kurir ${row.orderNo}`}
      onClick={() => openCourier([row])}
      className={`${stepClass} bg-white`}
    >
      Atur kurir
    </Button>
  )
}

/** Kolom Lacak: link perjalanan makanan, atau tombol tambah setelah pesanan berangkat. */
export function ShipmentTrackingCell({ id }: { id: string }) {
  const { rowById, pending, openLink } = useShipmentActions()
  const row = rowById.get(id)
  if (!row) return null
  if (!hasTrackingLink(row.method, row.liveTracking)) return "-"
  if (row.trackingUrl) return <TrackingLink url={row.trackingUrl} orderNo={row.orderNo} />
  if (
    row.orderStatus !== "dikirim" ||
    !canSetTrackingLink(row.method, row.orderStatus, row.liveTracking)
  )
    return "-"
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      aria-label={`Tambah link lacak ${row.orderNo}`}
      onClick={() => openLink(row)}
      className="h-8 rounded-lg bg-white px-2.5 whitespace-nowrap"
    >
      <Link2 aria-hidden />
      Tambah link
    </Button>
  )
}

/** Menu ⋮ di ujung baris: langkah pengiriman berikutnya dan ubah kurir/jadwal. */
export function ShipmentRowMenu({ id }: { id: string }) {
  const { rowById, pending, send, advance, openCourier, openLink } = useShipmentActions()
  const row = rowById.get(id)
  if (!row) return null
  const next = nextActionOf(row)
  const canLink = canSetTrackingLink(row.method, row.orderStatus, row.liveTracking)
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
        {(step || canAssign(row) || canLink) && <DropdownMenuSeparator />}
        {step && (
          <DropdownMenuItem
            className="h-10"
            onSelect={() => (isSend(row) ? send([row]) : advance(row, step.target))}
          >
            <Truck aria-hidden />
            {step.label}
          </DropdownMenuItem>
        )}
        {canLink && (
          <DropdownMenuItem className="h-10" onSelect={() => openLink(row)}>
            <Link2 aria-hidden />
            {row.trackingUrl ? "Ubah link lacak" : "Tambah link lacak"}
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
