"use client"

import { CircleAlert, LoaderCircle } from "lucide-react"
import { type ReactNode, useId, useState, useTransition } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PAYMENT_METHOD_TYPE_LABEL } from "@/features/payment-methods/schemas"
import { markOrderPaid } from "@/features/payments/actions"
import type { ActivePaymentMethod } from "@/features/payments/queries"
import { formatRupiah } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Dialog "Tandai Lunas": pilih dibayar lewat apa + catatan opsional.
 * Untuk pesanan yang sudah lunas, dialog yang sama dipakai untuk mengubah metode/catatan.
 */
export function MarkPaidDialog({
  orderId,
  orderNo,
  total,
  methods,
  current,
  trigger,
}: {
  orderId: string
  orderNo: string
  total: number
  methods: ActivePaymentMethod[]
  current?: { methodId: string | null; note: string | null }
  trigger: ReactNode
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [methodId, setMethodId] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function save() {
    if (!methodId) {
      setError("Pilih dibayar lewat apa.")
      return
    }
    startTransition(async () => {
      const result = await markOrderPaid({ orderId, paymentMethodId: methodId, note })
      if (result.ok) {
        toast.success(result.message)
        setOpen(false)
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setMethodId(current?.methodId ?? "")
          setNote(current?.note ?? "")
          setError(undefined)
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[480px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            {current ? `Ubah pembayaran ${orderNo}` : `Tandai ${orderNo} lunas`}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Total {formatRupiah(total)}. Pilih dibayar lewat apa, lalu tambahkan catatan bila perlu.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-5">
          {methods.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-4 text-sm text-text-body">
              Belum ada metode bayar aktif. Admin bisa menambahkannya di Master Data › Metode
              Pembayaran.
            </p>
          ) : (
            <fieldset>
              <legend className="text-sm font-medium text-text-strong">Dibayar lewat</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {methods.map((method) => {
                  const checked = methodId === method.id
                  return (
                    <label
                      key={method.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-3.5 py-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                        checked ? "border-brand bg-nav-active" : "border-border",
                      )}
                    >
                      <input
                        type="radio"
                        name={`${id}-method`}
                        value={method.id}
                        checked={checked}
                        onChange={() => {
                          setMethodId(method.id)
                          setError(undefined)
                        }}
                        className="size-4 shrink-0 accent-brand"
                      />
                      <span>
                        <span className="block font-semibold text-text-strong">{method.name}</span>
                        <span className="block text-[13px] text-text-body">
                          {PAYMENT_METHOD_TYPE_LABEL[method.type]}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`${id}-note`} className="text-text-strong">
              Catatan <span className="font-normal text-text-body">(opsional)</span>
            </Label>
            <Textarea
              id={`${id}-note`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Mis. BCA a.n. Siti, transfer jam 10.12"
              rows={2}
              maxLength={200}
              className="rounded-lg bg-white"
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
            <Button
              onClick={save}
              disabled={pending || methods.length === 0}
              className="h-11 rounded-lg px-6"
            >
              {pending && <LoaderCircle className="animate-spin" aria-hidden />}
              {pending ? "Menyimpan…" : current ? "Simpan perubahan" : "Tandai lunas"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
