"use client"

import { MessageCircle, RotateCcw, WandSparkles } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

// Kerangka modal dari docs/design/02-input-pesanan-modal.png.
// Parser WA dan form hasilnya menyusul (BELL-15, BELL-16); sampai itu tombol Isi Otomatis nonaktif.
export function InputOrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [text, setText] = useState("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[760px] sm:p-8">
        <DialogHeader className="gap-1.5 text-left">
          <DialogTitle className="text-[28px] leading-tight font-bold text-brand-ink">
            Input Pesanan
          </DialogTitle>
          <DialogDescription className="text-[15px] text-text-body">
            Tempel pesan pesanan dari WhatsApp untuk mengisi data secara otomatis.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 flex items-start gap-4 rounded-xl border border-border bg-nav-active/60 p-4 sm:p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white">
            <MessageCircle className="size-6" aria-hidden />
          </span>
          <div>
            <p className="font-semibold text-text-strong">Tempel pesan dari WhatsApp</p>
            <p className="mt-0.5 text-sm text-text-body">
              Salin pesan pesanan dari WhatsApp, lalu tempel di sini. Sistem akan membaca dan
              mengisi form secara otomatis.
            </p>
          </div>
        </div>

        <label htmlFor="wa-text" className="sr-only">
          Pesan WhatsApp
        </label>
        <Textarea
          id="wa-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Tempel pesan pesanan dari WhatsApp di sini…"
          className="mt-5 min-h-[260px] resize-y rounded-xl bg-white p-4 text-[15px] sm:min-h-[340px]"
        />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled
            aria-describedby="isi-otomatis-note"
            className="h-12 rounded-lg px-6 text-[15px]"
          >
            <WandSparkles aria-hidden />
            Isi Otomatis
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setText("")}
            disabled={!text}
            className="h-12 rounded-lg bg-white px-6 text-[15px]"
          >
            <RotateCcw aria-hidden />
            Reset
          </Button>
          <p id="isi-otomatis-note" className="text-sm text-text-body">
            Isi otomatis sedang disiapkan.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
