"use client"

import { CircleAlert, LoaderCircle } from "lucide-react"
import { type ReactNode, useEffect, useId, useRef, useState } from "react"
import { toast } from "sonner"

import { SegmentedControl } from "@/components/app/segmented-control"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { savePaymentMethod, type PaymentMethodFormState } from "@/features/payment-methods/actions"
import type { PaymentMethodRow } from "@/features/payment-methods/queries"
import {
  PAYMENT_METHOD_TYPE_LABEL,
  PAYMENT_METHOD_TYPES,
  type PaymentMethodType,
} from "@/features/payment-methods/schemas"
import { useActionForm } from "@/hooks/use-action-form"
import { useFieldErrors } from "@/hooks/use-field-errors"

const TYPE_OPTIONS = PAYMENT_METHOD_TYPES.map((value) => ({
  value,
  label: PAYMENT_METHOD_TYPE_LABEL[value],
}))

export function PaymentMethodFormDialog({
  method,
  trigger,
}: {
  method?: PaymentMethodRow
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState(0)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setSession((value) => value + 1)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[520px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            {method ? "Ubah metode" : "Tambah metode"}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Metode aktif bisa dipilih saat mencatat pembayaran pesanan.
          </DialogDescription>
        </DialogHeader>
        <PaymentMethodForm key={session} method={method} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function PaymentMethodForm({
  method,
  onSaved,
}: {
  method?: PaymentMethodRow
  onSaved: () => void
}) {
  const { state, pending, onSubmit } = useActionForm<PaymentMethodFormState>(savePaymentMethod, {})
  const { errors, hasErrors, markEdited, onFormChange } = useFieldErrors(state)
  const id = useId()
  const [type, setType] = useState<PaymentMethodType>(method?.type ?? "bank")
  const [active, setActive] = useState(method?.isActive ?? true)
  const handled = useRef<PaymentMethodFormState | null>(null)

  useEffect(() => {
    if (!state.ok || handled.current === state) return
    handled.current = state
    toast.success(state.message)
    onSaved()
  }, [state, onSaved])

  return (
    <form onSubmit={onSubmit} onChange={onFormChange} className="mt-6 space-y-5" noValidate>
      {method && <input type="hidden" name="id" value={method.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="isActive" value={String(active)} />

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-name`} className="text-text-strong">
          Nama metode
        </Label>
        <Input
          id={`${id}-name`}
          name="name"
          defaultValue={method?.name}
          placeholder="Contoh: Transfer BCA, GoPay"
          maxLength={40}
          required
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${id}-name-error` : undefined}
          className="h-11 rounded-lg bg-white"
        />
        {errors.name && (
          <p id={`${id}-name-error`} className="text-sm text-trend-down-fg">
            {errors.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-text-strong">Tipe</p>
        <SegmentedControl
          label="Tipe"
          options={TYPE_OPTIONS}
          value={type}
          onChange={(value) => {
            setType(value)
            markEdited("type")
          }}
        />
        {errors.type && <p className="text-sm text-trend-down-fg">{errors.type}</p>}
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-white px-4 py-3">
        <Checkbox
          id={`${id}-active`}
          checked={active}
          onCheckedChange={(value) => setActive(value === true)}
          className="mt-0.5"
        />
        <div>
          <Label htmlFor={`${id}-active`} className="text-text-strong">
            Metode aktif
          </Label>
          <p className="text-[13px] text-text-body">
            Metode nonaktif tetap tercatat di pembayaran lama, tapi tidak bisa dipilih lagi.
          </p>
        </div>
      </div>

      {state.message && !state.ok && (!state.errors || hasErrors) && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-trend-down px-3 py-2.5 text-sm text-trend-down-fg"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.message}
        </p>
      )}

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending} className="h-11 rounded-lg px-6">
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          {pending ? "Menyimpan…" : method ? "Simpan perubahan" : "Tambah metode"}
        </Button>
      </div>
    </form>
  )
}
