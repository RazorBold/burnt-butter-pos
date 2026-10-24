import type { ShippingMethod } from "@/lib/wa-parser"

export const SHIPPING_METHODS = ["pick_up", "instant", "kurir_internal"] as const

export const SHIPPING_METHOD_LABEL: Record<ShippingMethod, string> = {
  pick_up: "Pick Up",
  instant: "Instant",
  kurir_internal: "Kurir Internal",
}

/** Keterangan metode, mengikuti teks di template WA toko. */
export const SHIPPING_METHOD_NOTE: Record<ShippingMethod, string> = {
  pick_up: "Customer mengambil sendiri di toko.",
  instant: "Diantar ojek online (GoSend, GrabExpress).",
  kurir_internal: "Kurir Burnt Butter, jam 09.00–17.00 mengikuti rute kurir.",
}

/** Kunci sessionStorage untuk membawa pesan WA dari modal Input Pesanan ke halaman form. */
export const WA_DRAFT_KEY = "input-pesanan:wa"

/** Event window yang dikirim modal saat halaman Input Pesanan sudah terbuka. */
export const WA_DRAFT_EVENT = "input-pesanan:wa"
