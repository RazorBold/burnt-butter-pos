import {
  CalendarClock,
  Check,
  ChefHat,
  Clock,
  MessageCircle,
  Package,
  PackageCheck,
  ShoppingBag,
  Siren,
  StickyNote,
  Tag,
  X,
} from "lucide-react"

import {
  ORDER_CHANNEL_LABEL,
  ORDER_KIND_LABEL,
  ORDER_KIND_NOTE,
  type OrderChannel,
} from "@/features/orders/constants"
import { ORDER_STATUS_LABEL, ORDER_TYPE_LABEL, type OrderStatus } from "@/features/orders/filters"
import { cn } from "@/lib/utils"
import type { OrderKind, OrderType } from "@/lib/wa-parser"

const BADGE =
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium whitespace-nowrap"

/** Badge tipe pesanan: Personal (krem) / Hadiah (merah muda), sesuai 03-pesanan.png. */
export function TypeBadge({ type, className }: { type: OrderType; className?: string }) {
  const colorClass =
    type === "hampers"
      ? "bg-hadiah text-hadiah-fg"
      : type === "normal_hampers"
        ? "bg-amber-100 text-amber-900 border border-amber-300"
        : "bg-personal text-personal-fg"

  return <span className={cn(BADGE, colorClass, className)}>{ORDER_TYPE_LABEL[type]}</span>
}

const KIND_ICON = { po: CalendarClock, ready_stock: PackageCheck, made_to_order: ChefHat } as const

/**
 * Badge jenis pesanan (PO / Ready Stock / Made to Order): garis tepi + ikon, tanpa isi warna,
 * supaya tidak tertukar dengan badge status yang berwarna.
 */
export function KindBadge({ kind, className }: { kind: OrderKind; className?: string }) {
  const Icon = KIND_ICON[kind]
  return (
    <span
      title={ORDER_KIND_NOTE[kind]}
      className={cn(BADGE, "border border-border bg-white text-text-strong", className)}
    >
      <Icon className="size-3.5 text-brand-ink" aria-hidden />
      {ORDER_KIND_LABEL[kind]}
    </span>
  )
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  baru: "bg-status-baru text-status-baru-fg",
  diproses: "bg-status-diproses text-status-diproses-fg",
  siap_packing: "bg-status-packing text-status-packing-fg",
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
    case "siap_packing":
      return <Package aria-hidden className={icon} />
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

/** Label pesanan URGENT (dadakan): ikon sirene + teks, merah. */
export function UrgentBadge({ className, note }: { className?: string; note?: string | null }) {
  return (
    <span
      title={note ?? undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-trend-down px-2 py-0.5 text-[12px] font-bold tracking-wide whitespace-nowrap text-trend-down-fg uppercase",
        className,
      )}
    >
      <Siren className="size-3.5 shrink-0" aria-hidden />
      Urgent
    </span>
  )
}
