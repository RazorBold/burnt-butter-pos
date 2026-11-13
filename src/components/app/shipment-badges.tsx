import { Bike, Check, Clock, MapPinned, PackageCheck, Store, Tag, Truck } from "lucide-react"

import { SHIPPING_METHOD_LABEL } from "@/features/orders/constants"
import { SHIPMENT_STATE_LABEL, type ShipmentState } from "@/features/shipments/logic"
import { cn } from "@/lib/utils"
import type { ShippingMethod } from "@/lib/wa-parser"

const STYLE: Record<ShipmentState, string> = {
  belum_siap: "bg-status-dikirim text-status-dikirim-fg",
  menunggu_kurir: "bg-status-baru text-status-baru-fg",
  dalam_perjalanan: "bg-status-baru text-status-baru-fg",
  dikirim: "bg-status-baru text-status-baru-fg",
  siap_dikirim: "bg-status-diproses text-status-diproses-fg",
  siap_diambil: "bg-status-siap text-status-siap-fg",
  selesai: "bg-status-selesai text-status-selesai-fg",
}

/** Badge status pengiriman (04-pengiriman.png): biru = menunggu/jalan, kuning = siap dikirim,
 * hijau = siap diambil/selesai, abu = belum selesai dimasak. Ikon + teks. */
export function ShipmentStatusBadge({
  state,
  className,
}: {
  state: ShipmentState
  className?: string
}) {
  const icon = "size-3.5 shrink-0"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium whitespace-nowrap",
        STYLE[state],
        className,
      )}
    >
      {state === "belum_siap" ? (
        <Clock aria-hidden className={icon} />
      ) : state === "siap_dikirim" ? (
        <Tag aria-hidden className={icon} />
      ) : state === "siap_diambil" || state === "selesai" ? (
        <Check aria-hidden className={icon} strokeWidth={2.5} />
      ) : (
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      )}
      {SHIPMENT_STATE_LABEL[state]}
    </span>
  )
}

export const METHOD_ICON = {
  kurir_internal: Truck,
  instant: Bike,
  pick_up: Store,
  ekspedisi: PackageCheck,
} as const

/** Ikon + nama metode kirim, seperti kolom Metode di desain. */
export function ShippingMethodLabel({
  method,
  name,
}: {
  method: ShippingMethod
  /** Nama kategori pengiriman dari Master Data; tanpa nama pakai label alurnya. */
  name?: string | null
}) {
  const Icon = METHOD_ICON[method]
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Icon className="size-[18px] shrink-0 text-[#c0392b]" aria-hidden />
      {name || SHIPPING_METHOD_LABEL[method]}
    </span>
  )
}

/** Link lacak perjalanan makanan, dibuka di tab baru. */
export function TrackingLink({ url, orderNo }: { url: string; orderNo: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Lacak pengiriman ${orderNo} (tab baru)`}
      className="inline-flex items-center gap-1.5 rounded-sm font-medium whitespace-nowrap text-brand-ink underline underline-offset-2 outline-none hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <MapPinned className="size-4 shrink-0" aria-hidden />
      Lacak
    </a>
  )
}
