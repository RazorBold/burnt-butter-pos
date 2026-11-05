"use client"

import { CalendarClock, CircleAlert, LoaderCircle, PackageSearch, Truck } from "lucide-react"
import { useId, useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { updateOrderStatus } from "@/features/orders/actions"
import type { OrderStatus } from "@/features/orders/filters"
import { EXPEDITION_SUGGESTIONS } from "@/features/orders/constants"
import { assignCourier, saveTracking } from "@/features/shipments/actions"
import {
  type DeliverySlot,
  nextShipmentAction,
  SLOT_LABEL,
  SLOTS,
} from "@/features/shipments/logic"
import type { CourierOption } from "@/features/shipments/queries"
import { cn } from "@/lib/utils"
import type { ShippingMethod } from "@/lib/wa-parser"

/** Aksi bawah panel Detail Pengiriman (F-45): Tandai Dikirim/Selesai + Ubah Kurir / Jadwal. */
export function ShipmentActions({
  orderId,
  orderNo,
  orderStatus,
  method,
  courierId,
  slot,
  expedition,
  trackingNo,
  couriers,
}: {
  orderId: string
  orderNo: string
  orderStatus: OrderStatus
  method: ShippingMethod
  courierId: string | null
  slot: DeliverySlot | null
  expedition: string | null
  trackingNo: string | null
  couriers: CourierOption[]
}) {
  const [pending, startTransition] = useTransition()
  const [assignOpen, setAssignOpen] = useState(false)
  const [trackingOpen, setTrackingOpen] = useState(false)
  const action = nextShipmentAction({
    method,
    orderStatus,
    hasCourier: Boolean(courierId),
    hasTracking: Boolean(trackingNo),
  })
  const canTrack =
    method === "ekspedisi" && orderStatus !== "selesai" && orderStatus !== "dibatalkan"
  const canAssign =
    method === "kurir_internal" && orderStatus !== "selesai" && orderStatus !== "dibatalkan"

  function advance(target: OrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, target)
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  if (!action && !canAssign && !canTrack) return null

  return (
    <div className="space-y-2">
      {action?.kind === "blocked" && (
        <p className="flex items-start gap-1.5 text-[13px] text-[#8a5a00]">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {action.reason}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {action && (
          <Button
            onClick={() => action.kind === "advance" && advance(action.target)}
            disabled={pending || action.kind === "blocked"}
            className={cn("h-12 rounded-lg px-4", !canAssign && !canTrack && "sm:col-span-2")}
          >
            {pending ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <Truck aria-hidden />
            )}
            {action.label}
          </Button>
        )}
        {canAssign && (
          <>
            <Button
              variant="outline"
              onClick={() => setAssignOpen(true)}
              className={cn("h-12 rounded-lg bg-white px-4", !action && "sm:col-span-2")}
            >
              <CalendarClock aria-hidden />
              Ubah Kurir / Jadwal
            </Button>
            <CourierDialog
              open={assignOpen}
              onOpenChange={setAssignOpen}
              orders={[{ id: orderId, orderNo }]}
              initial={{ courierId, slot }}
              couriers={couriers.filter((courier) => courier.type === "internal")}
            />
          </>
        )}
        {canTrack && (
          <>
            <Button
              variant="outline"
              onClick={() => setTrackingOpen(true)}
              className={cn("h-12 rounded-lg bg-white px-4", !action && "sm:col-span-2")}
            >
              <PackageSearch aria-hidden />
              {trackingNo ? "Ubah Resi" : "Isi Resi"}
            </Button>
            <TrackingDialog
              open={trackingOpen}
              onOpenChange={setTrackingOpen}
              orderId={orderId}
              orderNo={orderNo}
              expedition={expedition}
              trackingNo={trackingNo}
            />
          </>
        )}
      </div>
    </div>
  )
}

/** Dialog Isi Resi pesanan Ekspedisi (marketplace): nama kurir dan nomor resi. */
export function TrackingDialog({
  open,
  onOpenChange,
  orderId,
  orderNo,
  expedition,
  trackingNo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  orderNo: string
  expedition: string | null
  trackingNo: string | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[460px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">Resi {orderNo}</DialogTitle>
          <DialogDescription className="text-text-body">
            Salin dari Seller Center setelah pengiriman diatur. Tandai Dikirim terbuka setelah resi
            diisi.
          </DialogDescription>
        </DialogHeader>
        <TrackingForm
          orderId={orderId}
          initial={{ expedition: expedition ?? "", trackingNo: trackingNo ?? "" }}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function TrackingForm({
  orderId,
  initial,
  onSuccess,
}: {
  orderId: string
  initial: { expedition: string; trackingNo: string }
  onSuccess: () => void
}) {
  const id = useId()
  const [expedition, setExpedition] = useState(initial.expedition)
  const [trackingNo, setTrackingNo] = useState(initial.trackingNo)
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const result = await saveTracking({ orderId, expedition, trackingNo })
      if (result.ok) {
        toast.success(result.message)
        onSuccess()
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-expedition`} className="text-text-strong">
          Kurir
        </Label>
        <Input
          id={`${id}-expedition`}
          list={`${id}-expeditions`}
          value={expedition}
          onChange={(event) => setExpedition(event.target.value)}
          maxLength={40}
          className="h-11 rounded-lg bg-white"
        />
        <datalist id={`${id}-expeditions`}>
          {EXPEDITION_SUGGESTIONS.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-tracking`} className="text-text-strong">
          Nomor resi
        </Label>
        <Input
          id={`${id}-tracking`}
          value={trackingNo}
          onChange={(event) => setTrackingNo(event.target.value)}
          maxLength={60}
          className="h-11 rounded-lg bg-white tabular-nums"
        />
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
          {pending ? "Menyimpan…" : "Simpan resi"}
        </Button>
      </div>
    </div>
  )
}

/**
 * Dialog Kurir & jadwal: satu pesanan (panel detail, menu ⋮) atau beberapa sekaligus (aksi
 * massal). Isinya dipasang ulang setiap dibuka, jadi pilihan mulai dari `initial`.
 */
export function CourierDialog({
  open,
  onOpenChange,
  orders,
  initial,
  couriers,
  onDone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: { id: string; orderNo: string }[]
  initial?: { courierId: string | null; slot: DeliverySlot | null }
  couriers: CourierOption[]
  onDone?: () => void
}) {
  const single = orders.length === 1
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[460px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            {single
              ? `Kurir & jadwal ${orders[0].orderNo}`
              : `Kurir & jadwal ${orders.length} pesanan`}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Kurir Internal mengantar jam 09.00–17.00 mengikuti rute, dibagi dua slot.
            {!single && " Semua pesanan terpilih memakai kurir dan slot yang sama."}
          </DialogDescription>
        </DialogHeader>
        <CourierForm
          orderIds={orders.map((order) => order.id)}
          initial={initial}
          couriers={couriers}
          onSuccess={() => {
            onOpenChange(false)
            onDone?.()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function CourierForm({
  orderIds,
  initial,
  couriers,
  onSuccess,
}: {
  orderIds: string[]
  initial?: { courierId: string | null; slot: DeliverySlot | null }
  couriers: CourierOption[]
  onSuccess: () => void
}) {
  const id = useId()
  const [courier, setCourier] = useState(initial?.courierId ?? "")
  const [chosenSlot, setChosenSlot] = useState<DeliverySlot | "">(initial?.slot ?? "")
  const [error, setError] = useState<{ message: string; details?: string }>()
  const [pending, startTransition] = useTransition()

  function save() {
    if (!courier) return setError({ message: "Pilih kurir." })
    if (!chosenSlot) return setError({ message: "Pilih slot jam pengiriman." })
    startTransition(async () => {
      const result = await assignCourier({ orderIds, courierId: courier, slot: chosenSlot })
      if (result.ok) {
        toast.success(result.message, { description: result.details })
        onSuccess()
      } else {
        setError(result)
      }
    })
  }

  const radio = (
    name: string,
    value: string,
    checked: boolean,
    onChange: () => void,
    label: string,
  ) => (
    <label
      key={value}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-3.5 py-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        checked ? "border-brand bg-nav-active" : "border-border",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => {
          onChange()
          setError(undefined)
        }}
        className="size-4 shrink-0 accent-brand"
      />
      <span className="font-medium text-text-strong">{label}</span>
    </label>
  )

  return (
    <div className="mt-6 space-y-5">
      <fieldset>
        <legend className="text-sm font-medium text-text-strong">Kurir</legend>
        {couriers.length === 0 ? (
          <p className="mt-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-text-body">
            Belum ada kurir internal aktif. Tambahkan di Master Data › Kurir & Pengiriman.
          </p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {couriers.map((option) =>
              radio(
                `${id}-courier`,
                option.id,
                courier === option.id,
                () => setCourier(option.id),
                option.name,
              ),
            )}
          </div>
        )}
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium text-text-strong">Slot jam</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {SLOTS.map((value) =>
            radio(
              `${id}-slot`,
              value,
              chosenSlot === value,
              () => setChosenSlot(value),
              SLOT_LABEL[value],
            ),
          )}
        </div>
      </fieldset>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-trend-down px-3 py-2.5 text-sm text-trend-down-fg"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            {error.message}
            {error.details && <span className="mt-1 block">{error.details}</span>}
          </p>
        </div>
      )}
      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={pending || couriers.length === 0}
          className="h-11 rounded-lg px-6"
        >
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </div>
  )
}
