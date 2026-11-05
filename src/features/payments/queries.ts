import "server-only"

import {
  and,
  asc,
  count,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  like,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm"

import { getDb } from "@/db"
import { customers, orders, paymentMethods, payments, profiles } from "@/db/schema"
import { addDays, type OrderStatus } from "@/features/orders/filters"
import type { OrderType } from "@/lib/wa-parser"

import type { PaymentFilters } from "./filters"

export const PAYMENT_PAGE_SIZE = 10

export type PaymentInfo = {
  methodName: string
  note: string | null
  paidAt: Date
  recordedByName: string | null
}

export type OrderPaymentRow = {
  orderId: string
  orderNo: string
  createdAt: Date
  customerName: string
  senderName: string | null
  type: OrderType
  status: OrderStatus
  deliveryDate: string
  total: number
  paymentMethodId: string | null
  payment: PaymentInfo | null
  orderNote: string | null
}

export type PaymentSummary = {
  unpaid: { count: number; value: number }
  paid: { count: number; value: number }
}

export type ActivePaymentMethod = {
  id: string
  name: string
  type: "bank" | "ewallet" | "cash" | "marketplace"
}

function createdBetween(from: string, to: string) {
  return and(
    gte(orders.createdAt, new Date(`${from}T00:00:00+07:00`)),
    lt(orders.createdAt, new Date(`${addDays(to, 1)}T00:00:00+07:00`)),
  )
}

function searchCondition(q: string | undefined) {
  if (!q) return undefined
  const escaped = q.replace(/[\\%_]/g, (char) => `\\${char}`)
  let digits = q.replace(/\D/g, "")
  if (digits.startsWith("62")) digits = `0${digits.slice(2)}`
  return or(
    ilike(orders.customerName, `%${escaped}%`),
    ilike(orders.senderName, `%${escaped}%`),
    ilike(orders.orderNo, `%${escaped}%`),
    ilike(orders.marketplaceOrderNo, `%${escaped}%`),
    digits.length >= 3 ? like(customers.phone, `%${digits}%`) : undefined,
  )
}

/** Pesanan dibatalkan tidak perlu ditagih, jadi tidak tampil di Pembayaran. */
const notCancelled = ne(orders.status, "dibatalkan")

/** Pesanan beserta status bayarnya, 10 per halaman, urut waktu dibuat. */
export async function listOrderPayments(filters: PaymentFilters) {
  const db = getDb()
  const where = and(
    notCancelled,
    createdBetween(filters.from, filters.to),
    filters.state === "lunas" ? isNotNull(payments.id) : undefined,
    filters.state === "belum" ? isNull(payments.id) : undefined,
    filters.methodId ? eq(payments.paymentMethodId, filters.methodId) : undefined,
    searchCondition(filters.q),
  )

  const base = () =>
    db
      .select({ total: count() })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .leftJoin(payments, and(eq(payments.orderId, orders.id), eq(payments.status, "lunas")))
  const [{ total }] = await base().where(where)
  const pageCount = Math.max(1, Math.ceil(total / PAYMENT_PAGE_SIZE))
  const page = Math.min(filters.page, pageCount)

  const rows = await db
    .select({
      orderId: orders.id,
      orderNo: orders.orderNo,
      createdAt: orders.createdAt,
      customerName: orders.customerName,
      senderName: orders.senderName,
      type: orders.type,
      status: orders.status,
      deliveryDate: orders.deliveryDate,
      total: orders.total,
      orderNote: orders.note,
      paymentMethodId: payments.paymentMethodId,
      methodName: paymentMethods.name,
      note: payments.note,
      paidAt: payments.paidAt,
      recordedByName: profiles.name,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .leftJoin(payments, and(eq(payments.orderId, orders.id), eq(payments.status, "lunas")))
    .leftJoin(paymentMethods, eq(paymentMethods.id, payments.paymentMethodId))
    .leftJoin(profiles, eq(profiles.id, payments.recordedBy))
    .where(where)
    .orderBy(asc(orders.createdAt), asc(orders.orderNo))
    .limit(PAYMENT_PAGE_SIZE)
    .offset((page - 1) * PAYMENT_PAGE_SIZE)

  return {
    rows: rows.map(({ methodName, note, paidAt, recordedByName, ...row }): OrderPaymentRow => ({
      ...row,
      payment: methodName && paidAt ? { methodName, note, paidAt, recordedByName } : null,
    })),
    total,
    page,
    pageCount,
  }
}

/** Jumlah dan nilai pesanan belum bayar / lunas pada rentang tanggal (filter lain tidak ikut). */
export async function getPaymentSummary(from: string, to: string): Promise<PaymentSummary> {
  const [row] = await getDb()
    .select({
      unpaidCount: sql<number>`count(*) filter (where ${payments.id} is null)`.mapWith(Number),
      unpaidValue:
        sql<number>`coalesce(sum(${orders.total}) filter (where ${payments.id} is null), 0)`.mapWith(
          Number,
        ),
      paidCount: sql<number>`count(*) filter (where ${payments.id} is not null)`.mapWith(Number),
      paidValue:
        sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.id} is not null), 0)`.mapWith(
          Number,
        ),
    })
    .from(orders)
    .leftJoin(payments, and(eq(payments.orderId, orders.id), eq(payments.status, "lunas")))
    .where(and(notCancelled, createdBetween(from, to)))
  return {
    unpaid: { count: row.unpaidCount, value: row.unpaidValue },
    paid: { count: row.paidCount, value: row.paidValue },
  }
}

/** Metode bayar aktif untuk pilihan "dibayar lewat apa". */
export async function listActivePaymentMethods(): Promise<ActivePaymentMethod[]> {
  return getDb()
    .select({ id: paymentMethods.id, name: paymentMethods.name, type: paymentMethods.type })
    .from(paymentMethods)
    .where(eq(paymentMethods.isActive, true))
    .orderBy(asc(paymentMethods.type), asc(paymentMethods.createdAt), asc(paymentMethods.name))
}
