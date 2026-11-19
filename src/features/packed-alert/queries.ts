import "server-only"

import { and, desc, eq, gt, notLike } from "drizzle-orm"

import { getDb } from "@/db"
import { orders, orderStatusLogs, profiles } from "@/db/schema"

import { latestPackedPerOrder, type PackedOrder } from "./packed"

const WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * Pesanan yang selesai packing (Siap Packing → Siap Kirim) dalam 24 jam terakhir dan masih Siap
 * Kirim, terbaru dulu. Yang di-packing `excludeChangedBy` sendiri tidak ikut. `includeTest`:
 * pesanan uji e2e (customer "QA Customer …").
 */
export async function listRecentPacked(
  excludeChangedBy: string,
  includeTest = false,
): Promise<PackedOrder[]> {
  const rows = await getDb()
    .select({
      orderId: orders.id,
      orderNo: orders.orderNo,
      customerName: orders.customerName,
      deliveryDate: orders.deliveryDate,
      type: orders.type,
      marketplaceOrderNo: orders.marketplaceOrderNo,
      changedBy: orderStatusLogs.changedBy,
      byName: profiles.name,
      packedAt: orderStatusLogs.changedAt,
    })
    .from(orderStatusLogs)
    .innerJoin(orders, eq(orders.id, orderStatusLogs.orderId))
    .leftJoin(profiles, eq(profiles.id, orderStatusLogs.changedBy))
    .where(
      and(
        eq(orderStatusLogs.fromStatus, "siap_packing"),
        eq(orderStatusLogs.toStatus, "siap_kirim"),
        gt(orderStatusLogs.changedAt, new Date(Date.now() - WINDOW_MS)),
        // Sudah dikirim, dibatalkan, atau packing dibatalkan: tidak perlu diberi tahu lagi.
        eq(orders.status, "siap_kirim"),
        includeTest ? undefined : notLike(orders.customerName, "QA Customer %"),
      ),
    )
    .orderBy(desc(orderStatusLogs.changedAt))
    .limit(40)
  return latestPackedPerOrder(
    rows.map((row) => ({ ...row, packedAt: row.packedAt.toISOString() })),
    excludeChangedBy,
  ).slice(0, 20)
}
