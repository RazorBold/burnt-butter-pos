"use client"

import { MessageCircle, RotateCcw, ShoppingBag, WandSparkles } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

import { SegmentedControl } from "@/components/app/segmented-control"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  ORDER_CHANNEL_LABEL,
  ORDER_CHANNELS,
  type OrderChannel,
  type StoredDraft,
  WA_DRAFT_EVENT,
  WA_DRAFT_KEY,
} from "@/features/orders/constants"

const FORM_PATH = "/pesanan/baru"

const CHANNEL_OPTIONS = ORDER_CHANNELS.map((value) => ({
  value,
  label: ORDER_CHANNEL_LABEL[value],
}))

// Modal dari docs/design/02-input-pesanan-modal.png. Isi Otomatis membawa pesan ke halaman
// /pesanan/baru (lewat sessionStorage), tempat pesan dibaca dan form hasilnya bisa dicek.
// Shopee/Tokopedia memakai alur yang sama dengan template Olshop (?sumber=).
export function InputOrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [text, setText] = useState("")
  const [channel, setChannel] = useState<OrderChannel>("whatsapp")
  const router = useRouter()
  const pathname = usePathname()

  const marketplace = channel !== "whatsapp"
  const label = ORDER_CHANNEL_LABEL[channel]
  const formHref = marketplace ? `${FORM_PATH}?sumber=${channel}` : FORM_PATH

  function fillForm() {
    try {
      const stored: StoredDraft = { text, channel }
      sessionStorage.setItem(WA_DRAFT_KEY, JSON.stringify(stored))
    } catch {
      // Tanpa sessionStorage, kasir tetap bisa menempel ulang pesan di halaman form.
    }
    setText("")
    onOpenChange(false)
    // Halaman yang sudah terbuka membaca pesan lewat event, dan menyesuaikan sumbernya sendiri.
    if (pathname === FORM_PATH) window.dispatchEvent(new Event(WA_DRAFT_EVENT))
    else router.push(formHref)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl bg-card p-6 sm:max-w-[760px] sm:p-8">
        <DialogHeader className="gap-1.5 text-left">
          <DialogTitle className="text-[28px] leading-tight font-bold text-brand-ink">
            Input Pesanan
          </DialogTitle>
          <DialogDescription className="text-[15px] text-text-body">
            Pilih asal pesanan, lalu isi datanya.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          <SegmentedControl
            label="Sumber pesanan"
            options={CHANNEL_OPTIONS}
            value={channel}
            onChange={setChannel}
          />
        </div>

        <div className="mt-5 flex items-start gap-4 rounded-xl border border-border bg-nav-active/60 p-4 sm:p-5">
          {marketplace ? (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-icon-bg text-brand-ink">
              <ShoppingBag className="size-6" aria-hidden />
            </span>
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white">
              <MessageCircle className="size-6" aria-hidden />
            </span>
          )}
          <div>
            <p className="font-semibold text-text-strong">
              {marketplace ? `Tempel template ${label}` : "Tempel pesan dari WhatsApp"}
            </p>
            <p className="mt-0.5 text-sm text-text-body">
              {marketplace
                ? "Tempel template Olshop yang sudah diisi: marketplace, tanggal pengiriman, nama penerima, nomor invoice, dan menu. Pesanan otomatis tercatat Lunas."
                : "Salin pesan pesanan dari WhatsApp, lalu tempel di sini. Sistem akan membaca dan mengisi form secara otomatis."}
            </p>
          </div>
        </div>

        <label htmlFor="wa-text" className="sr-only">
          {marketplace ? `Template ${label}` : "Pesan WhatsApp"}
        </label>
        <Textarea
          id="wa-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={
            marketplace
              ? "Marketplace: Shopee\nTanggal pengiriman: …\nNama Penerima: …\nNomor Invoice: …"
              : "Tempel pesan pesanan dari WhatsApp di sini…"
          }
          className="mt-5 max-h-[40dvh] min-h-[200px] resize-y rounded-xl bg-white p-4 text-[15px] sm:min-h-[340px]"
        />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={fillForm}
            disabled={!text.trim()}
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
          <Link
            href={formHref}
            onClick={() => onOpenChange(false)}
            className="ml-auto text-sm font-medium text-brand-ink underline underline-offset-2"
          >
            {marketplace ? "Isi manual tanpa template" : "Isi manual tanpa pesan WA"}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
