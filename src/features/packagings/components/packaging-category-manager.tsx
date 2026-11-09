"use client"

import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  FolderTree,
  LoaderCircle,
  Pencil,
  Plus,
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
import {
  deletePackagingCategory,
  movePackagingCategory,
  savePackagingCategory,
} from "@/features/packagings/actions"
import type { PackagingCategoryRow } from "@/features/packagings/queries"
import { cn } from "@/lib/utils"

/**
 * Kategori stok packaging (Owner): urutan = urutan kelompok di Stok Packaging dan dialog packing
 * Hampers. Tambah, ganti nama, geser urutan, dan hapus (hanya bila kosong).
 */
export function PackagingCategoryManager({
  categories,
  canEdit,
}: {
  categories: PackagingCategoryRow[]
  canEdit: boolean
}) {
  const [editing, setEditing] = useState<PackagingCategoryRow | "new" | null>(null)
  // Simpan id saja: dialog selalu membaca data terbaru dari server (mis. jumlah isi setelah
  // packaging/menu terakhir dihapus), bukan salinan saat tombol diklik.
  const [removingId, setRemovingId] = useState<string | null>(null)
  const removing = categories.find((category) => category.id === removingId) ?? null
  const [pending, startTransition] = useTransition()

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      const result = await movePackagingCategory(id, direction)
      if (!result.ok) toast.error(result.message)
    })
  }

  return (
    <section aria-labelledby="kategori-stok-title" className="border-b border-border px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="kategori-stok-title"
            className="flex items-center gap-2 font-semibold text-brand-ink"
          >
            <FolderTree className="size-4" aria-hidden />
            Kategori stok
          </h3>
          <p className="mt-0.5 text-sm text-text-body">
            Urutan di sini = urutan kelompok di Stok Packaging dan dialog packing Hampers.
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

      {categories.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-4 text-sm text-text-body">
          Belum ada kategori. Semua packaging tampil di kelompok &ldquo;Lainnya&rdquo;.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-white">
          {categories.map((category, index) => (
            <li key={category.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text-strong">{category.name}</p>
                <p className="text-[13px] text-text-body">{category.itemCount} packaging</p>
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
                    onClick={() => setRemovingId(category.id)}
                    className="text-trend-down-fg hover:bg-trend-down"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </IconButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <CategoryDialog
          category={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {removing && <DeleteCategoryDialog category={removing} onClose={() => setRemovingId(null)} />}
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
      suppressHydrationWarning
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
  category?: PackagingCategoryRow
  onClose: () => void
}) {
  const id = useId()
  const [name, setName] = useState(category?.name ?? "")
  const [error, setError] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const result = await savePackagingCategory({ id: category?.id, name })
      if (result.ok) {
        toast.success(result.message)
        onClose()
        return
      }
      setError(result.errors?.name)
      setMessage(result.errors ? undefined : result.message)
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[440px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            {category ? `Ubah kategori ${category.name}` : "Tambah kategori stok"}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Mis. &ldquo;Box Event Natal&rdquo; atau &ldquo;Paper Bag&rdquo;. Kategori baru tampil
            paling bawah; geser urutannya lewat panah.
          </DialogDescription>
        </DialogHeader>
        <form
          className="mt-6 space-y-5"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-name`} className="text-text-strong">
              Nama kategori
            </Label>
            <Input
              id={`${id}-name`}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(undefined)
              }}
              maxLength={40}
              placeholder="Mis. Size Large"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-name-error` : undefined}
              className="h-11 rounded-lg bg-white"
            />
            {error && (
              <p id={`${id}-name-error`} className="text-sm text-trend-down-fg">
                {error}
              </p>
            )}
          </div>
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
            <Button type="submit" disabled={pending} className="h-11 rounded-lg px-6">
              {pending && <LoaderCircle className="animate-spin" aria-hidden />}
              {pending ? "Menyimpan…" : category ? "Simpan kategori" : "Tambah kategori"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteCategoryDialog({
  category,
  onClose,
}: {
  category: PackagingCategoryRow
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  const blocked = category.itemCount > 0

  function remove() {
    startTransition(async () => {
      const result = await deletePackagingCategory(category.id)
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
              ? `Masih ada ${category.itemCount} packaging di kategori ini. Pindahkan packaging-nya ke kategori lain (ikon ubah) atau hapus dulu.`
              : "Kategori hilang dari Stok Packaging dan dialog packing."}
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
