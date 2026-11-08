import "server-only"

import { and, desc, eq, isNotNull, notInArray, notLike } from "drizzle-orm"

import { getDb } from "@/db"
import { orders, profiles } from "@/db/schema"

export type UrgentOrder = {
  id: string
  orderNo: string
  customerName: string
  deliveryDate: string
  note: string | null
  byName: string | null
  /** ISO, supaya aman dikirim lewat Server Action dan dibandingkan di klien. */
  urgentAt: string
}

/**
 * Pesanan urgent yang masih berjalan (belum Selesai/Dibatalkan), terbaru dulu.
 * `includeTest`: pesanan uji e2e (customer "QA Customer …") hanya untuk akun QA, supaya staf
 * asli tidak mendapat popup + suara saat test berjalan (database uji = produksi).
 */
export async function listActiveUrgent(includeTest = false): Promise<UrgentOrder[]> {
  const rows = await getDb()
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      customerName: orders.customerName,
      deliveryDate: orders.deliveryDate,
      note: orders.urgentNote,
      byName: profiles.name,
      urgentAt: orders.urgentAt,
    })
    .from(orders)
    .leftJoin(profiles, eq(profiles.id, orders.urgentBy))
    .where(
      and(
        isNotNull(orders.urgentAt),
        notInArray(orders.status, ["selesai", "dibatalkan"]),
        includeTest ? undefined : notLike(orders.customerName, "QA Customer %"),
      ),
    )
    .orderBy(desc(orders.urgentAt))
    .limit(20)
  return rows.map((row) => ({ ...row, urgentAt: row.urgentAt!.toISOString() }))
}
