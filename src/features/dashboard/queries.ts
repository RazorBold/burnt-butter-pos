import "server-only"

import { and, eq, gte, lt, lte, ne, sql } from "drizzle-orm"

import { getDb } from "@/db"
import { menus, menuVariants, orderItems, orders, payments, shipments } from "@/db/schema"
import { addDays } from "@/features/orders/filters"

import type { DeliveryDay } from "./delivery-calendar"
import type { EvalOrder, EvalPayment, MenuQty } from "./evaluation"

const startOfDay = (day: string) => new Date(`${day}T00:00:00+07:00`)
const jakartaDay = (column: Parameters<typeof sql>[1]) =>
  sql<string>`to_char(${column} at time zone 'Asia/Jakarta', 'YYYY-MM-DD')`
const between = (column: Parameters<typeof gte>[0], from: string, to: string) =>
  and(gte(column, startOfDay(from)), lt(column, startOfDay(addDays(to, 1))))

/** Pesanan (termasuk dibatalkan) dalam rentang, beserta tanggal pesanan pertama customer-nya. */
export async function getEvaluationOrders(from: string, to: string): Promise<EvalOrder[]> {
  const portions = sql<number>`coalesce((select sum(${orderItems.qty}) from ${orderItems} where ${orderItems.orderId} = ${orders.id}), 0)`
  const firstDay = sql<
    string | null
  >`(select to_char(min(o2.created_at) at time zone 'Asia/Jakarta', 'YYYY-MM-DD') from orders o2 where o2.customer_id = ${orders.customerId} and o2.status <> 'dibatalkan')`
  return getDb()
    .select({
      day: jakartaDay(orders.createdAt),
      type: orders.type,
      status: orders.status,
      method: shipments.method,
      total: orders.total,
      customerId: orders.customerId,
      portions: portions.mapWith(Number),
      firstDay,
    })
    .from(orders)
    .innerJoin(shipments, eq(shipments.orderId, orders.id))
    .where(between(orders.createdAt, from, to))
}

/** Pembayaran lunas per tanggal dibayar (WIB). */
export async function getEvaluationPayments(from: string, to: string): Promise<EvalPayment[]> {
  return getDb()
    .select({ day: jakartaDay(payments.paidAt), amount: payments.amount })
    .from(payments)
    .where(and(eq(payments.status, "lunas"), between(payments.paidAt, from, to)))
}

/** Porsi terjual per menu (semua ukuran) pada rentang ini, pesanan tidak dibatalkan. */
export async function getMenuQty(from: string, to: string): Promise<MenuQty[]> {
  return getDb()
    .select({ menuName: menus.name, qty: sql<number>`sum(${orderItems.qty})`.mapWith(Number) })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(menuVariants, eq(menuVariants.id, orderItems.menuVariantId))
    .innerJoin(menus, eq(menus.id, menuVariants.menuId))
    .where(and(ne(orders.status, "dibatalkan"), between(orders.createdAt, from, to)))
    .groupBy(menus.id, menus.name)
}

/** Rekap per tanggal kirim untuk Kalender Pengiriman (pesanan dibatalkan tidak dihitung). */
export async function getDeliveryCalendar(from: string, to: string): Promise<DeliveryDay[]> {
  const portions = sql<number>`coalesce((select sum(${orderItems.qty}) from ${orderItems} where ${orderItems.orderId} = ${orders.id}), 0)`
  const paid = sql`exists (select 1 from ${payments} where ${payments.orderId} = ${orders.id} and ${payments.status} = 'lunas')`
  const rows = await getDb()
    .select({
      date: orders.deliveryDate,
      orders: sql<number>`count(*)::int`,
      portions: sql<number>`coalesce(sum(${portions}), 0)::int`,
      unpaid: sql<number>`(count(*) filter (where not ${paid}))::int`,
      pending: sql<number>`(count(*) filter (where ${orders.status} not in ('dikirim', 'selesai')))::int`,
    })
    .from(orders)
    .where(
      and(
        ne(orders.status, "dibatalkan"),
        gte(orders.deliveryDate, from),
        lte(orders.deliveryDate, to),
      ),
    )
    .groupBy(orders.deliveryDate)
  return rows.map((row) => ({ ...row, portions: Number(row.portions) }))
}
