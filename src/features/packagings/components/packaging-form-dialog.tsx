"use client"

import { CircleAlert, LoaderCircle } from "lucide-react"
import { type ReactNode, useEffect, useId, useRef, useState } from "react"
import { toast } from "sonner"

import { PhotoField } from "@/components/app/photo-field"
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
import { type PackagingFormState, savePackaging } from "@/features/packagings/actions"
import type { PackagingCategoryRef } from "@/features/packagings/categories"
import type { PackagingRow } from "@/features/packagings/queries"
import { useActionForm } from "@/hooks/use-action-form"
import { useFieldErrors } from "@/hooks/use-field-errors"

export function PackagingFormDialog({
  packaging,
  categories,
  trigger,
}: {
  packaging?: PackagingRow
  categories: PackagingCategoryRef[]
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl bg-card p-6 sm:max-w-[540px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            {packaging ? "Ubah packaging" : "Tambah packaging"}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            {packaging
              ? "Stok diubah lewat menu Stok Packaging (masuk, hitung ulang)."
              : "Stok awal dicatat di riwayat stok."}
          </DialogDescription>
        </DialogHeader>
        <PackagingForm
          key={session}
          packaging={packaging}
          categories={categories}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function PackagingForm({
  packaging,
  categories,
  onSaved,
}: {
  packaging?: PackagingRow
  categories: PackagingCategoryRef[]
  onSaved: () => void
}) {
  const { state, pending, onSubmit } = useActionForm<PackagingFormState>(savePackaging, {})
  const { errors, hasErrors, onFormChange } = useFieldErrors(state)
  const id = useId()
  const [photoError, setPhotoError] = useState<string | null>(null)
  const handled = useRef<PackagingFormState | null>(null)

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
      {packaging && <input type="hidden" name="id" value={packaging.id} />}
      <PhotoField
        label="Foto packaging"
        initialPath={packaging?.photoPath}
        error={errors.photo}
        onErrorChange={setPhotoError}
      />
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
        {field("name", "Nama packaging", {
          defaultValue: packaging?.name,
          placeholder: "Contoh: Classic Red (Large)",
          maxLength: 60,
        })}
        {field("unit", "Satuan", {
          defaultValue: packaging?.unit ?? "pcs",
          maxLength: 20,
        })}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-categoryId`} className="text-text-strong">
          Kategori
        </Label>
        <select
          id={`${id}-categoryId`}
          name="categoryId"
          defaultValue={packaging ? (packaging.categoryId ?? "") : (categories[0]?.id ?? "")}
          aria-invalid={Boolean(errors.categoryId)}
          aria-describedby={errors.categoryId ? `${id}-categoryId-error` : `${id}-categoryId-hint`}
          className="h-11 w-full rounded-lg border border-input bg-white px-3 text-sm text-text-strong outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive sm:w-[260px]"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
          <option value="">Tanpa kategori (Lainnya)</option>
        </select>
        {errors.categoryId ? (
          <p id={`${id}-categoryId-error`} className="text-sm text-trend-down-fg">
            {errors.categoryId}
          </p>
        ) : (
          <p id={`${id}-categoryId-hint`} className="text-[13px] text-text-body">
            Kelompok di Stok Packaging dan dialog packing Hampers.
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field(
          "minStock",
          "Stok minimum",
          {
            defaultValue: packaging?.minStock ?? "",
            inputMode: "numeric",
            placeholder: "Contoh: 50",
          },
          "Di bawah atau sama dengan ini, status jadi Menipis.",
        )}
        {field(
          "capacity",
          "Kapasitas",
          {
            defaultValue: packaging?.capacity ?? "",
            inputMode: "numeric",
            placeholder: "Opsional",
          },
          "Untuk bar stok / kapasitas.",
        )}
      </div>
      {!packaging &&
        field("initialStock", "Stok awal", {
          defaultValue: "",
          inputMode: "numeric",
          placeholder: "0",
        })}

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
        <Button
          type="submit"
          disabled={pending || Boolean(photoError)}
          className="h-11 rounded-lg px-6"
        >
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          {pending ? "Menyimpan…" : packaging ? "Simpan perubahan" : "Tambah packaging"}
        </Button>
      </div>
    </form>
  )
}
