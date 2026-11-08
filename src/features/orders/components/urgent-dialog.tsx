"use client"

import { CircleAlert, LoaderCircle, Siren } from "lucide-react"
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
import { setOrderUrgent } from "@/features/orders/actions"

type Props = {
  orderId: string
  orderNo: string
  /** Sudah urgent: dialog menghapus tandanya. */
  urgent: boolean
}

/** Tombol di panel detail: "Tandai urgent" / "Hapus urgent" + dialog konfirmasi. */
export function UrgentButton(props: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant={props.urgent ? "outline" : "destructive"}
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 rounded-lg px-3"
      >
        <Siren aria-hidden />
        {props.urgent ? "Hapus urgent" : "Tandai urgent"}
      </Button>
      <UrgentDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  )
}

/** Konfirmasi tandai / hapus urgent. Menandai urgent memberi popup + suara ke semua staf. */
export function UrgentDialog({
  orderId,
  orderNo,
  urgent,
  open,
  onOpenChange,
}: Props & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[460px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            {urgent ? `Hapus urgent ${orderNo}?` : `Tandai ${orderNo} URGENT?`}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            {urgent
              ? "Label urgent hilang dari semua menu. Pesanan kembali ke antrean biasa."
              : "Semua staf yang sedang membuka aplikasi akan mendapat popup dan bunyi alarm. Pesanan diberi label merah dan didahulukan di Produksi dan Packaging."}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <UrgentForm orderId={orderId} urgent={urgent} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function UrgentForm({
  orderId,
  urgent,
  onDone,
}: {
  orderId: string
  urgent: boolean
  onDone: () => void
}) {
  const id = useId()
  const [note, setNote] = useState("")
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const result = await setOrderUrgent({ orderId, urgent: !urgent, note })
      if (result.ok) {
        toast.success(result.message)
        onDone()
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <div className="mt-6 space-y-5">
      {!urgent && (
        <div className="space-y-1.5">
          <label htmlFor={`${id}-note`} className="text-sm font-medium text-text-strong">
            Alasan <span className="font-normal text-text-body">(opsional)</span>
          </label>
          <input
            id={`${id}-note`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={120}
            placeholder="Mis. customer minta dikirim jam 10"
            className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-text-strong outline-none placeholder:text-text-body/70 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      )}
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
        <Button
          onClick={save}
          disabled={pending}
          variant={urgent ? "default" : "destructive"}
          className="h-11 rounded-lg px-6"
        >
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Siren aria-hidden />}
          {urgent ? "Hapus urgent" : "Tandai urgent"}
        </Button>
      </div>
    </div>
  )
}
