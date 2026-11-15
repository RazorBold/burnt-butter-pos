import "server-only"

import { and, desc, eq, gt, isNotNull, ne, notLike, or, isNull } from "drizzle-orm"

import { getDb } from "@/db"
import { orders, paymentMethods, payments, profiles } from "@/db/schema"

export type PaidOrder = {
  id: string
  orderNo: string
  customerName: string
  deliveryDate: string
  total: number
  methodName: string
  byName: string | null
  /** ISO, supaya aman dikirim lewat Server Action dan dibandingkan di klien. */
  paidAt: string
}

const WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * Pesanan yang ditandai Lunas dalam 24 jam terakhir (belum dibatalkan), terbaru dulu.
 * Pembayaran yang dicatat `excludeRecordedBy` sendiri tidak ikut (staf yang menandai lunas
 * tidak perlu diberi tahu). `includeTest`: pesanan uji e2e (customer "QA Customer …").
 */
export async function listRecentPaid(
  excludeRecordedBy: string,
  includeTest = false,
): Promise<PaidOrder[]> {
  const rows = await getDb()
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      customerName: orders.customerName,
      deliveryDate: orders.deliveryDate,
      total: orders.total,
      methodName: paymentMethods.name,
      byName: profiles.name,
      paidAt: payments.paidAt,
    })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(paymentMethods, eq(paymentMethods.id, payments.paymentMethodId))
    .leftJoin(profiles, eq(profiles.id, payments.recordedBy))
    .where(
      and(
        eq(payments.status, "lunas"),
        isNotNull(payments.paidAt),
        gt(payments.paidAt, new Date(Date.now() - WINDOW_MS)),
        ne(orders.status, "dibatalkan"),
        or(isNull(payments.recordedBy), ne(payments.recordedBy, excludeRecordedBy)),
        includeTest ? undefined : notLike(orders.customerName, "QA Customer %"),
      ),
    )
    .orderBy(desc(payments.paidAt))
    .limit(20)
  return rows.map((row) => ({ ...row, paidAt: row.paidAt!.toISOString() }))
}
