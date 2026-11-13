import "server-only"

import { asc, eq } from "drizzle-orm"

import { getDb } from "@/db"
import { shippingOptions } from "@/db/schema"

import type { ShippingOptionChoice } from "./options"

export type ShippingOptionRow = typeof shippingOptions.$inferSelect

/** Semua kategori (termasuk nonaktif) untuk Master Data. */
export async function listShippingOptions(): Promise<ShippingOptionRow[]> {
  return getDb()
    .select()
    .from(shippingOptions)
    .orderBy(asc(shippingOptions.sortOrder), asc(shippingOptions.createdAt))
}

/** Kategori aktif untuk dipilih di form pesanan dan kartu Pengiriman. */
export async function listActiveShippingOptions(): Promise<ShippingOptionChoice[]> {
  return getDb()
    .select({
      id: shippingOptions.id,
      name: shippingOptions.name,
      flow: shippingOptions.flow,
      liveTracking: shippingOptions.liveTracking,
      note: shippingOptions.note,
    })
    .from(shippingOptions)
    .where(eq(shippingOptions.isActive, true))
    .orderBy(asc(shippingOptions.sortOrder), asc(shippingOptions.createdAt))
}
