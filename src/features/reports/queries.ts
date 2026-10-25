import "server-only"

import { and, desc, eq, gte, lt, ne, sql } from "drizzle-orm"

import { getDb } from "@/db"
import {
  menus,
  menuVariants,
  orderItems,
  orders,
  paymentMethods,
  payments,
  shipments,
} from "@/db/schema"
import { addDays, previousRange } from "@/features/orders/filters"

import type { ReportOrder, ReportPayment } from "./summary"

const startOfDay = (day: string) => new Date(`${day}T00:00:00+07:00`)
const jakartaDay = (column: Parameters<typeof sql>[1]) =>
  sql<string>`to_char(${column} at time zone 'Asia/Jakarta', 'YYYY-MM-DD')`

/** Pesanan periode ini + periode pembanding (termasuk dibatalkan, untuk dihitung terpisah). */
export async function getReportOrders(from: string, to: string): Promise<ReportOrder[]> {
  const start = previousRange(from, to).from
  const portions = sql<number>`coalesce((select sum(${orderItems.qty}) from ${orderItems} where ${orderItems.orderId} = ${orders.id}), 0)`
  return getDb()
    .select({
      day: jakartaDay(orders.createdAt),
      type: orders.type,
      status: orders.status,
      method: shipments.method,
      total: orders.total,
      customerId: orders.customerId,
      portions: portions.mapWith(Number),
    })
    .from(orders)
    .innerJoin(shipments, eq(shipments.orderId, orders.id))
    .where(
      and(
        gte(orders.createdAt, startOfDay(start)),
        lt(orders.createdAt, startOfDay(addDays(to, 1))),
      ),
    )
}

/** Pembayaran lunas berdasarkan tanggal dibayar, periode ini + pembanding. */
export async function getReportPayments(from: string, to: string): Promise<ReportPayment[]> {
  const start = previousRange(from, to).from
  return getDb()
    .select({
      day: jakartaDay(payments.paidAt),
      amount: payments.amount,
      methodType: paymentMethods.type,
    })
    .from(payments)
    .innerJoin(paymentMethods, eq(paymentMethods.id, payments.paymentMethodId))
    .where(
      and(
        eq(payments.status, "lunas"),
        gte(payments.paidAt, startOfDay(start)),
        lt(payments.paidAt, startOfDay(addDays(to, 1))),
      ),
    )
}

export type TopProduct = {
  menuName: string
  size: "large" | "regular" | "single"
  photoPath: string | null
  qty: number
}

/** Menu + ukuran paling banyak terjual pada rentang ini (pesanan tidak dibatalkan). */
export async function getTopProducts(from: string, to: string, limit = 5): Promise<TopProduct[]> {
  const qty = sql<number>`sum(${orderItems.qty})`.mapWith(Number)
  return getDb()
    .select({
      menuName: menus.name,
      size: menuVariants.size,
      photoPath: menus.photoPath,
      qty,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(menuVariants, eq(menuVariants.id, orderItems.menuVariantId))
    .innerJoin(menus, eq(menus.id, menuVariants.menuId))
    .where(
      and(
        ne(orders.status, "dibatalkan"),
        gte(orders.createdAt, startOfDay(from)),
        lt(orders.createdAt, startOfDay(addDays(to, 1))),
      ),
    )
    .groupBy(menus.id, menus.name, menus.photoPath, menuVariants.size)
    .orderBy(desc(qty), menus.name)
    .limit(limit)
}
