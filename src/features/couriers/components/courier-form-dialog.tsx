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
import { saveCourier, type CourierFormState } from "@/features/couriers/actions"
import type { CourierRow } from "@/features/couriers/queries"
import { COURIER_TYPE_LABEL, COURIER_TYPES, type CourierType } from "@/features/couriers/schemas"
import { useActionForm } from "@/hooks/use-action-form"
import { useFieldErrors } from "@/hooks/use-field-errors"
import { formatPhone } from "@/lib/phone"

const TYPE_OPTIONS = COURIER_TYPES.map((value) => ({ value, label: COURIER_TYPE_LABEL[value] }))

export function CourierFormDialog({
  courier,
  trigger,
}: {
  courier?: CourierRow
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
            {courier ? "Ubah kurir" : "Tambah kurir"}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Kurir internal punya slot antar 09:00–12:00 dan 13:00–17:00.
          </DialogDescription>
        </DialogHeader>
        <CourierForm key={session} courier={courier} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function CourierForm({ courier, onSaved }: { courier?: CourierRow; onSaved: () => void }) {
  const { state, pending, onSubmit } = useActionForm<CourierFormState>(saveCourier, {})
  const { errors, hasErrors, markEdited, onFormChange } = useFieldErrors(state)
  const id = useId()
  const [type, setType] = useState<CourierType>(courier?.type ?? "internal")
  const [active, setActive] = useState(courier?.isActive ?? true)
  const handled = useRef<CourierFormState | null>(null)

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
      {courier && <input type="hidden" name="id" value={courier.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="isActive" value={String(active)} />

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-name`} className="text-text-strong">
          Nama kurir
        </Label>
        <Input
          id={`${id}-name`}
          name="name"
          defaultValue={courier?.name}
          maxLength={60}
          required
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy("name")}
          className="h-11 rounded-lg bg-white"
        />
        {fieldError("name")}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-text-strong">Tipe</p>
        <SegmentedControl
          label="Tipe"
          options={TYPE_OPTIONS}
          value={type}
          onChange={(value) => {
            setType(value)
            markEdited("type", "phone")
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-phone`} className="text-text-strong">
          No. telp{" "}
          {type === "eksternal" && <span className="font-normal text-text-body">(opsional)</span>}
        </Label>
        <Input
          id={`${id}-phone`}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="0812 3456 7890"
          defaultValue={courier?.phone ? formatPhone(courier.phone) : ""}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={describedBy("phone")}
          className="h-11 rounded-lg bg-white tabular-nums"
        />
        {fieldError("phone")}
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
            Kurir aktif
          </Label>
          <p className="text-[13px] text-text-body">
            Kurir nonaktif tidak bisa dipilih untuk pengiriman baru.
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
          {pending ? "Menyimpan…" : courier ? "Simpan perubahan" : "Tambah kurir"}
        </Button>
      </div>
    </form>
  )
}
