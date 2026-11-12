"use client"

import {
  Ban,
  ChevronDown,
  Download,
  EllipsisVertical,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  StickyNote,
  Wallet,
  Siren,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { createContext, type ReactNode, useContext, useId, useState, useTransition } from "react"
import { toast } from "sonner"

import { OrderStatusBadge } from "@/components/app/order-badges"
import {
  BulkActionBar,
  BulkActionButton,
  RowSelectionProvider,
  useRowSelection,
} from "@/components/app/row-selection"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteOrders, exportOrdersCsv, updateOrderStatuses } from "@/features/orders/actions"
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/features/orders/filters"
import { OrderNoteDialog } from "@/features/orders/components/order-note-dialog"
import { UrgentDialog } from "@/features/orders/components/urgent-dialog"
import { nextStatuses, statusSkipReason } from "@/features/orders/status"
import { MarkManyPaidDialog } from "@/features/payments/components/mark-paid-dialog"
import type { ActivePaymentMethod } from "@/features/payments/queries"
import type { BulkResult } from "@/lib/bulk"
import { toJakartaDateString } from "@/lib/format"
import type { ShippingMethod } from "@/lib/wa-parser"

/** Data baris yang dibutuhkan untuk menentukan aksi mana yang berlaku. */
export type OrderActionRow = {
  id: string
  orderNo: string
  status: OrderStatus
  method: ShippingMethod
  paid: boolean
  total: number
  note: string | null
  /** Sedang ditandai URGENT. */
  urgent: boolean
}

/** Tujuan di menu "Ubah status" massal. Dibatalkan punya tombol sendiri dengan konfirmasi. */
const STATUS_TARGETS: OrderStatus[] = [
  "baru",
  "diproses",
  "siap_packing",
  "siap_kirim",
  "dikirim",
  "selesai",
]

const canChange = (row: OrderActionRow, target: OrderStatus) =>
  statusSkipReason(
    { status: row.status, method: row.method, hasCourier: true, paid: row.paid },
    target,
  ) === null
const canPay = (row: OrderActionRow) => !row.paid && row.status !== "dibatalkan"

type DialogKind = "paid" | "cancel" | "delete" | "note" | "urgent"
type OpenDialog = { kind: DialogKind; rows: OrderActionRow[] } | null

type OrderActions = {
  rowById: Map<string, OrderActionRow>
  pending: boolean
  changeStatus: (rows: OrderActionRow[], target: OrderStatus) => void
  openDialog: (kind: DialogKind, rows: OrderActionRow[]) => void
}

const ActionsContext = createContext<OrderActions | null>(null)

function useOrderActions(): OrderActions {
  const context = useContext(ActionsContext)
  if (!context) throw new Error("useOrderActions harus di dalam OrderActionsProvider.")
  return context
}

function showResult(result: BulkResult) {
  if (result.ok) toast.success(result.message, { description: result.details })
  else toast.error(result.message, { description: result.details })
}

/**
 * Aksi Daftar Pesanan (BELL-19): checkbox + bar aksi massal (ubah status, tandai lunas,
 * batalkan, unduh CSV) dan menu ⋮ per baris. Setiap aksi hanya dikirim untuk pesanan yang
 * memenuhi syarat; server memeriksa ulang dan menyebut pesanan yang dilewati.
 */
export function OrderActionsProvider({
  rows,
  methods,
  children,
}: {
  rows: OrderActionRow[]
  methods: ActivePaymentMethod[]
  children: ReactNode
}) {
  return (
    <RowSelectionProvider ids={rows.map((row) => row.id)}>
      <OrderActionsInner rows={rows} methods={methods}>
        {children}
      </OrderActionsInner>
    </RowSelectionProvider>
  )
}

function OrderActionsInner({
  rows,
  methods,
  children,
}: {
  rows: OrderActionRow[]
  methods: ActivePaymentMethod[]
  children: ReactNode
}) {
  const { selected, clear } = useRowSelection()
  const [pending, startTransition] = useTransition()
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const rowById = new Map(rows.map((row) => [row.id, row]))

  const actions: OrderActions = {
    rowById,
    pending,
    changeStatus: (targets, status) =>
      startTransition(async () => {
        const result = await updateOrderStatuses(
          targets.map((row) => row.id),
          status,
        )
        showResult(result)
        if (result.ok) {
          clear()
          setDialogOpen(false)
        }
      }),
    openDialog: (kind, targets) => {
      setDialog({ kind, rows: targets })
      setDialogOpen(true)
    },
  }

  return (
    <ActionsContext value={actions}>
      {children}
      <OrderBulkBar rows={selected.flatMap((id) => rowById.get(id) ?? [])} />
      {dialog?.kind === "paid" && (
        <MarkManyPaidDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          orders={dialog.rows}
          methods={methods}
          onDone={clear}
        />
      )}
      {dialog?.kind === "note" && (
        <OrderNoteDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          orderId={dialog.rows[0].id}
          orderNo={dialog.rows[0].orderNo}
          note={dialog.rows[0].note}
        />
      )}
      {dialog?.kind === "urgent" && (
        <UrgentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          orderId={dialog.rows[0].id}
          orderNo={dialog.rows[0].orderNo}
          urgent={dialog.rows[0].urgent}
        />
      )}
      {dialog?.kind === "cancel" && (
        <CancelOrdersDialog open={dialogOpen} onOpenChange={setDialogOpen} rows={dialog.rows} />
      )}
      {dialog?.kind === "delete" && (
        <DeleteOrdersDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          rows={dialog.rows}
          onDone={clear}
        />
      )}
    </ActionsContext>
  )
}

