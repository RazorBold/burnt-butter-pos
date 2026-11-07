import type { ShippingMethod } from "@/lib/wa-parser"

export const SHIPPING_METHODS = ["pick_up", "instant", "kurir_internal", "ekspedisi"] as const

/** Pilihan di form WhatsApp. Ekspedisi hanya untuk pesanan marketplace. */
export const WA_SHIPPING_METHODS = ["pick_up", "instant", "kurir_internal"] as const

export const ORDER_CHANNELS = ["whatsapp", "shopee", "tokopedia"] as const
export type OrderChannel = (typeof ORDER_CHANNELS)[number]

export const ORDER_CHANNEL_LABEL: Record<OrderChannel, string> = {
  whatsapp: "WhatsApp",
  shopee: "Shopee",
  tokopedia: "Tokopedia",
}

export function isMarketplace(channel: OrderChannel): boolean {
  return channel !== "whatsapp"
}

export const SHIPPING_METHOD_LABEL: Record<ShippingMethod, string> = {
  pick_up: "Pick Up",
  instant: "Instant",
  kurir_internal: "Kurir Internal",
  ekspedisi: "Ekspedisi",
}

/** Keterangan metode, mengikuti teks di template WA toko. */
export const SHIPPING_METHOD_NOTE: Record<ShippingMethod, string> = {
  pick_up: "Customer mengambil sendiri di toko.",
  instant: "Diantar ojek online (GoSend, GrabExpress).",
  kurir_internal: "Kurir Burnt Butter, jam 09.00–17.00 mengikuti rute kurir.",
  ekspedisi: "Dikirim lewat ekspedisi marketplace; cukup tandai sudah dikirim.",
}

/**
 * Kunci sessionStorage untuk membawa pesan WA / template Olshop dari modal Input Pesanan ke
 * halaman form. Isinya JSON `{ text, channel }` (StoredDraft).
 */
export const WA_DRAFT_KEY = "input-pesanan:wa"

export type StoredDraft = { text: string; channel: OrderChannel }

/** Event window yang dikirim modal saat halaman Input Pesanan sudah terbuka. */
export const WA_DRAFT_EVENT = "input-pesanan:wa"
