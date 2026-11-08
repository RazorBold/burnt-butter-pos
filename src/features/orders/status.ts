// Alur status pesanan (PRD "Alur pengguna") dan status pengiriman yang mengikutinya.
// Murni supaya bisa diuji dan dipakai di klien (pilihan dropdown) maupun server (validasi).

import type { ShippingMethod } from "@/lib/wa-parser"

import { ORDER_STATUS_LABEL, type OrderStatus } from "./filters"

export type ShipmentStatus =
  "menunggu_kurir" | "siap_dikirim" | "siap_diambil" | "dalam_perjalanan" | "dikirim" | "selesai"

/**
 * Urutan maju. Selesai masak = Siap Packing; selesai packing (menu Packaging) = Siap Kirim.
 * Pick Up dan Ekspedisi (olshop) tidak melewati Dikirim: dari Siap Kirim langsung Selesai.
 * Olshop cukup "belum dikirim" dan "sudah dikirim"; setelah paket diserahkan ke ekspedisi
 * marketplace, tugas toko selesai (tanpa kurir, resi, atau link lacak).
 */
function forwardFlow(method: ShippingMethod): OrderStatus[] {
  return method === "pick_up" || method === "ekspedisi"
    ? ["baru", "diproses", "siap_packing", "siap_kirim", "selesai"]
    : ["baru", "diproses", "siap_packing", "siap_kirim", "dikirim", "selesai"]
}

/** Status yang sudah di-packing: stok packaging pesanan ini sudah terpotong. */
export const PACKED_STATUSES: readonly OrderStatus[] = ["siap_kirim", "dikirim", "selesai"]

/** Status sebelum packing. Pindah ke sini dari status ter-packing = stok packaging dikembalikan. */
export const UNPACKED_STATUSES: readonly OrderStatus[] = [
  "baru",
  "diproses",
  "siap_packing",
  "dibatalkan",
]

/** Baru → Diproses: mulai dimasak. Hanya untuk pesanan yang sudah Lunas. */
export function isCookingStart(from: OrderStatus, to: OrderStatus): boolean {
  return from === "baru" && to === "diproses"
}

/** Menu pesanan boleh diubah selama belum selesai dimasak (Baru, Diproses). */
export function isMenuEditable(status: OrderStatus): boolean {
  return status === "baru" || status === "diproses"
}

/** Siap Packing → Siap Kirim: langkah packing, yang memotong stok packaging. */
export function isPackingStep(from: OrderStatus, to: OrderStatus): boolean {
  return from === "siap_packing" && to === "siap_kirim"
}

/** Status pesanan setelah "Tandai Dikirim": Ekspedisi langsung Selesai, lainnya Dikirim. */
export function sentStatusFor(method: ShippingMethod): OrderStatus {
  return method === "ekspedisi" ? "selesai" : "dikirim"
}

/**
 * Status yang boleh dipilih dari status sekarang: satu langkah maju, satu langkah mundur
 * (membetulkan salah klik), dan Dibatalkan selama belum dikirim. Pesanan Selesai sudah final;
 * pesanan Dibatalkan hanya bisa dibuka lagi sebagai Baru.
 */
export function nextStatuses(status: OrderStatus, method: ShippingMethod): OrderStatus[] {
  if (status === "selesai") return []
  if (status === "dibatalkan") return ["baru"]
  const flow = forwardFlow(method)
  const index = flow.indexOf(status)
  const options: OrderStatus[] = []
  // Ekspedisi yang sudah Dikirim sebelum alurnya diringkas tetap bisa diselesaikan.
  if (index === -1 && status === "dikirim" && method === "ekspedisi") return ["selesai"]
  if (index === -1) return ["baru"] // mis. Dikirim lalu metode diubah ke Pick Up
  if (index + 1 < flow.length) options.push(flow[index + 1])
  if (index > 0) options.push(flow[index - 1])
  if (["baru", "diproses", "siap_packing", "siap_kirim"].includes(status)) {
    options.push("dibatalkan")
  }
  return options
}

/**
 * Pilihan di dropdown Ubah Status (Pesanan): seperti nextStatuses, tanpa langkah packing.
 * Packing dilakukan di menu Packaging supaya pemakaian packaging-nya tercatat.
 */
export function manualStatuses(status: OrderStatus, method: ShippingMethod): OrderStatus[] {
  return nextStatuses(status, method).filter((target) => !isPackingStep(status, target))
}

/**
 * Status pengiriman untuk status pesanan tertentu. Kosong sebelum Siap Kirim (belum masuk
 * Pengiriman) dan saat dibatalkan.
 */
export function shipmentStatusFor(
  status: OrderStatus,
  method: ShippingMethod,
): ShipmentStatus | null {
  switch (status) {
    case "siap_kirim":
      if (method === "instant") return "menunggu_kurir"
      return method === "pick_up" ? "siap_diambil" : "siap_dikirim"
    case "dikirim":
      return method === "instant" ? "dikirim" : "dalam_perjalanan"
    case "selesai":
      return "selesai"
    default:
      return null
  }
}

export type StatusRules = {
  /** Status asal dan tujuan harus ada di daftar ini (dipakai Produksi: hanya langkah dapur). */
  limitTo?: readonly OrderStatus[]
  /** Kurir Internal baru boleh Dikirim setelah kurirnya dipilih (dipakai Pengiriman). */
  requireCourier?: boolean
  /** Langkah packing (Siap Packing → Siap Kirim) hanya dari menu Packaging. */
  packing?: boolean
}

/**
 * Alasan singkat sebuah pesanan tidak bisa diubah ke `target`, untuk daftar "dilewati" di aksi
 * massal; `null` bila boleh.
 */
export function statusSkipReason(
  order: {
    status: OrderStatus
    method: ShippingMethod
    hasCourier: boolean
    /** Sudah Lunas. `false` = belum dibayar, belum boleh mulai dimasak. */
    paid?: boolean
  },
  target: OrderStatus,
  rules: StatusRules = {},
): string | null {
  if (target === "dikirim" && order.method === "pick_up") return "Pick Up, tidak dikirim"
  const allowed =
    nextStatuses(order.status, order.method).includes(target) &&
    (!rules.limitTo || (rules.limitTo.includes(order.status) && rules.limitTo.includes(target)))
  if (!allowed) return `status ${ORDER_STATUS_LABEL[order.status]}`
  if (isPackingStep(order.status, target) && !rules.packing) return "belum di-packing"
  // Keputusan pemilik toko (Nov 2026): pesanan baru masuk antrean masak setelah Lunas.
  if (isCookingStart(order.status, target) && order.paid === false) return "belum lunas"
  if (
    rules.requireCourier &&
    target === "dikirim" &&
    order.method === "kurir_internal" &&
    !order.hasCourier
  ) {
    return "belum ada kurir"
  }
  return null
}

/** Status yang masih boleh diubah datanya (customer, alamat, tanggal, metode). */
export function isEditable(status: OrderStatus): boolean {
  return (
    status === "baru" ||
    status === "diproses" ||
    status === "siap_packing" ||
    status === "siap_kirim"
  )
}
