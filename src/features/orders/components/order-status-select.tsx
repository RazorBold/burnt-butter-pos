"use client"

import { ChevronDown, LoaderCircle } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { OrderStatusBadge } from "@/components/app/order-badges"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateOrderStatus } from "@/features/orders/actions"
import type { OrderStatus } from "@/features/orders/filters"
import { nextStatuses } from "@/features/orders/status"
import { cn } from "@/lib/utils"
import type { ShippingMethod } from "@/lib/wa-parser"

/** Dropdown "Ubah Status" di panel detail. Pilihan mengikuti alur status (nextStatuses). */
export function OrderStatusSelect({
  orderId,
  orderNo,
  status,
  method,
  className,
}: {
  orderId: string
  orderNo: string
  status: OrderStatus
  method: ShippingMethod
  className?: string
}) {
  const [pending, startTransition] = useTransition()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const options = nextStatuses(status, method)

  function change(target: OrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, target)
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
      setConfirmCancel(false)
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={pending || options.length === 0}
            className={cn("h-12 justify-between rounded-lg bg-white px-4", className)}
          >
            {pending ? "Menyimpan…" : options.length ? "Ubah Status" : "Status final"}
            {pending ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <ChevronDown aria-hidden />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-[13px] font-normal text-text-body">
            Ubah status {orderNo} ke
          </DropdownMenuLabel>
          {options.map((option) => (
            <DropdownMenuItem
              key={option}
              className="h-10"
              onSelect={() => (option === "dibatalkan" ? setConfirmCancel(true) : change(option))}
            >
              <OrderStatusBadge status={option} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[440px] sm:p-8">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-bold text-brand-ink">
              Batalkan {orderNo}?
            </DialogTitle>
            <DialogDescription className="text-text-body">
              Pesanan dibatalkan tidak dihitung di KPI dan rekap produksi. Bisa dibuka lagi sebagai
              Baru bila salah.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmCancel(false)}
              className="h-11 rounded-lg bg-white px-5"
            >
              Jangan batalkan
            </Button>
            <Button
              onClick={() => change("dibatalkan")}
              disabled={pending}
              className="h-11 rounded-lg bg-trend-down-fg px-5 text-white hover:bg-trend-down-fg/90"
            >
              {pending && <LoaderCircle className="animate-spin" aria-hidden />}
              Batalkan pesanan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
