import type { OrderKind, ShippingMethod } from "@/lib/wa-parser"

export const ORDER_KINDS = [
  "po",
  "ready_stock",
  "made_to_order",
] as const satisfies readonly OrderKind[]

export const ORDER_KIND_LABEL: Record<OrderKind, string> = {
  po: "PO",
  ready_stock: "Ready Stock",
  made_to_order: "Made to Order",
}

export const ORDER_KIND_OPTIONS = ORDER_KINDS.map((value) => ({
  value,
  label: ORDER_KIND_LABEL[value],
}))

/** Keterangan singkat di form dan tooltip. */
export const ORDER_KIND_NOTE: Record<OrderKind, string> = {
  po: "Pre-Order: dipesan jauh hari, dibuat sesuai tanggal kirim.",
  ready_stock: "Ambil dari stok yang sudah jadi.",
  made_to_order: "Dibuat khusus setelah pesanan masuk.",
}

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
