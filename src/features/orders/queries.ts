import "server-only"

import { and, asc, count, eq, gte, ilike, like, lt, ne, or, sql } from "drizzle-orm"

import { getDb } from "@/db"
import { customers, menus, menuVariants, orders, shipments } from "@/db/schema"
import type { OrderType, ShippingMethod } from "@/lib/wa-parser"

import type { CatalogVariant } from "./catalog"
import { addDays, type OrderFilters, type OrderStatus } from "./filters"
import type { DailyOrderStats } from "./kpis"

export const ORDER_PAGE_SIZE = 10

/** Awal hari WIB sebagai Date, untuk membandingkan created_at (timestamptz). */
function startOfJakartaDay(day: string) {
  return new Date(`${day}T00:00:00+07:00`)
}

function createdBetween(from: string, to: string) {
  return and(
    gte(orders.createdAt, startOfJakartaDay(from)),
    lt(orders.createdAt, startOfJakartaDay(addDays(to, 1))),
  )
}

/** Varian menu aktif untuk form pesanan, urut seperti Master Data (kategori, lalu urutan dibuat). */
export async function getOrderCatalog(): Promise<CatalogVariant[]> {
  return getDb()
    .select({
      id: menuVariants.id,
      menuName: menus.name,
      category: menus.category,
      size: menuVariants.size,
      price: menuVariants.price,
      photoPath: menus.photoPath,
    })
    .from(menuVariants)
    .innerJoin(menus, eq(menus.id, menuVariants.menuId))
    .where(and(eq(menus.isActive, true), eq(menuVariants.isActive, true)))
    .orderBy(asc(menus.category), asc(menus.createdAt), asc(menus.name))
}

export type OrderListRow = {
  id: string
  orderNo: string
  createdAt: Date
  customerName: string
  type: OrderType
  deliveryDate: string
  shippingMethod: ShippingMethod
  total: number
  status: OrderStatus
}

/** Cari nama customer, no. pesanan, atau no. HP (bila yang diketik berisi angka). */
function searchCondition(q: string | undefined) {
  if (!q) return undefined
  const escaped = q.replace(/[\\%_]/g, (char) => `\\${char}`)
  let digits = q.replace(/\D/g, "")
  if (digits.startsWith("62")) digits = `0${digits.slice(2)}`
  return or(
    ilike(customers.name, `%${escaped}%`),
    ilike(orders.orderNo, `%${escaped}%`),
    digits.length >= 3 ? like(customers.phone, `%${digits}%`) : undefined,
  )
}

/** Daftar pesanan sesuai filter, 10 per halaman, urut waktu dibuat (antrean hari itu). */
export async function listOrders(filters: OrderFilters) {
  const db = getDb()
  const where = and(
    createdBetween(filters.from, filters.to),
    filters.type ? eq(orders.type, filters.type) : undefined,
    filters.status ? eq(orders.status, filters.status) : undefined,
    filters.method ? eq(shipments.method, filters.method) : undefined,
    searchCondition(filters.q),
  )

  const [{ total }] = await db
    .select({ total: count() })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(shipments, eq(shipments.orderId, orders.id))
    .where(where)
  const pageCount = Math.max(1, Math.ceil(total / ORDER_PAGE_SIZE))
  const page = Math.min(filters.page, pageCount)

  const rows: OrderListRow[] = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      createdAt: orders.createdAt,
      customerName: customers.name,
      type: orders.type,
      deliveryDate: orders.deliveryDate,
      shippingMethod: shipments.method,
      total: orders.total,
      status: orders.status,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(shipments, eq(shipments.orderId, orders.id))
    .where(where)
    .orderBy(asc(orders.createdAt), asc(orders.orderNo))
    .limit(ORDER_PAGE_SIZE)
    .offset((page - 1) * ORDER_PAGE_SIZE)

  return { rows, total, page, pageCount }
}

/** Rekap harian (WIB) pesanan yang tidak dibatalkan, untuk KPI dan sparkline. */
export async function getDailyOrderStats(from: string, to: string): Promise<DailyOrderStats[]> {
  const day = sql<string>`to_char(${orders.createdAt} at time zone 'Asia/Jakarta', 'YYYY-MM-DD')`
  return getDb()
    .select({
      day,
      orders: count().mapWith(Number),
      personal: sql<number>`count(*) filter (where ${orders.type} = 'personal')`.mapWith(Number),
      hadiah: sql<number>`count(*) filter (where ${orders.type} = 'hadiah')`.mapWith(Number),
      value: sql<number>`coalesce(sum(${orders.total}), 0)`.mapWith(Number),
    })
    .from(orders)
    .where(and(createdBetween(from, to), ne(orders.status, "dibatalkan")))
    .groupBy(day)
}
