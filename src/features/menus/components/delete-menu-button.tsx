"use client"

import { LoaderCircle, Trash2 } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteMenu } from "@/features/menus/actions"

/**
 * Hapus menu (Owner) dengan konfirmasi. Menu yang sudah pernah dipesan diarsipkan otomatis
 * supaya riwayat pesanan dan laporan tetap utuh.
 */
export function DeleteMenuButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function remove() {
    startTransition(async () => {
      const result = await deleteMenu(id)
      if (result.ok) {
        toast.success(result.message)
        setOpen(false)
      } else toast.error(result.message)
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={`Hapus ${name}`}
        title={`Hapus ${name}`}
        className="size-9 rounded-lg text-trend-down-fg hover:bg-trend-down"
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[440px] sm:p-8">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-bold text-brand-ink">Hapus {name}?</DialogTitle>
            <DialogDescription className="text-text-body">
              Menu hilang dari daftar dan form pesanan. Bila sudah pernah dipesan, menu diarsipkan
              supaya pesanan lama dan laporan tetap utuh.
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
              Hapus menu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
