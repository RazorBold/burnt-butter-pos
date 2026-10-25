// Alur Pengiriman (PRD F-40..F-46): tab, label status, dan aksi berikutnya per metode.
// Murni supaya bisa diuji dan dipakai di klien maupun server.

import type { OrderStatus } from "@/features/orders/filters"
import type { ShipmentStatus } from "@/features/orders/status"
import type { ShippingMethod } from "@/lib/wa-parser"

/** Status pengiriman ditambah "belum_siap" untuk pesanan yang belum selesai dimasak. */
export type ShipmentState = ShipmentStatus | "belum_siap"

export const SHIPMENT_STATE_LABEL: Record<ShipmentState, string> = {
  belum_siap: "Belum siap",
  menunggu_kurir: "Menunggu Kurir",
  siap_dikirim: "Siap Dikirim",
  siap_diambil: "Siap Diambil",
  dalam_perjalanan: "Dalam Perjalanan",
  dikirim: "Dikirim",
  selesai: "Selesai",
}

export const SHIPMENT_STATES = Object.keys(SHIPMENT_STATE_LABEL) as ShipmentState[]

export const SLOTS = ["09-12", "13-17"] as const
export type DeliverySlot = (typeof SLOTS)[number]
export const SLOT_LABEL: Record<DeliverySlot, string> = {
  "09-12": "09:00 - 12:00",
  "13-17": "13:00 - 17:00",
}

export const TABS = ["semua", "perlu", "jalan", "selesai"] as const
export type ShipmentTab = (typeof TABS)[number]
export const TAB_LABEL: Record<ShipmentTab, string> = {
  semua: "Semua",
  perlu: "Perlu Dikirim",
  jalan: "Dalam Perjalanan",
  selesai: "Selesai",
}

export function stateOf(status: ShipmentStatus | null): ShipmentState {
  return status ?? "belum_siap"
}

/** Perlu Dikirim = belum berangkat (termasuk belum siap); Dalam Perjalanan; Selesai. */
export function tabOf(state: ShipmentState): Exclude<ShipmentTab, "semua"> {
  if (state === "dalam_perjalanan" || state === "dikirim") return "jalan"
  if (state === "selesai") return "selesai"
  return "perlu"
}

export type ShipmentAction =
  | { kind: "advance"; target: OrderStatus; label: string }
  | { kind: "blocked"; label: string; reason: string }
  | null

/**
 * Tombol utama panel Detail Pengiriman. Mengubah status pesanan (status kirim ikut lewat
 * shipmentStatusFor): Siap Kirim → Dikirim → Selesai, atau Pick Up: Siap Kirim → Selesai.
 */
export function nextShipmentAction({
  method,
  orderStatus,
  hasCourier,
}: {
  method: ShippingMethod
  orderStatus: OrderStatus
  hasCourier: boolean
}): ShipmentAction {
  switch (orderStatus) {
    case "baru":
    case "diproses":
      return {
        kind: "blocked",
        label: "Tandai Dikirim",
        reason: "Pesanan belum selesai dimasak (lihat menu Produksi).",
      }
    case "siap_kirim":
      if (method === "pick_up")
        return { kind: "advance", target: "selesai", label: "Sudah Diambil" }
      if (method === "kurir_internal" && !hasCourier) {
        return {
          kind: "blocked",
          label: "Tandai Dikirim",
          reason: "Pilih kurir dulu lewat Ubah Kurir / Jadwal.",
        }
      }
      return { kind: "advance", target: "dikirim", label: "Tandai Dikirim" }
    case "dikirim":
      return { kind: "advance", target: "selesai", label: "Tandai Selesai" }
    default:
      return null
  }
}

export type ShipmentFilters = {
  date: string
  tab: ShipmentTab
  method?: ShippingMethod
  courierId?: string
  state?: ShipmentState
  page: number
}

type Params = Record<string, string | string[] | undefined>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const METHODS = ["kurir_internal", "instant", "pick_up"] as const

/** Filter dari URL (?tanggal=&tab=&metode=&kurir=&status=&hal=). Tanpa tanggal = hari ini. */
export function parseShipmentFilters(params: Params, today: string): ShipmentFilters {
  const one = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }
  const date = one("tanggal")
  const page = Number(one("hal"))
  const courier = one("kurir")
  return {
    date: date && ISO_DATE.test(date) && !Number.isNaN(Date.parse(date)) ? date : today,
    tab: TABS.find((tab) => tab === one("tab")) ?? "semua",
    method: METHODS.find((method) => method === one("metode")),
    courierId: courier && UUID.test(courier) ? courier : undefined,
    state: SHIPMENT_STATES.find((state) => state === one("status")),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}
