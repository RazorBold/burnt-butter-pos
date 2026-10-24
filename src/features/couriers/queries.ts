import "server-only"

import { asc } from "drizzle-orm"

import { getDb } from "@/db"
import { couriers } from "@/db/schema"

export type CourierRow = typeof couriers.$inferSelect

/** Urutan: kurir internal dulu, lalu eksternal; di dalamnya sesuai urutan dibuat. */
export async function listCouriers(): Promise<CourierRow[]> {
  return getDb()
    .select()
    .from(couriers)
    .orderBy(asc(couriers.type), asc(couriers.createdAt), asc(couriers.name))
}
