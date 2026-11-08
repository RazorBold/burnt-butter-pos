"use client"

import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  LoaderCircle,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from "lucide-react"
import { useId, useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deleteCategory, moveCategory, saveCategory } from "@/features/menus/actions"
import type { MenuCategoryRow } from "@/features/menus/queries"
import { cn } from "@/lib/utils"

/**
 * Kategori menu (Owner): urutan = urutan kelompok di form pesanan. Tambah, ubah nama/jenis
 * ukuran, geser urutan, dan hapus (hanya bila kosong).
 */
export function CategoryManager({
  categories,
  canEdit,
}: {
  categories: MenuCategoryRow[]
  canEdit: boolean
}) {
  const [editing, setEditing] = useState<MenuCategoryRow | "new" | null>(null)
  const [removing, setRemoving] = useState<MenuCategoryRow | null>(null)
  const [pending, startTransition] = useTransition()

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveCategory(id, direction)
      if (!result.ok) toast.error(result.message)
    })
  }

  return (
    <section aria-labelledby="kategori-title" className="border-b border-border px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="kategori-title" className="flex items-center gap-2 font-semibold text-brand-ink">
            <Tags className="size-4" aria-hidden />
            Kategori menu
          </h3>
          <p className="mt-0.5 text-sm text-text-body">
            Urutan di sini = urutan kelompok di form pesanan dan template WA.
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => setEditing("new")}
            variant="outline"
            className="h-10 rounded-lg bg-white px-4"
          >
            <Plus className="size-4" aria-hidden />
            Tambah kategori
          </Button>
        )}
      </div>

      <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-white">
        {categories.map((category, index) => (
          <li key={category.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-text-strong">{category.name}</p>
              <p className="text-[13px] text-text-body">
                {category.sized ? "Large & Regular" : "Satu harga"} · {category.menuCount} menu
              </p>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1">
                <IconButton
                  label={`Naikkan ${category.name}`}
                  disabled={pending || index === 0}
                  onClick={() => move(category.id, "up")}
                >
                  <ArrowUp className="size-4" aria-hidden />
                </IconButton>
                <IconButton
                  label={`Turunkan ${category.name}`}
                  disabled={pending || index === categories.length - 1}
                  onClick={() => move(category.id, "down")}
                >
                  <ArrowDown className="size-4" aria-hidden />
                </IconButton>
                <IconButton
                  label={`Ubah kategori ${category.name}`}
                  onClick={() => setEditing(category)}
                >
                  <Pencil className="size-4" aria-hidden />
                </IconButton>
                <IconButton
                  label={`Hapus kategori ${category.name}`}
                  onClick={() => setRemoving(category)}
                  className="text-trend-down-fg hover:bg-trend-down"
                >
                  <Trash2 className="size-4" aria-hidden />
                </IconButton>
              </div>
            )}
          </li>
        ))}
      </ul>

      {editing && (
        <CategoryDialog
          category={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {removing && <DeleteCategoryDialog category={removing} onClose={() => setRemoving(null)} />}
    </section>
  )
}

function IconButton({
  label,
  className,
  ...props
}: { label: string } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-lg text-text-strong outline-none hover:bg-nav-active focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-35",
        className,
      )}
      {...props}
    />
  )
}

function CategoryDialog({
  category,
  onClose,
}: {
  category?: MenuCategoryRow
  onClose: () => void
}) {
  const id = useId()
  const [name, setName] = useState(category?.name ?? "")
  const [sized, setSized] = useState(category?.sized ?? false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string>()
  const [pending, startTransition] = useTransition()
  const locked = Boolean(category && category.menuCount > 0)

  function save() {
    startTransition(async () => {
      const result = await saveCategory({ id: category?.id, name, sized })
      if (result.ok) {
        toast.success(result.message)
        onClose()
        return
      }
      setErrors(result.errors ?? {})
      setMessage(result.errors ? undefined : result.message)
    })
  }

  const option = (value: boolean, title: string, hint: string) => (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border bg-white px-3.5 py-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        sized === value ? "border-brand bg-nav-active" : "border-border",
        locked && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="radio"
        name={`${id}-sized`}
        checked={sized === value}
        disabled={locked}
        onChange={() => setSized(value)}
        className="mt-1 size-4 shrink-0 accent-brand"
      />
      <span>
        <span className="block font-medium text-text-strong">{title}</span>
        <span className="block text-[13px] text-text-body">{hint}</span>
      </span>
    </label>
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[480px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            {category ? `Ubah kategori ${category.name}` : "Tambah kategori"}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Mis. kategori event musiman. Kategori baru tampil paling bawah; geser urutannya lewat
            panah.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-name`} className="text-text-strong">
              Nama kategori
            </Label>
            <Input
              id={`${id}-name`}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setErrors({})
              }}
              maxLength={40}
              placeholder="Mis. Event Natal"
              aria-invalid={Boolean(errors.name)}
              className="h-11 rounded-lg bg-white"
            />
            {errors.name && <p className="text-sm text-trend-down-fg">{errors.name}</p>}
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-text-strong">Ukuran menu</legend>
            <div className="grid gap-2">
              {option(false, "Satu harga", "Seperti Dessert dan Special Bundle.")}
              {option(true, "Large & Regular", "Seperti Pasta: tiap menu punya dua harga.")}
            </div>
            {locked && (
              <p className="text-[13px] text-text-body">
                Jenis ukuran terkunci karena sudah ada {category!.menuCount} menu di kategori ini.
              </p>
            )}
            {errors.sized && <p className="text-sm text-trend-down-fg">{errors.sized}</p>}
          </fieldset>
          {message && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-trend-down px-3 py-2.5 text-sm text-trend-down-fg"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {message}
            </p>
          )}
          <div className="flex justify-end">
            <Button onClick={save} disabled={pending} className="h-11 rounded-lg px-6">
              {pending && <LoaderCircle className="animate-spin" aria-hidden />}
              {pending ? "Menyimpan…" : category ? "Simpan kategori" : "Tambah kategori"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DeleteCategoryDialog({
  category,
  onClose,
}: {
  category: MenuCategoryRow
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  const blocked = category.menuCount > 0

  function remove() {
    startTransition(async () => {
      const result = await deleteCategory(category.id)
      if (result.ok) {
        toast.success(result.message)
        onClose()
      } else setError(result.message)
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[440px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            Hapus kategori {category.name}?
          </DialogTitle>
          <DialogDescription className="text-text-body">
            {blocked
              ? `Masih ada ${category.menuCount} menu di kategori ini. Pindahkan menunya ke kategori lain (Ubah menu) atau hapus menunya dulu.`
              : "Kategori hilang dari form pesanan dan Master Data."}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="mt-4 text-sm text-trend-down-fg">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="h-11 rounded-lg bg-white px-5">
            {blocked ? "Tutup" : "Batal"}
          </Button>
          {!blocked && (
            <Button
              variant="destructive"
              onClick={remove}
              disabled={pending}
              className="h-11 rounded-lg px-5"
            >
              {pending && <LoaderCircle className="animate-spin" aria-hidden />}
              Hapus kategori
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
