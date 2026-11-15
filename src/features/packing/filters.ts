// Filter papan Packaging dari URL (?tipe=normal|hampers&sumber=whatsapp|olshop|shopee|tokopedia
// &jenis=po|ready_stock|made_to_order&q=...). Permintaan pemilik toko (Nov 2026). Murni supaya
// bisa diuji.

import { ORDER_KINDS, type OrderChannel } from "@/features/orders/constants"
import type { OrderKind, OrderType } from "@/lib/wa-parser"

export const PACKING_TYPES = ["normal", "hampers"] as const
export type PackingTypeFilter = (typeof PACKING_TYPES)[number]

/** "olshop" = Shopee + Tokopedia. */
export const PACKING_SOURCES = ["whatsapp", "olshop", "shopee", "tokopedia"] as const
export type PackingSourceFilter = (typeof PACKING_SOURCES)[number]

export const PACKING_TYPE_LABEL: Record<PackingTypeFilter, string> = {
  normal: "Normal",
  hampers: "Hampers",
}

export const PACKING_SOURCE_LABEL: Record<PackingSourceFilter, string> = {
  whatsapp: "WhatsApp",
  olshop: "Olshop",
  shopee: "Shopee",
  tokopedia: "Tokopedia",
}

/** Label pendek untuk tombol filter Jenis (PO / RS / MTO, seperti template WA). */
export const PACKING_KIND_LABEL: Record<OrderKind, string> = {
  po: "PO",
  ready_stock: "RS",
  made_to_order: "MTO",
}

export type PackingFilters = {
  type?: PackingTypeFilter
  source?: PackingSourceFilter
  kind?: OrderKind
  q?: string
}

type Params = Record<string, string | string[] | undefined>

export function parsePackingFilters(params: Params): PackingFilters {
  const one = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }
  return {
    type: PACKING_TYPES.find((value) => value === one("tipe")),
    source: PACKING_SOURCES.find((value) => value === one("sumber")),
    kind: ORDER_KINDS.find((value) => value === one("jenis")),
    q: one("q")?.trim() || undefined,
  }
}

/** Pesanan Normal & Hampers masuk ke filter Normal maupun Hampers. */
export function matchesType(type: OrderType, filter: PackingTypeFilter | undefined): boolean {
  if (!filter) return true
  return type === "normal_hampers" || type === filter
}

export function matchesSource(
  channel: OrderChannel,
  filter: PackingSourceFilter | undefined,
): boolean {
  if (!filter) return true
  if (filter === "olshop") return channel === "shopee" || channel === "tokopedia"
  return channel === filter
}

/** Data yang bisa dicari di papan Packaging. */
export type PackingSearchable = {
  orderNo: string
  customerName: string
  senderName: string | null
  phone: string | null
  cardTo: string | null
  cardFrom: string | null
}

/**
 * Cari no. pesanan, nama penerima, pengirim, nama di kartu ucapan, atau no. telp. No. telp
 * dicocokkan per digit (minimal 3), jadi "0812-345" dan "62812345" tetap ketemu.
 */
export function matchesQuery(order: PackingSearchable, query: string | undefined): boolean {
  const wanted = query?.trim().toLowerCase()
  if (!wanted) return true
  const texts = [order.orderNo, order.customerName, order.senderName, order.cardTo, order.cardFrom]
  if (texts.some((text) => text?.toLowerCase().includes(wanted))) return true
  const digits = wanted.replace(/\D/g, "")
  if (digits.length < 3 || !order.phone) return false
  const phone = order.phone.replace(/\D/g, "")
  // 08xx dan 628xx dianggap sama.
  const local = (value: string) => value.replace(/^62/, "0")
  return phone.includes(digits) || local(phone).includes(local(digits))
}

export function filterPackingOrders<
  T extends PackingSearchable & { type: OrderType; channel: OrderChannel; kind: OrderKind },
>(orders: T[], filters: PackingFilters): T[] {
  return orders.filter(
    (order) =>
      matchesType(order.type, filters.type) &&
      matchesSource(order.channel, filters.source) &&
      (!filters.kind || order.kind === filters.kind) &&
      matchesQuery(order, filters.q),
  )
}
