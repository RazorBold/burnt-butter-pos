"use client"

import { LoaderCircle, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { EditIconButton } from "@/components/app/row-actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deletePackaging } from "@/features/packagings/actions"
import type { PackagingCategoryRef } from "@/features/packagings/categories"
import { PackagingFormDialog } from "@/features/packagings/components/packaging-form-dialog"
import type { PackagingRow } from "@/features/packagings/queries"

/**
 * Aksi baris Master Data › Stok Packaging (Owner): ubah data dan hapus jenis stok. Stok masuk /
 * hitung ulang tetap di menu Stok Packaging.
 */
export function PackagingRowActions({
  packaging,
  categories,
}: {
  packaging: PackagingRow
  categories: PackagingCategoryRef[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function remove() {
    startTransition(async () => {
      const result = await deletePackaging(packaging.id)
      if (result.ok) {
        toast.success(result.message)
        setOpen(false)
      } else toast.error(result.message)
    })
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <PackagingFormDialog
        packaging={packaging}
        categories={categories}
        trigger={<EditIconButton name={packaging.name} />}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={`Hapus ${packaging.name}`}
        title={`Hapus ${packaging.name}`}
        className="size-9 rounded-lg text-trend-down-fg hover:bg-trend-down"
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[440px] sm:p-8">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-bold text-brand-ink">
              Hapus {packaging.name}?
            </DialogTitle>
            <DialogDescription className="text-text-body">
              Packaging hilang dari Stok Packaging dan dialog packing. Bila sudah punya riwayat
              stok, packaging diarsipkan supaya riwayat dan pesanan lama tetap utuh.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-11 rounded-lg bg-white px-5"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={remove}
              disabled={pending}
              className="h-11 rounded-lg px-5"
            >
              {pending && <LoaderCircle className="animate-spin" aria-hidden />}
              Hapus packaging
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
