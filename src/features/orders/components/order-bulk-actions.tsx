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
} from "lucide-react"
import Link from "next/link"
import { createContext, type ReactNode, useContext, useState, useTransition } from "react"
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
import { exportOrdersCsv, updateOrderStatuses } from "@/features/orders/actions"
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/features/orders/filters"
import { OrderNoteDialog } from "@/features/orders/components/order-note-dialog"
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
}

/** Tujuan di menu "Ubah status" massal. Dibatalkan punya tombol sendiri dengan konfirmasi. */
const STATUS_TARGETS: OrderStatus[] = ["baru", "diproses", "siap_kirim", "dikirim", "selesai"]

const canChange = (row: OrderActionRow, target: OrderStatus) =>
  statusSkipReason({ status: row.status, method: row.method, hasCourier: true }, target) === null
const canPay = (row: OrderActionRow) => !row.paid && row.status !== "dibatalkan"

type DialogKind = "paid" | "cancel" | "note"
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
      {dialog?.kind === "cancel" && (
        <CancelOrdersDialog open={dialogOpen} onOpenChange={setDialogOpen} rows={dialog.rows} />
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
