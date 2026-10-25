"use client"

import { CalendarClock, CircleAlert, LoaderCircle, Truck } from "lucide-react"
import { useId, useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { updateOrderStatus } from "@/features/orders/actions"
import type { OrderStatus } from "@/features/orders/filters"
import { assignCourier } from "@/features/shipments/actions"
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
  couriers,
}: {
  orderId: string
  orderNo: string
  orderStatus: OrderStatus
  method: ShippingMethod
  courierId: string | null
  slot: DeliverySlot | null
  couriers: CourierOption[]
}) {
  const [pending, startTransition] = useTransition()
  const action = nextShipmentAction({ method, orderStatus, hasCourier: Boolean(courierId) })
  const canAssign =
    method === "kurir_internal" && orderStatus !== "selesai" && orderStatus !== "dibatalkan"

  function advance(target: OrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, target)
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  if (!action && !canAssign) return null

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
            className={cn("h-12 rounded-lg px-4", !canAssign && "sm:col-span-2")}
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
          <AssignCourierDialog
            orderId={orderId}
            orderNo={orderNo}
            courierId={courierId}
            slot={slot}
            couriers={couriers.filter((courier) => courier.type === "internal")}
            wide={!action}
          />
        )}
      </div>
    </div>
  )
}

function AssignCourierDialog({
  orderId,
  orderNo,
  courierId,
  slot,
  couriers,
  wide,
}: {
  orderId: string
  orderNo: string
  courierId: string | null
  slot: DeliverySlot | null
  couriers: CourierOption[]
  wide: boolean
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [courier, setCourier] = useState("")
  const [chosenSlot, setChosenSlot] = useState<DeliverySlot | "">("")
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function save() {
    if (!courier) return setError("Pilih kurir.")
    if (!chosenSlot) return setError("Pilih slot jam pengiriman.")
    startTransition(async () => {
      const result = await assignCourier({ orderId, courierId: courier, slot: chosenSlot })
      if (result.ok) {
        toast.success(result.message)
        setOpen(false)
      } else {
        setError(result.message)
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setCourier(courierId ?? "")
          setChosenSlot(slot ?? "")
          setError(undefined)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn("h-12 rounded-lg bg-white px-4", wide && "sm:col-span-2")}
        >
          <CalendarClock aria-hidden />
          Ubah Kurir / Jadwal
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[460px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            Kurir & jadwal {orderNo}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Kurir Internal mengantar jam 09.00–17.00 mengikuti rute, dibagi dua slot.
          </DialogDescription>
        </DialogHeader>
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
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-trend-down px-3 py-2.5 text-sm text-trend-down-fg"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
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
      </DialogContent>
    </Dialog>
  )
}
