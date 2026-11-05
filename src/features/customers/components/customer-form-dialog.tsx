"use client"

import { CircleAlert, LoaderCircle } from "lucide-react"
import { type ReactNode, useEffect, useId, useRef, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type CustomerFormState, saveCustomer } from "@/features/customers/actions"
import type { CustomerRow } from "@/features/customers/queries"
import { useActionForm } from "@/hooks/use-action-form"
import { useFieldErrors } from "@/hooks/use-field-errors"
import { formatPhone } from "@/lib/phone"

export function CustomerFormDialog({
  customer,
  trigger,
}: {
  customer?: CustomerRow
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
            {customer ? "Ubah customer" : "Tambah customer"}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            No. HP dipakai untuk mengenali customer yang sama saat Input Pesanan.
          </DialogDescription>
        </DialogHeader>
        <CustomerForm key={session} customer={customer} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function CustomerForm({ customer, onSaved }: { customer?: CustomerRow; onSaved: () => void }) {
  const { state, pending, onSubmit } = useActionForm<CustomerFormState>(saveCustomer, {})
  const { errors, hasErrors, onFormChange } = useFieldErrors(state)
  const id = useId()
  const handled = useRef<CustomerFormState | null>(null)

  useEffect(() => {
    if (!state.ok || handled.current === state) return
    handled.current = state
    toast.success(state.message)
    onSaved()
  }, [state, onSaved])

  const describedBy = (name: string) => (errors[name] ? `${id}-${name}-error` : undefined)
  const fieldError = (name: string) =>
    errors[name] ? (
      <p id={`${id}-${name}-error`} className="text-sm text-trend-down-fg">
        {errors[name]}
      </p>
    ) : null

  return (
    <form onSubmit={onSubmit} onChange={onFormChange} className="mt-6 space-y-5" noValidate>
      {customer && <input type="hidden" name="id" value={customer.id} />}

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-name`} className="text-text-strong">
          Nama customer
        </Label>
        <Input
          id={`${id}-name`}
          name="name"
          defaultValue={customer?.name}
          placeholder="Nama sesuai chat WA"
          maxLength={80}
          required
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy("name")}
          className="h-11 rounded-lg bg-white"
        />
        {fieldError("name")}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-phone`} className="text-text-strong">
          No. HP
        </Label>
        <Input
          id={`${id}-phone`}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="0812 3456 7890"
          defaultValue={customer?.phone ? formatPhone(customer.phone) : ""}
          required
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={describedBy("phone")}
          className="h-11 rounded-lg bg-white tabular-nums"
        />
        {fieldError("phone")}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-address`} className="text-text-strong">
          Alamat <span className="font-normal text-text-body">(opsional)</span>
        </Label>
        <Textarea
          id={`${id}-address`}
          name="address"
          defaultValue={customer?.address ?? ""}
          placeholder="Alamat pengiriman yang biasa dipakai"
          rows={3}
          maxLength={300}
          aria-invalid={Boolean(errors.address)}
          aria-describedby={describedBy("address")}
          className="rounded-lg bg-white"
        />
        {fieldError("address")}
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
          {pending ? "Menyimpan…" : customer ? "Simpan perubahan" : "Tambah customer"}
        </Button>
      </div>
    </form>
  )
}
