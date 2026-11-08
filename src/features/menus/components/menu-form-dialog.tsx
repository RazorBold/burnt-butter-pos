"use client"

import { CircleAlert, LoaderCircle } from "lucide-react"
import { type ReactNode, useEffect, useId, useRef, useState } from "react"
import { toast } from "sonner"

import { PhotoField } from "@/components/app/photo-field"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { saveMenu, type MenuFormState } from "@/features/menus/actions"
import { useActionForm } from "@/hooks/use-action-form"
import { useFieldErrors } from "@/hooks/use-field-errors"
import type { MenuRow } from "@/features/menus/queries"
import type { MenuCategoryRef } from "@/features/menus/schemas"

const rupiah = new Intl.NumberFormat("id-ID")
const formatDigits = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  return digits ? rupiah.format(Number(digits)) : ""
}

export function MenuFormDialog({
  menu,
  categories,
  trigger,
}: {
  menu?: MenuRow
  categories: MenuCategoryRef[]
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState(0)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        // Form baru setiap dibuka, supaya isian/error lama tidak tersisa.
        if (next) setSession((value) => value + 1)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto rounded-2xl bg-card p-6 sm:max-w-[640px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            {menu ? "Ubah menu" : "Tambah menu"}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            {menu
              ? "Perubahan harga hanya berlaku untuk pesanan baru."
              : "Menu baru langsung bisa dipilih saat input pesanan bila statusnya aktif."}
          </DialogDescription>
        </DialogHeader>
        <MenuForm
          key={session}
          menu={menu}
          categories={categories}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function priceOf(menu: MenuRow | undefined, size: "large" | "regular" | "single") {
  const price = menu?.variants.find((variant) => variant.size === size)?.price
  return price ? rupiah.format(price) : ""
}

function MenuForm({
  menu,
  categories,
  onSaved,
}: {
  menu?: MenuRow
  categories: MenuCategoryRef[]
  onSaved: () => void
}) {
  const { state, pending, onSubmit } = useActionForm<MenuFormState>(saveMenu, {})
  const id = useId()

  const [categoryId, setCategoryId] = useState(menu?.category?.id ?? "")
  // Ukuran mengikuti kategori: kategori "Large & Regular" punya dua harga.
  const selected = categories.find((category) => category.id === categoryId)
  const sizing: "two_sizes" | "single" = selected?.sized ? "two_sizes" : "single"
  const [prices, setPrices] = useState({
    priceLarge: priceOf(menu, "large"),
    priceRegular: priceOf(menu, "regular"),
    priceSingle: priceOf(menu, "single"),
  })
  const [active, setActive] = useState(menu?.isActive ?? true)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const handled = useRef<MenuFormState | null>(null)
  const { errors, hasErrors, markEdited, onFormChange } = useFieldErrors(state)

  // Setiap hasil simpan diproses sekali saja (onSaved berubah tiap render induk).
  useEffect(() => {
    if (!state.ok || handled.current === state) return
    handled.current = state
    toast.success(state.message)
    onSaved()
  }, [state, onSaved])

  function onCategoryChange(value: string) {
    setCategoryId(value)
    markEdited("categoryId", "priceLarge", "priceRegular", "priceSingle")
  }

  const fieldError = (name: string) =>
    errors[name] ? (
      <p id={`${id}-${name}-error`} className="text-sm text-trend-down-fg">
        {errors[name]}
      </p>
    ) : null
  const describedBy = (name: string) => (errors[name] ? `${id}-${name}-error` : undefined)

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate onChange={onFormChange}>
      {menu && <input type="hidden" name="id" value={menu.id} />}
      <input type="hidden" name="isActive" value={String(active)} />
      <input type="hidden" name="sizing" value={sizing} />

      <PhotoField
        label="Foto menu"
        initialPath={menu?.photoPath}
        error={errors.photo}
        onErrorChange={setPhotoError}
      />

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-name`} className="text-text-strong">
          Nama menu
        </Label>
        <Input
          id={`${id}-name`}
          name="name"
          defaultValue={menu?.name}
          required
          maxLength={80}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={describedBy("name")}
          className="h-11 rounded-lg bg-white"
        />
        {fieldError("name")}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-category`} className="text-text-strong">
          Kategori
        </Label>
        <Select name="categoryId" value={categoryId} onValueChange={onCategoryChange} required>
          <SelectTrigger
            id={`${id}-category`}
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={describedBy("categoryId")}
            className="h-11! w-full rounded-lg bg-white"
          >
            <SelectValue placeholder="Pilih kategori" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
                {category.sized ? " (Large & Regular)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldError("categoryId")}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-description`} className="text-text-strong">
          Deskripsi <span className="font-normal text-text-body">(opsional)</span>
        </Label>
        <Textarea
          id={`${id}-description`}
          name="description"
          defaultValue={menu?.description ?? ""}
          maxLength={240}
          rows={2}
          aria-describedby={describedBy("description")}
          className="rounded-lg bg-white"
        />
        {fieldError("description")}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text-strong">Harga</legend>
        <p className="text-[13px] text-text-body">
          {selected
            ? selected.sized
              ? `Kategori ${selected.name} memakai ukuran Large dan Regular.`
              : `Kategori ${selected.name} memakai satu harga.`
            : "Pilih kategori dulu; ukuran mengikuti kategori."}
        </p>

        <div className="grid gap-3 pt-1 sm:grid-cols-2">
          {sizing === "two_sizes" ? (
            <>
              <PriceField
                id={`${id}-priceLarge`}
                name="priceLarge"
                label="Harga Large"
                value={prices.priceLarge}
                onChange={(value) => setPrices((p) => ({ ...p, priceLarge: value }))}
                error={errors.priceLarge}
              />
              <PriceField
                id={`${id}-priceRegular`}
                name="priceRegular"
                label="Harga Regular"
                value={prices.priceRegular}
                onChange={(value) => setPrices((p) => ({ ...p, priceRegular: value }))}
                error={errors.priceRegular}
              />
            </>
          ) : (
            <PriceField
              id={`${id}-priceSingle`}
              name="priceSingle"
              label="Harga"
              value={prices.priceSingle}
              onChange={(value) => setPrices((p) => ({ ...p, priceSingle: value }))}
              error={errors.priceSingle}
            />
          )}
        </div>
      </fieldset>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-white px-4 py-3">
        <Checkbox
          id={`${id}-active`}
          checked={active}
          onCheckedChange={(value) => setActive(value === true)}
          className="mt-0.5"
        />
        <div>
          <Label htmlFor={`${id}-active`} className="text-text-strong">
            Menu aktif
          </Label>
          <p className="text-[13px] text-text-body">
            Menu nonaktif tidak muncul saat input pesanan, tapi riwayat pesanannya tetap ada.
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

      <div className="flex justify-end gap-3 pt-1">
        <Button
          type="submit"
          disabled={pending || Boolean(photoError)}
          className="h-11 rounded-lg px-6"
        >
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          {pending ? "Menyimpan…" : menu ? "Simpan perubahan" : "Tambah menu"}
        </Button>
      </div>
    </form>
  )
}

function PriceField({
  id,
  name,
  label,
  value,
  onChange,
  error,
}: {
  id: string
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] font-normal text-text-body">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-text-body">
          Rp
        </span>
        <Input
          id={id}
          name={name}
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(formatDigits(event.target.value))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-11 rounded-lg bg-white pl-10 tabular-nums"
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-trend-down-fg">
          {error}
        </p>
      )}
    </div>
  )
}
