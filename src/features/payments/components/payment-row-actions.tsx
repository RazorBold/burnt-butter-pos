"use client"

import { EllipsisVertical, LoaderCircle, Undo2 } from "lucide-react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cancelOrderPayment } from "@/features/payments/actions"
import { MarkPaidDialog } from "@/features/payments/components/mark-paid-dialog"
import type { ActivePaymentMethod } from "@/features/payments/queries"

/** Aksi baris Pembayaran: Tandai Lunas, atau (sudah lunas) Ubah + Jadikan belum bayar. */
export function PaymentRowActions({
  orderId,
  orderNo,
  total,
  methods,
  paid,
  current,
}: {
  orderId: string
  orderNo: string
  total: number
  methods: ActivePaymentMethod[]
  paid: boolean
  current?: { methodId: string | null; note: string | null }
}) {
  const [confirm, setConfirm] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!paid) {
    return (
      <MarkPaidDialog
        orderId={orderId}
        orderNo={orderNo}
        total={total}
        methods={methods}
        trigger={
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-lg border-brand bg-white px-3.5 font-semibold text-brand-ink"
          >
            Tandai Lunas
          </Button>
        }
      />
    )
  }

  function cancel() {
    startTransition(async () => {
      const result = await cancelOrderPayment(orderId)
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
      setConfirm(false)
    })
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <MarkPaidDialog
        orderId={orderId}
        orderNo={orderNo}
        total={total}
        methods={methods}
        current={current}
        trigger={
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-lg bg-white px-3.5"
            aria-label={`Ubah pembayaran ${orderNo}`}
          >
            Ubah
          </Button>
        }
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg text-text-strong"
            aria-label={`Aksi lain untuk pembayaran ${orderNo}`}
          >
            <EllipsisVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem className="h-10" onSelect={() => setConfirm(true)}>
            <Undo2 aria-hidden />
            Jadikan belum bayar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[440px] sm:p-8">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-bold text-brand-ink">
              Jadikan {orderNo} belum bayar?
            </DialogTitle>
            <DialogDescription className="text-text-body">
              Catatan pembayaran (metode dan catatan) dihapus. Pakai ini bila salah tandai atau
              transfer ternyata belum masuk.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirm(false)}
              className="h-11 rounded-lg bg-white px-5"
            >
              Batal
            </Button>
            <Button onClick={cancel} disabled={pending} className="h-11 rounded-lg px-5">
              {pending && <LoaderCircle className="animate-spin" aria-hidden />}
              Jadikan belum bayar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