function OrderBulkBar({ rows }: { rows: OrderActionRow[] }) {
  const { pending, changeStatus, openDialog } = useOrderActions()
  const [exporting, startExport] = useTransition()
  const payable = rows.filter(canPay)
  const cancellable = rows.filter((row) => canChange(row, "dibatalkan"))
  const partial = (count: number) => (count > 0 && count < rows.length ? ` (${count})` : "")

  function download() {
    startExport(async () => {
      const result = await exportOrdersCsv(rows.map((row) => row.id))
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      // BOM supaya Excel membaca huruf non-ASCII dengan benar.
      const url = URL.createObjectURL(
        new Blob(["﻿", result.csv], { type: "text/csv;charset=utf-8" }),
      )
      const link = document.createElement("a")
      link.href = url
      link.download = `pesanan-${toJakartaDateString(new Date())}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success(`${result.count} pesanan diunduh sebagai CSV.`)
    })
  }

  return (
    <BulkActionBar noun="pesanan">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <BulkActionButton disabled={pending}>
            {pending ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <RefreshCw aria-hidden />
            )}
            Ubah status
            <ChevronDown aria-hidden />
          </BulkActionButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-64">
          <DropdownMenuLabel className="text-[13px] font-normal text-text-body">
            Ubah pesanan terpilih ke
          </DropdownMenuLabel>
          {STATUS_TARGETS.map((status) => {
            const eligible = rows.filter((row) => canChange(row, status))
            return (
              <DropdownMenuItem
                key={status}
                className="h-10"
                disabled={eligible.length === 0}
                onSelect={() => changeStatus(eligible, status)}
              >
                <OrderStatusBadge status={status} />
                <span className="ml-auto text-[13px] text-text-body tabular-nums">
                  {eligible.length === 0
                    ? "tidak bisa"
                    : eligible.length === rows.length
                      ? `${eligible.length} pesanan`
                      : `${eligible.length} dari ${rows.length}`}
                </span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <BulkActionButton
        disabled={pending}
        onClick={() => openDialog("paid", payable)}
        unavailable={
          payable.length === 0 ? "Pesanan terpilih sudah lunas atau dibatalkan." : undefined
        }
      >
        <Wallet aria-hidden />
        Tandai lunas{partial(payable.length)}
      </BulkActionButton>
      <BulkActionButton
        disabled={pending}
        onClick={() => openDialog("cancel", cancellable)}
        unavailable={
          cancellable.length === 0
            ? "Pesanan terpilih sudah dikirim, selesai, atau dibatalkan, jadi tidak bisa dibatalkan."
            : undefined
        }
      >
        <Ban aria-hidden />
        Batalkan{partial(cancellable.length)}
      </BulkActionButton>
      <BulkActionButton disabled={pending} onClick={() => openDialog("delete", rows)}>
        <Trash2 aria-hidden />
        Hapus
      </BulkActionButton>
      <BulkActionButton disabled={exporting} onClick={download}>
        {exporting ? (
          <LoaderCircle className="animate-spin" aria-hidden />
        ) : (
          <Download aria-hidden />
        )}
        Unduh CSV
      </BulkActionButton>
    </BulkActionBar>
  )
}

function CancelOrdersDialog({
  open,
  onOpenChange,
  rows,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: OrderActionRow[]
}) {
  const { pending, changeStatus } = useOrderActions()
  const single = rows.length === 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[440px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            {single ? `Batalkan ${rows[0].orderNo}?` : `Batalkan ${rows.length} pesanan?`}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Pesanan dibatalkan tidak dihitung di KPI dan rekap produksi. Bisa dibuka lagi sebagai
            Baru bila salah.
          </DialogDescription>
        </DialogHeader>
        {!single && (
          <p className="mt-4 text-sm leading-relaxed text-text-strong tabular-nums">
            {rows.map((row) => row.orderNo).join(", ")}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-lg bg-white px-5"
          >
            Jangan batalkan
          </Button>
          <Button
            onClick={() => changeStatus(rows, "dibatalkan")}
            disabled={pending}
            className="h-11 rounded-lg bg-trend-down-fg px-5 text-white hover:bg-trend-down-fg/90"
          >
            {pending && <LoaderCircle className="animate-spin" aria-hidden />}
            {single ? "Batalkan pesanan" : `Batalkan ${rows.length} pesanan`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hapus permanen: untuk pesanan dobel atau salah input. Berbeda dengan Batalkan, pesanan hilang
 * dari daftar dan database; tercatat di lonceng notifikasi beserta alasannya.
 */
function DeleteOrdersDialog({
  open,
  onOpenChange,
  rows,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: OrderActionRow[]
  onDone: () => void
}) {
  const id = useId()
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()
  const single = rows.length === 1
  const paid = rows.filter((row) => row.paid).length

  function remove() {
    startTransition(async () => {
      const result = await deleteOrders({ orderIds: rows.map((row) => row.id), reason })
      if (!result.ok) {
        setError(result.message)
        return
      }
      showResult(result)
      setReason("")
      onDone()
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[460px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            {single ? `Hapus ${rows[0].orderNo}?` : `Hapus ${rows.length} pesanan?`}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Pesanan hilang dari daftar dan database beserta item, pembayaran, dan pengirimannya, dan
            tidak bisa dikembalikan. Stok loyang dan box yang sempat terpotong dikembalikan. Semua
            staf melihatnya di notifikasi. Bila hanya batal pesan, pakai Batalkan.
          </DialogDescription>
        </DialogHeader>
        {!single && (
          <p className="mt-4 text-sm leading-relaxed text-text-strong tabular-nums">
            {rows.map((row) => row.orderNo).join(", ")}
          </p>
        )}
        {paid > 0 && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-trend-down px-3 py-2.5 text-sm text-trend-down-fg">
            <Wallet className="mt-0.5 size-4 shrink-0" aria-hidden />
            {single
              ? "Pesanan ini sudah lunas; pembayarannya ikut terhapus dari laporan."
              : `${paid} pesanan sudah lunas; pembayarannya ikut terhapus dari laporan.`}
          </p>
        )}
        <div className="mt-5 space-y-1.5">
          <label htmlFor={`${id}-reason`} className="text-sm font-medium text-text-strong">
            Alasan <span className="font-normal text-text-body">(opsional)</span>
          </label>
          <input
            id={`${id}-reason`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={200}
            placeholder="Mis. pesanan dobel, salah input"
            className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-text-strong outline-none placeholder:text-text-body/70 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-trend-down px-3 py-2.5 text-sm text-trend-down-fg"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-lg bg-white px-5"
          >
            Jangan hapus
          </Button>
          <Button
            onClick={remove}
            disabled={pending}
            className="h-11 rounded-lg bg-trend-down-fg px-5 text-white hover:bg-trend-down-fg/90"
          >
            {pending ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <Trash2 aria-hidden />
            )}
            {single ? "Hapus pesanan" : `Hapus ${rows.length} pesanan`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Menu ⋮ di ujung baris: aksi yang sama dengan bar massal, untuk satu pesanan. */
export function OrderRowMenu({ id }: { id: string }) {
  const { rowById, pending, changeStatus, openDialog } = useOrderActions()
  const row = rowById.get(id)
  if (!row) return null
  const steps = nextStatuses(row.status, row.method).filter(
    (status) => status !== "dibatalkan" && canChange(row, status),
  )
  const cancellable = canChange(row, "dibatalkan")

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
            Detail lengkap
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="h-10" onSelect={() => openDialog("note", [row])}>
          <StickyNote aria-hidden />
          {row.note ? "Ubah catatan" : "Tambah catatan"}
        </DropdownMenuItem>
        {(row.urgent || (row.status !== "selesai" && row.status !== "dibatalkan")) && (
          <DropdownMenuItem
            className="h-10 text-trend-down-fg focus:text-trend-down-fg"
            onSelect={() => openDialog("urgent", [row])}
          >
            <Siren aria-hidden className="text-trend-down-fg" />
            {row.urgent ? "Hapus urgent" : "Tandai urgent"}
          </DropdownMenuItem>
        )}
        {steps.length > 0 && <DropdownMenuSeparator />}
        {steps.map((status) => (
          <DropdownMenuItem
            key={status}
            className="h-10"
            onSelect={() => changeStatus([row], status)}
          >
            <RefreshCw aria-hidden />
            Jadikan {ORDER_STATUS_LABEL[status]}
          </DropdownMenuItem>
        ))}
        {canPay(row) && (
          <DropdownMenuItem className="h-10" onSelect={() => openDialog("paid", [row])}>
            <Wallet aria-hidden />
            Tandai lunas
          </DropdownMenuItem>
        )}
        {cancellable && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="h-10"
              onSelect={() => openDialog("cancel", [row])}
            >
              <Ban aria-hidden />
              Batalkan pesanan
            </DropdownMenuItem>
          </>
        )}
        {!cancellable && <DropdownMenuSeparator />}
        <DropdownMenuItem
          variant="destructive"
          className="h-10"
          onSelect={() => openDialog("delete", [row])}
        >
          <Trash2 aria-hidden />
          Hapus pesanan
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
