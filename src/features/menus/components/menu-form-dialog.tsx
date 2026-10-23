"use client"

import { CircleAlert, ImageUp, LoaderCircle } from "lucide-react"
import Image from "next/image"
import { type ReactNode, useActionState, useEffect, useId, useRef, useState } from "react"
import { toast } from "sonner"

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
import type { MenuRow } from "@/features/menus/queries"
import {
  CATEGORY_LABEL,
  MAX_PHOTO_BYTES,
  MENU_CATEGORIES,
  type MenuCategory,
  PHOTO_TYPES,
} from "@/features/menus/schemas"
import { photoSrc } from "@/lib/photos"
import { cn } from "@/lib/utils"

const rupiah = new Intl.NumberFormat("id-ID")
const formatDigits = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  return digits ? rupiah.format(Number(digits)) : ""
}

export function MenuFormDialog({ menu, trigger }: { menu?: MenuRow; trigger: ReactNode }) {
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
        <MenuForm key={session} menu={menu} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function priceOf(menu: MenuRow | undefined, size: "large" | "regular" | "single") {
  const price = menu?.variants.find((variant) => variant.size === size)?.price
  return price ? rupiah.format(price) : ""
}

function MenuForm({ menu, onSaved }: { menu?: MenuRow; onSaved: () => void }) {
  const [state, action, pending] = useActionState<MenuFormState, FormData>(saveMenu, {})
  const id = useId()

  const [category, setCategory] = useState<MenuCategory | "">(menu?.category ?? "")
  const initialSizing =
    menu && menu.variants.some((variant) => variant.size !== "single") ? "two_sizes" : "single"
  const [sizing, setSizing] = useState<"two_sizes" | "single">(menu ? initialSizing : "two_sizes")
  const [sizingTouched, setSizingTouched] = useState(Boolean(menu))
  const [prices, setPrices] = useState({
    priceLarge: priceOf(menu, "large"),
    priceRegular: priceOf(menu, "regular"),
    priceSingle: priceOf(menu, "single"),
  })
  const [active, setActive] = useState(menu?.isActive ?? true)
  const [preview, setPreview] = useState<string | null>(photoSrc(menu?.photoPath))
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const handled = useRef<MenuFormState | null>(null)

  // Error dari server disembunyikan per field begitu field itu diubah; direset tiap simpan.
  const [editedFor, setEditedFor] = useState(state)
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set())
  if (editedFor !== state) {
    setEditedFor(state)
    setEdited(new Set())
  }
  const markEdited = (...names: string[]) =>
    setEdited((prev) => (names.every((n) => prev.has(n)) ? prev : new Set([...prev, ...names])))
  const errors = Object.fromEntries(
    Object.entries(state.errors ?? {}).filter(([name]) => !edited.has(name)),
  )

  // Setiap hasil simpan diproses sekali saja (onSaved berubah tiap render induk).
  useEffect(() => {
    if (!state.ok || handled.current === state) return
    handled.current = state
    toast.success(state.message)
    onSaved()
  }, [state, onSaved])

  function onCategoryChange(value: string) {
    const next = value as MenuCategory
    setCategory(next)
    markEdited("category")
    // Pasta biasanya dua ukuran; dessert dan bundle satu harga. Pilihan manual tidak ditimpa.
    if (!sizingTouched) setSizing(next === "pasta" ? "two_sizes" : "single")
  }

  function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setPhotoError(null)
    if (!file) return
    setFileName(file.name)
    if (!PHOTO_TYPES.includes(file.type as (typeof PHOTO_TYPES)[number])) {
      setPhotoError("Foto harus JPG, PNG, atau WebP.")
      event.target.value = ""
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(`Ukuran foto ${(file.size / 1024 / 1024).toFixed(1)} MB. Maksimal 4 MB.`)
      event.target.value = ""
      return
    }
    setPreview(URL.createObjectURL(file))
  }

  const fieldError = (name: string) =>
    errors[name] ? (
      <p id={`${id}-${name}-error`} className="text-sm text-trend-down-fg">
        {errors[name]}
      </p>
    ) : null
  const describedBy = (name: string) => (errors[name] ? `${id}-${name}-error` : undefined)

  return (
    <form
      action={action}
      className="mt-6 space-y-5"
      noValidate
      onChange={(event) => {
        // event.target = field yang berubah (input/textarea), bukan form-nya.
        const field = event.target as unknown as { name?: unknown }
        if (typeof field.name === "string" && field.name) markEdited(field.name)
      }}
    >
      {menu && <input type="hidden" name="id" value={menu.id} />}
      <input type="hidden" name="isActive" value={String(active)} />
      <input type="hidden" name="sizing" value={sizing} />

      <div className="flex items-center gap-4">
        <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#dccbbb] bg-white">
          {preview ? (
            <Image
              src={preview}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
              unoptimized={preview.startsWith("blob:")}
            />
          ) : (
            <ImageUp className="size-7 text-text-body" aria-hidden />
          )}
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor={`${id}-photo`} className="text-text-strong">
            Foto menu
          </Label>
          {/* Input file asli disembunyikan (tombol bawaannya mengikuti bahasa browser). */}
          <input
            ref={fileInput}
            id={`${id}-photo`}
            name="photo"
            type="file"
            accept={PHOTO_TYPES.join(",")}
            onChange={onPhotoChange}
            aria-describedby={`${id}-photo-help`}
            className="sr-only"
          />
          <div className="flex min-w-0 items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInput.current?.click()}
              className="h-9 shrink-0 rounded-lg bg-white px-3 text-brand-ink"
            >
              <ImageUp aria-hidden />
              {preview ? "Ganti foto" : "Pilih foto"}
            </Button>
            {fileName && <span className="truncate text-sm text-text-body">{fileName}</span>}
          </div>
          <p id={`${id}-photo-help`} className="text-[13px] text-text-body">
            JPG, PNG, atau WebP, maksimal 4 MB.
          </p>
          {(photoError || errors.photo) && (
            <p className="text-sm text-trend-down-fg">{photoError ?? errors.photo}</p>
          )}
        </div>
      </div>

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
        <Select name="category" value={category} onValueChange={onCategoryChange} required>
          <SelectTrigger
            id={`${id}-category`}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={describedBy("category")}
            className="h-11! w-full rounded-lg bg-white"
          >
            <SelectValue placeholder="Pilih kategori" />
          </SelectTrigger>
          <SelectContent>
            {MENU_CATEGORIES.map((value) => (
              <SelectItem key={value} value={value}>
                {CATEGORY_LABEL[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldError("category")}
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
        <legend className="text-sm font-medium text-text-strong">Ukuran dan harga</legend>
        <div role="radiogroup" className="inline-flex rounded-lg border border-border bg-white p-1">
          {(
            [
              ["two_sizes", "Large & Regular"],
              ["single", "Satu harga"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={sizing === value}
              onClick={() => {
                setSizing(value)
                setSizingTouched(true)
                markEdited("priceLarge", "priceRegular", "priceSingle")
              }}
              className={cn(
                "h-9 rounded-md px-3.5 text-sm font-medium text-text-body outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                sizing === value && "bg-brand text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>

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

      {state.message && !state.ok && (!state.errors || Object.keys(errors).length > 0) && (
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
