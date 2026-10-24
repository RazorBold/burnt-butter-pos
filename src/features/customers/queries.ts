import "server-only"

import { count, desc, eq, ilike, like, ne, or, sql } from "drizzle-orm"

import { getDb } from "@/db"
import { customers, orders } from "@/db/schema"

export const CUSTOMER_PAGE_SIZE = 10

export type CustomerRow = {
  id: string
  name: string
  phone: string
  address: string | null
  /** Pesanan yang tidak dibatalkan. */
  orderCount: number
  totalSpent: number
  lastOrderAt: Date | null
}

export type CustomerPage = {
  rows: CustomerRow[]
  total: number
  page: number
  pageCount: number
}

/** Cocokkan nama, atau nomor HP bila yang diketik berisi angka ("0812", "62812", "3456"). */
function searchCondition(q: string | undefined) {
  const text = q?.trim()
  if (!text) return undefined
  const escaped = text.replace(/[\\%_]/g, (char) => `\\${char}`)
  let digits = text.replace(/\D/g, "")
  if (digits.startsWith("62")) digits = `0${digits.slice(2)}`
  return or(
    ilike(customers.name, `%${escaped}%`),
    digits.length >= 3 ? like(customers.phone, `%${digits}%`) : undefined,
  )
}

/**
 * Customer beserta ringkasan pesanannya, 10 per halaman. Yang terakhir memesan tampil paling
 * atas, lalu customer yang baru ditambahkan.
 */
export async function listCustomers({
  q,
  page,
}: {
  q?: string
  page: number
}): Promise<CustomerPage> {
  const db = getDb()
  const where = searchCondition(q)

  const [{ total }] = await db.select({ total: count() }).from(customers).where(where)
  const pageCount = Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE))
  const current = Math.min(Math.max(1, page), pageCount)

  const stats = db
    .select({
      customerId: orders.customerId,
      orderCount: count().as("order_count"),
      totalSpent: sql<number>`sum(${orders.total})`.as("total_spent"),
      lastOrderAt: sql`max(${orders.createdAt})`.as("last_order_at"),
    })
    .from(orders)
    .where(ne(orders.status, "dibatalkan"))
    .groupBy(orders.customerId)
    .as("stats")

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      address: customers.address,
      orderCount: sql<number>`coalesce(${stats.orderCount}, 0)`.mapWith(Number),
      totalSpent: sql<number>`coalesce(${stats.totalSpent}, 0)`.mapWith(Number),
      lastOrderAt: sql<Date | null>`${stats.lastOrderAt}`.mapWith(orders.createdAt),
    })
    .from(customers)
    .leftJoin(stats, eq(stats.customerId, customers.id))
    .where(where)
    .orderBy(sql`${stats.lastOrderAt} desc nulls last`, desc(customers.createdAt), customers.name)
    .limit(CUSTOMER_PAGE_SIZE)
    .offset((current - 1) * CUSTOMER_PAGE_SIZE)

  return { rows, total, page: current, pageCount }
}
