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
import { type RawMaterialFormState, saveRawMaterial } from "@/features/raw-materials/actions"
import type { RawMaterialRow } from "@/features/raw-materials/queries"
import { useActionForm } from "@/hooks/use-action-form"
import { useFieldErrors } from "@/hooks/use-field-errors"
import { formatJumlah } from "@/lib/format"

export function RawMaterialFormDialog({
  material,
  trigger,
}: {
  material?: RawMaterialRow
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl bg-card p-6 sm:max-w-[500px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            {material ? "Ubah bahan baku" : "Tambah bahan baku"}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            {material
              ? "Stok diubah lewat Catat stok (masuk, keluar, hitung ulang) supaya ada riwayatnya."
              : "Stok awal dicatat di riwayat stok."}
          </DialogDescription>
        </DialogHeader>
        <RawMaterialForm key={session} material={material} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function RawMaterialForm({
  material,
  onSaved,
}: {
  material?: RawMaterialRow
  onSaved: () => void
}) {
  const { state, pending, onSubmit } = useActionForm<RawMaterialFormState>(saveRawMaterial, {})
  const { errors, hasErrors, onFormChange } = useFieldErrors(state)
  const id = useId()
  const handled = useRef<RawMaterialFormState | null>(null)

  useEffect(() => {
    if (!state.ok || handled.current === state) return
    handled.current = state
    toast.success(state.message)
    onSaved()
  }, [state, onSaved])

  const field = (
    name: string,
    label: string,
    props: React.ComponentProps<typeof Input>,
    hint?: string,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`${id}-${name}`} className="text-text-strong">
        {label}
      </Label>
      <Input
        id={`${id}-${name}`}
        name={name}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={
          errors[name] ? `${id}-${name}-error` : hint ? `${id}-${name}-hint` : undefined
        }
        className="h-11 rounded-lg bg-white"
        {...props}
      />
      {errors[name] ? (
        <p id={`${id}-${name}-error`} className="text-sm text-trend-down-fg">
          {errors[name]}
        </p>
      ) : (
        hint && (
          <p id={`${id}-${name}-hint`} className="text-[13px] text-text-body">
            {hint}
          </p>
        )
      )}
    </div>
  )

  return (
    <form onSubmit={onSubmit} onChange={onFormChange} className="mt-6 space-y-5" noValidate>
      {material && <input type="hidden" name="id" value={material.id} />}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
        {field("name", "Nama bahan", {
          defaultValue: material?.name,
          placeholder: "Contoh: Keju Cheddar",
          maxLength: 60,
        })}
        {field("unit", "Satuan", {
          defaultValue: material?.unit ?? "kg",
          maxLength: 20,
        })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field(
          "minStock",
          "Stok minimum",
          {
            defaultValue: material ? formatJumlah(material.minStock) : "",
            inputMode: "decimal",
            placeholder: "Contoh: 10",
          },
          "Di bawah atau sama dengan ini, status jadi Menipis.",
        )}
        {!material &&
          field(
            "initialStock",
            "Stok awal",
            { defaultValue: "", inputMode: "decimal", placeholder: "0" },
            "Boleh pakai koma, mis. 2,5.",
          )}
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
          {pending ? "Menyimpan…" : material ? "Simpan perubahan" : "Tambah bahan baku"}
        </Button>
      </div>
    </form>
  )
}
