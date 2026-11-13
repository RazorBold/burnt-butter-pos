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
import { SHIPPING_METHOD_LABEL, SHIPPING_METHODS } from "@/features/orders/constants"
import {
  saveShippingOption,
  type ShippingOptionFormState,
} from "@/features/shipping-options/actions"
import type { ShippingOptionRow } from "@/features/shipping-options/queries"
import { useActionForm } from "@/hooks/use-action-form"
import { useFieldErrors } from "@/hooks/use-field-errors"
import type { ShippingMethod } from "@/lib/wa-parser"

const FLOW_OPTIONS = SHIPPING_METHODS.map((value) => ({
  value,
  label: SHIPPING_METHOD_LABEL[value],
}))

/** Penjelasan alur dasar: menentukan langkah status pesanan di Pengiriman. */
const FLOW_HELP: Record<ShippingMethod, string> = {
  pick_up: "Customer mengambil sendiri: Siap Kirim → Sudah Diambil (Selesai).",
  instant: "Ojek online: Siap Kirim → Dikirim → Selesai, tanpa memilih kurir toko.",
  kurir_internal: "Kurir toko: pilih kurir & jadwal, lalu Dikirim → Selesai.",
  ekspedisi: "Ekspedisi/marketplace: cukup tandai sudah dikirim (langsung Selesai).",
}

export function ShippingOptionFormDialog({
  option,
  trigger,
}: {
  option?: ShippingOptionRow
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
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[560px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            {option ? "Ubah kategori pengiriman" : "Tambah kategori pengiriman"}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Kategori aktif bisa dipilih saat input pesanan dan tampil sebagai kartu di menu
            Pengiriman.
          </DialogDescription>
        </DialogHeader>
        <ShippingOptionForm key={session} option={option} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function ShippingOptionForm({
  option,
  onSaved,
}: {
  option?: ShippingOptionRow
  onSaved: () => void
}) {
  const { state, pending, onSubmit } = useActionForm<ShippingOptionFormState>(
    saveShippingOption,
    {},
  )
  const { errors, hasErrors, markEdited, onFormChange } = useFieldErrors(state)
  const id = useId()
  const [flow, setFlow] = useState<ShippingMethod>(option?.flow ?? "instant")
  const [tracking, setTracking] = useState(option?.liveTracking ?? true)
  const [active, setActive] = useState(option?.isActive ?? true)
  const handled = useRef<ShippingOptionFormState | null>(null)
  const pickUp = flow === "pick_up"

  useEffect(() => {
    if (!state.ok || handled.current === state) return
    handled.current = state
    toast.success(state.message)
    onSaved()
  }, [state, onSaved])

  return (
    <form onSubmit={onSubmit} onChange={onFormChange} className="mt-6 space-y-5" noValidate>
      {option && <input type="hidden" name="id" value={option.id} />}
      <input type="hidden" name="flow" value={flow} />
      <input type="hidden" name="liveTracking" value={String(tracking && !pickUp)} />
      <input type="hidden" name="isActive" value={String(active)} />

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-name`} className="text-text-strong">
          Nama kategori
        </Label>
        <Input
          id={`${id}-name`}
          name="name"
          defaultValue={option?.name}
          placeholder="Contoh: GoSend, Lalamove, Kurir Toko"
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
        <p className="text-sm font-medium text-text-strong">Alur pengiriman</p>
        <SegmentedControl
          label="Alur pengiriman"
          options={FLOW_OPTIONS}
          value={flow}
          onChange={(value) => {
            setFlow(value)
            markEdited("flow")
          }}
        />
        <p className="text-[13px] text-text-body">{FLOW_HELP[flow]}</p>
        {errors.flow && <p className="text-sm text-trend-down-fg">{errors.flow}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-note`} className="text-text-strong">
          Keterangan <span className="font-normal text-text-body">(opsional)</span>
        </Label>
        <Input
          id={`${id}-note`}
          name="note"
          defaultValue={option?.note ?? ""}
          placeholder="Mis. Diantar Lalamove, ongkir ditanggung customer"
          maxLength={120}
          className="h-11 rounded-lg bg-white"
        />
        <p className="text-[13px] text-text-body">
          Tampil di form input pesanan dan di template WA untuk customer.
        </p>
        {errors.note && <p className="text-sm text-trend-down-fg">{errors.note}</p>}
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-white px-4 py-3">
        <Checkbox
          id={`${id}-tracking`}
          checked={tracking && !pickUp}
          disabled={pickUp}
          onCheckedChange={(value) => {
            setTracking(value === true)
            markEdited("liveTracking")
          }}
          className="mt-0.5"
        />
        <div>
          <Label htmlFor={`${id}-tracking`} className="text-text-strong">
            Live tracking
          </Label>
          <p className="text-[13px] text-text-body">
            {pickUp
              ? "Pick Up diambil sendiri, jadi tidak memakai link lacak."
              : "Admin bisa menempelkan link lacak (mis. dari GoSend/Grab) dan mengirimkannya ke customer."}
          </p>
          {errors.liveTracking && (
            <p className="mt-1 text-sm text-trend-down-fg">{errors.liveTracking}</p>
          )}
        </div>
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
            Kategori aktif
          </Label>
          <p className="text-[13px] text-text-body">
            Kategori nonaktif tetap tercatat di pesanan lama, tapi tidak bisa dipilih lagi.
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
          {pending ? "Menyimpan…" : option ? "Simpan perubahan" : "Tambah kategori"}
        </Button>
      </div>
    </form>
  )
}
