"use client"

import { CircleAlert, LoaderCircle, StickyNote } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateOrderNote } from "@/features/orders/actions"

/** Dialog catatan pesanan, mis. add-on pembeli. Dikosongkan = catatan dihapus. */
export function OrderNoteDialog({
  open,
  onOpenChange,
  orderId,
  orderNo,
  note,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  orderNo: string
  note: string | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[480px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">Catatan {orderNo}</DialogTitle>
          <DialogDescription className="text-text-body">
            Terlihat di semua menu, termasuk Dashboard dan Produksi. Tidak mengubah total pesanan.
          </DialogDescription>
        </DialogHeader>
        <NoteForm orderId={orderId} initial={note ?? ""} onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function NoteForm({
  orderId,
  initial,
  onSaved,
}: {
  orderId: string
  initial: string
  onSaved: () => void
}) {
  const id = useId()
  const [note, setNote] = useState(initial)
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const result = await updateOrderNote(orderId, note)
      if (result.ok) {
        toast.success(result.message)
        onSaved()
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-note`} className="text-text-strong">
          Catatan
        </Label>
        <Textarea
          id={`${id}-note`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Mis. add on keju extra 2, saus dipisah"
          rows={3}
          maxLength={300}
          className="rounded-lg bg-white"
        />
      </div>
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-trend-down px-3 py-2.5 text-sm text-trend-down-fg"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button onClick={save} disabled={pending} className="h-11 rounded-lg px-6">
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          {pending ? "Menyimpan…" : "Simpan catatan"}
        </Button>
      </div>
    </div>
  )
}

/** Tombol catatan di panel Detail Pesanan. */
export function OrderNoteButton({
  orderId,
  orderNo,
  note,
}: {
  orderId: string
  orderNo: string
  note: string | null
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 rounded-lg bg-white px-3"
      >
        <StickyNote aria-hidden />
        {note ? "Ubah catatan" : "Tambah catatan"}
      </Button>
      <OrderNoteDialog
        open={open}
        onOpenChange={setOpen}
        orderId={orderId}
        orderNo={orderNo}
        note={note}
      />
    </>
  )
}
