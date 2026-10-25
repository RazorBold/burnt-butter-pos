"use client"

import { CircleAlert, LoaderCircle } from "lucide-react"
import { useId, useState, useTransition } from "react"
import { toast } from "sonner"

import { SegmentedControl } from "@/components/app/segmented-control"
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
import { Textarea } from "@/components/ui/textarea"
import { recordStockMovement } from "@/features/packagings/actions"
import {
  MOVEMENT_MODE_LABEL,
  MOVEMENT_MODES,
  type MovementMode,
  planMovement,
} from "@/features/packagings/stock"

const MODE_OPTIONS = MOVEMENT_MODES.map((value) => ({
  value,
  label: value === "masuk" ? "Masuk" : value === "keluar" ? "Keluar" : "Hitung ulang",
}))

const NOTE_PLACEHOLDER: Record<MovementMode, string> = {
  masuk: "Mis. beli dari supplier, 2 dus",
  keluar: "Mis. rusak, dipakai untuk sampel",
  hitung: "Mis. stok opname akhir bulan",
}

/** Dialog catat stok masuk / keluar / hitung ulang untuk satu packaging. Dibuka terkontrol. */
export function StockMovementDialog({
  packaging,
  mode: initialMode,
  open,
  onOpenChange,
}: {
  packaging: { id: string; name: string; stock: number; unit: string }
  mode: MovementMode
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const id = useId()
  const [mode, setMode] = useState<MovementMode>(initialMode)
  const [qty, setQty] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  // Dialog dibuka dari luar (tombol Masuk/Keluar/Hitung ulang), jadi isian di-reset saat `open`
  // berubah ke true, dengan mode dari tombol yang diklik.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setMode(initialMode)
      setQty("")
      setNote("")
      setError(undefined)
    }
  }

  const number = qty === "" ? null : Number(qty)
  const plan = number === null ? null : planMovement(mode, number, packaging.stock, packaging.unit)

  function save() {
    if (!plan) {
      setError(mode === "hitung" ? "Isi hasil hitung stok." : "Isi jumlahnya.")
      return
    }
    if (!plan.ok) {
      setError(plan.message)
      return
    }
    startTransition(async () => {
      const result = await recordStockMovement({
        packagingId: packaging.id,
        mode,
        qty: number,
        note,
      })
      if (result.ok) {
        toast.success(result.message)
        onOpenChange(false)
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[460px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            {MOVEMENT_MODE_LABEL[mode]}: {packaging.name}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            Stok tercatat sekarang {packaging.stock} {packaging.unit}.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-5">
          <SegmentedControl
            label="Jenis perubahan stok"
            options={MODE_OPTIONS}
            value={mode}
            onChange={(value) => {
              setMode(value)
              setError(undefined)
            }}
          />
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-qty`} className="text-text-strong">
              {mode === "hitung"
                ? `Hasil hitung (${packaging.unit})`
                : `Jumlah (${packaging.unit})`}
            </Label>
            <Input
              id={`${id}-qty`}
              inputMode="numeric"
              value={qty}
              onChange={(event) => {
                setQty(event.target.value.replace(/\D/g, "").slice(0, 7))
                setError(undefined)
              }}
              placeholder={mode === "hitung" ? String(packaging.stock) : "0"}
              aria-describedby={`${id}-preview`}
              className="h-11 w-40 rounded-lg bg-white text-lg font-semibold tabular-nums"
            />
            <p
              id={`${id}-preview`}
              className="text-sm text-text-body tabular-nums"
              aria-live="polite"
            >
              {plan?.ok
                ? `Stok jadi: ${packaging.stock} → ${plan.nextStock} ${packaging.unit}${
                    mode === "hitung" ? ` (${plan.direction === "in" ? "+" : "−"}${plan.qty})` : ""
                  }`
                : mode === "hitung"
                  ? "Isi jumlah hasil hitung fisik; selisihnya yang dicatat."
                  : " "}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-note`} className="text-text-strong">
              Catatan <span className="font-normal text-text-body">(opsional)</span>
            </Label>
            <Textarea
              id={`${id}-note`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={NOTE_PLACEHOLDER[mode]}
              rows={2}
              maxLength={200}
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
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
