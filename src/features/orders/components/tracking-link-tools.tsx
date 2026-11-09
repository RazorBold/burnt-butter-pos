"use client"

import { Check, Copy, LoaderCircle, Send } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { TrackingLink } from "@/components/app/shipment-badges"
import { markTrackingLinkSent } from "@/features/shipments/actions"
import { formatJam } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Link lacak + salin (untuk dikirim ke customer) + tanda "Terkirim". Tanda kembali kosong
 * setiap link diganti. Hanya di menu Pesanan: admin pesanan yang mengirim link ke customer.
 */
export function TrackingLinkTools({
  orderId,
  orderNo,
  url,
  sentAt,
}: {
  orderId: string
  orderNo: string
  url: string
  sentAt: Date | null
}) {
  const [pending, startTransition] = useTransition()
  const sent = sentAt !== null

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(`Link lacak ${orderNo} disalin.`, {
        description: sent ? undefined : "Tempel ke chat customer, lalu tandai Terkirim.",
      })
    } catch {
      toast.error("Link tidak bisa disalin otomatis. Buka link-nya lalu salin dari browser.")
    }
  }

  function toggleSent() {
    startTransition(async () => {
      const result = await markTrackingLinkSent({ orderId, sent: !sent })
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  const iconButton =
    "inline-flex h-8 items-center justify-center gap-1 rounded-md border px-2 text-[13px] font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <TrackingLink url={url} orderNo={orderNo} />
      <button
        suppressHydrationWarning
        type="button"
        onClick={copy}
        aria-label={`Salin link lacak ${orderNo}`}
        title="Salin link untuk dikirim ke customer"
        className={cn(iconButton, "border-border bg-white text-brand-ink hover:bg-nav-active")}
      >
        <Copy className="size-3.5" aria-hidden />
        Salin
      </button>
      <button
        suppressHydrationWarning
        type="button"
        onClick={toggleSent}
        disabled={pending}
        aria-pressed={sent}
        aria-label={
          sent
            ? `Link lacak ${orderNo} sudah dikirim ke customer. Klik untuk membatalkan tanda.`
            : `Tandai link lacak ${orderNo} sudah dikirim ke customer`
        }
        title={sent ? `Dikirim ke customer pukul ${formatJam(sentAt)}` : undefined}
        className={cn(
          iconButton,
          sent
            ? "border-transparent bg-status-selesai text-status-selesai-fg hover:brightness-95"
            : "border-dashed border-border bg-white text-text-body hover:bg-nav-active",
        )}
      >
        {pending ? (
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
        ) : sent ? (
          <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
        ) : (
          <Send className="size-3.5" aria-hidden />
        )}
        {sent ? "Terkirim" : "Tandai terkirim"}
      </button>
    </span>
  )
}
