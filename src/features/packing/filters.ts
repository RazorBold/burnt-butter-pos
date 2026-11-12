// Filter papan Packaging dari URL (?tipe=normal|hampers&sumber=whatsapp|olshop|shopee|tokopedia).
// Permintaan pemilik toko (Nov 2026). Murni supaya bisa diuji.

import type { OrderChannel } from "@/features/orders/constants"
import type { OrderType } from "@/lib/wa-parser"

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

export type PackingFilters = { type?: PackingTypeFilter; source?: PackingSourceFilter }

type Params = Record<string, string | string[] | undefined>

export function parsePackingFilters(params: Params): PackingFilters {
  const one = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }
  return {
    type: PACKING_TYPES.find((value) => value === one("tipe")),
    source: PACKING_SOURCES.find((value) => value === one("sumber")),
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

export function filterPackingOrders<T extends { type: OrderType; channel: OrderChannel }>(
  orders: T[],
  filters: PackingFilters,
): T[] {
  return orders.filter(
    (order) =>
      matchesType(order.type, filters.type) && matchesSource(order.channel, filters.source),
  )
}
