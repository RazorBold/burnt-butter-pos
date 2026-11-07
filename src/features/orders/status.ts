// Alur status pesanan (PRD "Alur pengguna") dan status pengiriman yang mengikutinya.
// Murni supaya bisa diuji dan dipakai di klien (pilihan dropdown) maupun server (validasi).

import type { ShippingMethod } from "@/lib/wa-parser"

import { ORDER_STATUS_LABEL, type OrderStatus } from "./filters"

export type ShipmentStatus =
  "menunggu_kurir" | "siap_dikirim" | "siap_diambil" | "dalam_perjalanan" | "dikirim" | "selesai"

/**
 * Urutan maju. Pick Up dan Ekspedisi (olshop) tidak melewati Dikirim: dari Siap Kirim langsung
 * Selesai. Olshop cukup "belum dikirim" dan "sudah dikirim"; setelah paket diserahkan ke
 * ekspedisi marketplace, tugas toko selesai (tanpa kurir, resi, atau link lacak).
 */
function forwardFlow(method: ShippingMethod): OrderStatus[] {
  return method === "pick_up" || method === "ekspedisi"
    ? ["baru", "diproses", "siap_kirim", "selesai"]
    : ["baru", "diproses", "siap_kirim", "dikirim", "selesai"]
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
  if (["baru", "diproses", "siap_kirim"].includes(status)) options.push("dibatalkan")
  return options
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
  },
  target: OrderStatus,
  rules: StatusRules = {},
): string | null {
  if (target === "dikirim" && order.method === "pick_up") return "Pick Up, tidak dikirim"
  const allowed =
    nextStatuses(order.status, order.method).includes(target) &&
    (!rules.limitTo || (rules.limitTo.includes(order.status) && rules.limitTo.includes(target)))
  if (!allowed) return `status ${ORDER_STATUS_LABEL[order.status]}`
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
  return status === "baru" || status === "diproses" || status === "siap_kirim"
}
