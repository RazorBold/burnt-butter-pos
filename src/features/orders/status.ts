// Alur status pesanan (PRD "Alur pengguna") dan status pengiriman yang mengikutinya.
// Murni supaya bisa diuji dan dipakai di klien (pilihan dropdown) maupun server (validasi).

import type { ShippingMethod } from "@/lib/wa-parser"

import type { OrderStatus } from "./filters"

export type ShipmentStatus =
  "menunggu_kurir" | "siap_dikirim" | "siap_diambil" | "dalam_perjalanan" | "dikirim" | "selesai"

/** Urutan maju. Pick Up tidak melewati Dikirim: dari Siap Kirim langsung Selesai. */
function forwardFlow(method: ShippingMethod): OrderStatus[] {
  return method === "pick_up"
    ? ["baru", "diproses", "siap_kirim", "selesai"]
    : ["baru", "diproses", "siap_kirim", "dikirim", "selesai"]
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
      return method === "kurir_internal"
        ? "siap_dikirim"
        : method === "instant"
          ? "menunggu_kurir"
          : "siap_diambil"
    case "dikirim":
      return method === "kurir_internal" ? "dalam_perjalanan" : "dikirim"
    case "selesai":
      return "selesai"
    default:
      return null
  }
}

/** Status yang masih boleh diubah datanya (customer, alamat, tanggal, metode). */
export function isEditable(status: OrderStatus): boolean {
  return status === "baru" || status === "diproses" || status === "siap_kirim"
}
