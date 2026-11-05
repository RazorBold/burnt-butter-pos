import { Check, Clock, MessageCircle, ShoppingBag, StickyNote, Tag, X } from "lucide-react"

import { ORDER_CHANNEL_LABEL, type OrderChannel } from "@/features/orders/constants"
import { ORDER_STATUS_LABEL, ORDER_TYPE_LABEL, type OrderStatus } from "@/features/orders/filters"
import { cn } from "@/lib/utils"
import type { OrderType } from "@/lib/wa-parser"

const BADGE =
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium whitespace-nowrap"

/** Badge tipe pesanan: Personal (krem) / Hadiah (merah muda), sesuai 03-pesanan.png. */
export function TypeBadge({ type, className }: { type: OrderType; className?: string }) {
  return (
    <span
      className={cn(
        BADGE,
        type === "hadiah" ? "bg-hadiah text-hadiah-fg" : "bg-personal text-personal-fg",
        className,
      )}
    >
      {ORDER_TYPE_LABEL[type]}
    </span>
  )
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  baru: "bg-status-baru text-status-baru-fg",
  diproses: "bg-status-diproses text-status-diproses-fg",
  siap_kirim: "bg-status-siap text-status-siap-fg",
  dikirim: "bg-status-dikirim text-status-dikirim-fg",
  selesai: "bg-status-selesai text-status-selesai-fg",
  dibatalkan: "bg-trend-down text-trend-down-fg",
}

/** Badge status pesanan: ikon + teks, supaya Siap Kirim dan Selesai tidak dibedakan warna saja. */
export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus
  className?: string
}) {
  return (
    <span className={cn(BADGE, STATUS_STYLE[status], className)}>
      <StatusIcon status={status} />
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}

function StatusIcon({ status }: { status: OrderStatus }) {
  const icon = "size-3.5 shrink-0"
  switch (status) {
    case "baru":
      return <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
    case "diproses":
      return <Tag aria-hidden className={icon} />
    case "dibatalkan":
      return <X aria-hidden className={icon} strokeWidth={2.5} />
    default:
      return <Check aria-hidden className={icon} strokeWidth={2.5} />
  }
}

/** Badge status bayar: Belum bayar (kuning, jam) / Lunas (hijau, centang). */
export function PaymentBadge({ paid, className }: { paid: boolean; className?: string }) {
  return (
    <span
      className={cn(
        BADGE,
        paid
          ? "bg-status-selesai text-status-selesai-fg"
          : "bg-status-diproses text-status-diproses-fg",
        className,
      )}
    >
      {paid ? (
        <Check aria-hidden className="size-3.5 shrink-0" strokeWidth={2.5} />
      ) : (
        <Clock aria-hidden className="size-3.5 shrink-0" />
      )}
      {paid ? "Lunas" : "Belum bayar"}
    </span>
  )
}

const CHANNEL_STYLE: Record<OrderChannel, string> = {
  whatsapp: "bg-status-dikirim text-status-dikirim-fg",
  shopee: "bg-status-diproses text-status-diproses-fg",
  tokopedia: "bg-status-siap text-status-siap-fg",
}

/** Asal pesanan: WhatsApp, Shopee, atau Tokopedia. Teks selalu tampil, warna hanya pembantu. */
export function ChannelBadge({
  channel,
  className,
}: {
  channel: OrderChannel
  className?: string
}) {
  const Icon = channel === "whatsapp" ? MessageCircle : ShoppingBag
  return (
    <span className={cn(BADGE, CHANNEL_STYLE[channel], className)}>
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {ORDER_CHANNEL_LABEL[channel]}
    </span>
  )
}

/** Catatan pesanan satu baris di bawah nama customer. Teks lengkap di tooltip dan panel detail. */
export function OrderNoteLine({ note, className }: { note: string | null; className?: string }) {
  if (!note) return null
  return (
    <span
      className={cn(
        "mt-0.5 flex max-w-[280px] items-center gap-1 text-[13px] text-status-diproses-fg",
        className,
      )}
    >
      <StickyNote aria-hidden className="size-3.5 shrink-0" />
      <span className="sr-only">Catatan: </span>
      <span className="truncate" title={note}>
        {note}
      </span>
    </span>
  )
}
