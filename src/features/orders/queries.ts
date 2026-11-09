import "server-only"

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  like,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm"

import { getDb } from "@/db"
import {
  customers,
  menuCategories,
  menus,
  menuVariants,
  orderItems,
  orders,
  paymentMethods,
  payments,
  shipments,
} from "@/db/schema"
import type { OrderKind, OrderType, ShippingMethod } from "@/lib/wa-parser"

import type { CatalogVariant } from "./catalog"
import type { OrderChannel } from "./constants"
import type { OrderExportRow } from "./csv"
import type { OrderEditPart } from "./edit-log"
import { addDays, type OrderFilters, type OrderStatus } from "./filters"
import type { DailyOrderStats } from "./kpis"
import type { ShipmentStatus } from "./status"

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

/**
 * Varian menu aktif untuk form pesanan, urut seperti Master Data (urutan kategori dari Owner,
 * lalu urutan dibuat). Menu arsip dan menu tanpa kategori tidak ikut.
 */
export async function getOrderCatalog(): Promise<CatalogVariant[]> {
  return getDb()
    .select({
      id: menuVariants.id,
      menuName: menus.name,
      categoryId: menuCategories.id,
      categoryName: menuCategories.name,
      categorySort: menuCategories.sortOrder,
      sized: menuCategories.sized,
      size: menuVariants.size,
      price: menuVariants.price,
      photoPath: menus.photoPath,
    })
    .from(menuVariants)
    .innerJoin(menus, eq(menus.id, menuVariants.menuId))
    .innerJoin(menuCategories, eq(menuCategories.id, menus.categoryId))
    .where(
      and(eq(menus.isActive, true), eq(menus.isArchived, false), eq(menuVariants.isActive, true)),
    )
    .orderBy(asc(menuCategories.sortOrder), asc(menus.createdAt), asc(menus.name))
}

export type OrderListRow = {
  id: string
  orderNo: string
  createdAt: Date
  customerName: string
  /** Pesanan Hadiah: customer = penerima, ini yang memesan. */
  senderName: string | null
  type: OrderType
  kind: OrderKind
  deliveryDate: string
  shippingMethod: ShippingMethod
  total: number
  status: OrderStatus
  /** Sudah ada pembayaran Lunas. */
  paid: boolean
  channel: OrderChannel
  marketplaceOrderNo: string | null
  trackingUrl: string | null
  trackingLinkSentAt: Date | null
  note: string | null
  urgentAt: Date | null
  urgentNote: string | null
}

/** Cari nama customer, nama pengirim hadiah, no. pesanan, atau no. HP (bila berisi angka). */
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

/** Daftar pesanan sesuai filter, 10 per halaman, urut waktu dibuat (antrean hari itu). */
export async function listOrders(filters: OrderFilters) {
  const db = getDb()
  const where = and(
    createdBetween(filters.from, filters.to),
    filters.type ? eq(orders.type, filters.type) : undefined,
    filters.status ? eq(orders.status, filters.status) : undefined,
    filters.method ? eq(shipments.method, filters.method) : undefined,
    filters.channel ? eq(orders.channel, filters.channel) : undefined,
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
      customerName: orders.customerName,
      senderName: orders.senderName,
      type: orders.type,
      kind: orders.kind,
      deliveryDate: orders.deliveryDate,
      shippingMethod: shipments.method,
      total: orders.total,
      status: orders.status,
      paid: isNotNull(payments.id).mapWith(Boolean),
      trackingUrl: shipments.trackingUrl,
      trackingLinkSentAt: shipments.trackingLinkSentAt,
      note: orders.note,
      urgentAt: orders.urgentAt,
      urgentNote: orders.urgentNote,
      channel: orders.channel,
      marketplaceOrderNo: orders.marketplaceOrderNo,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(shipments, eq(shipments.orderId, orders.id))
    .leftJoin(payments, and(eq(payments.orderId, orders.id), eq(payments.status, "lunas")))
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

export type OrderDetail = {
  id: string
  orderNo: string
  createdAt: Date
  createdByName: string | null
  type: OrderType
  kind: OrderKind
  status: OrderStatus
  deliveryDate: string
  request: string | null
  total: number
  rawWaText: string | null
  senderName: string | null
  cardTo: string | null
  cardWishes: string | null
  cardFrom: string | null
  channel: OrderChannel
  marketplaceOrderNo: string | null
  note: string | null
  urgentAt: Date | null
  urgentNote: string | null
  /** Edit terakhir setelah pesanan diinput; null = belum pernah diedit. */
  lastEdit: { part: OrderEditPart; at: Date; byName: string | null } | null
  customer: { name: string; phone: string | null }
  /** Kosong = belum bayar. */
  payment: {
    methodId: string
    methodName: string
    note: string | null
    paidAt: Date | null
    /** Nominal yang dibayar; bisa beda dari total bila menu diubah setelah lunas. */
    amount: number
  } | null
  shipment: {
    method: ShippingMethod
    status: ShipmentStatus | null
    address: string | null
    courierId: string | null
    courierName: string | null
    slot: "09-12" | "13-17" | null
    trackingUrl: string | null
    trackingLinkSentAt: Date | null
  }
  items: {
    id: string
    menuVariantId: string
    menuName: string
    size: "large" | "regular" | "single"
    note: string | null
    qty: number
    unitPrice: number
    subtotal: number
    photoPath: string | null
  }[]
}

// Urutan seperti template WA: urutan kategori dari Owner, lalu ukuran (Large, Regular); dalam
// satu kelompok mengikuti urutan menu di Master Data (A–E di template).
const NO_CATEGORY = Number.MAX_SAFE_INTEGER
const SIZE_ORDER = { large: 0, regular: 1, single: 2 } as const

/** Detail satu pesanan untuk panel kanan Daftar Pesanan dan halaman Detail Lengkap. */
export async function getOrderDetail(orderNo: string): Promise<OrderDetail | null> {
  const order = await getDb().query.orders.findFirst({
    where: (order, { eq }) => eq(order.orderNo, orderNo),
    with: {
      customer: { columns: { phone: true } },
      shipment: { with: { courier: { columns: { name: true } } } },
      createdByProfile: { columns: { name: true } },
      editLogs: {
        orderBy: (log, { desc }) => [desc(log.editedAt)],
        limit: 1,
        with: { editedByProfile: { columns: { name: true } } },
      },
      payments: {
        where: (payment, { eq }) => eq(payment.status, "lunas"),
        with: { method: { columns: { name: true } } },
      },
      items: {
        with: {
          variant: {
            columns: { size: true },
            with: {
              menu: {
                columns: { name: true, photoPath: true, createdAt: true },
                with: { category: { columns: { sortOrder: true } } },
              },
            },
          },
        },
      },
    },
  })
  if (!order || !order.shipment) return null

  return {
    id: order.id,
    orderNo: order.orderNo,
    createdAt: order.createdAt,
    lastEdit: order.editLogs[0]
      ? {
          part: order.editLogs[0].part,
          at: order.editLogs[0].editedAt,
          byName: order.editLogs[0].editedByProfile?.name ?? null,
        }
      : null,
    createdByName: order.createdByProfile?.name ?? null,
    type: order.type,
    kind: order.kind,
    status: order.status,
    deliveryDate: order.deliveryDate,
    request: order.request,
    total: order.total,
    rawWaText: order.rawWaText,
    senderName: order.senderName,
    cardTo: order.cardTo,
    cardWishes: order.cardWishes,
    cardFrom: order.cardFrom,
    channel: order.channel,
    marketplaceOrderNo: order.marketplaceOrderNo,
    note: order.note,
    urgentAt: order.urgentAt,
    urgentNote: order.urgentNote,
    customer: { name: order.customerName, phone: order.customer.phone },
    payment: order.payments[0]
      ? {
          methodId: order.payments[0].paymentMethodId,
          methodName: order.payments[0].method.name,
          note: order.payments[0].note,
          paidAt: order.payments[0].paidAt,
          amount: order.payments[0].amount,
        }
      : null,
    shipment: {
      method: order.shipment.method,
      status: order.shipment.status,
      address: order.shipment.address,
      courierId: order.shipment.courierId,
      courierName: order.shipment.courier?.name ?? null,
      slot: order.shipment.slot,
      trackingUrl: order.shipment.trackingUrl,
      trackingLinkSentAt: order.shipment.trackingLinkSentAt,
    },
    items: [...order.items]
      .sort(
        (a, b) =>
          (a.variant.menu.category?.sortOrder ?? NO_CATEGORY) -
            (b.variant.menu.category?.sortOrder ?? NO_CATEGORY) ||
          SIZE_ORDER[a.variant.size] - SIZE_ORDER[b.variant.size] ||
          a.variant.menu.createdAt.getTime() - b.variant.menu.createdAt.getTime() ||
          a.variant.menu.name.localeCompare(b.variant.menu.name),
      )
      .map((item) => ({
        id: item.id,
        menuVariantId: item.menuVariantId,
        menuName: item.variant.menu.name,
        size: item.variant.size,
        note: item.note,
        qty: item.qty,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        photoPath: item.variant.menu.photoPath,
      })),
  }
}

export type OrderHistoryEntry =
  | {
      kind: "status"
      id: string
      fromStatus: OrderStatus | null
      toStatus: OrderStatus
      changedAt: Date
      changedByName: string | null
    }
  | {
      kind: "edit"
      id: string
      part: OrderEditPart
      changes: string[]
      changedAt: Date
      changedByName: string | null
    }

/** Riwayat perubahan status dan edit pesanan, terbaru di atas. */
export async function getOrderHistory(orderId: string): Promise<OrderHistoryEntry[]> {
  const db = getDb()
  const [statusLogs, editLogs] = await Promise.all([
    db.query.orderStatusLogs.findMany({
      where: (log, { eq }) => eq(log.orderId, orderId),
      with: { changedByProfile: { columns: { name: true } } },
    }),
    db.query.orderEditLogs.findMany({
      where: (log, { eq }) => eq(log.orderId, orderId),
      with: { editedByProfile: { columns: { name: true } } },
    }),
  ])
  const entries: OrderHistoryEntry[] = [
    ...statusLogs.map((log) => ({
      kind: "status" as const,
      id: log.id,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      changedAt: log.changedAt,
      changedByName: log.changedByProfile?.name ?? null,
    })),
    ...editLogs.map((log) => ({
      kind: "edit" as const,
      id: log.id,
      part: log.part,
      changes: log.changes,
      changedAt: log.editedAt,
      changedByName: log.editedByProfile?.name ?? null,
    })),
  ]
  return entries.sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())
}

/** Pesanan terbaru pada rentang ini (termasuk dibatalkan), terbaru di atas. Untuk Dashboard. */
export async function listLatestOrders(from: string, to: string, limit = 5) {
  const rows: Omit<
    OrderListRow,
    "paid" | "channel" | "marketplaceOrderNo" | "trackingUrl" | "trackingLinkSentAt"
  >[] = await getDb()
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      createdAt: orders.createdAt,
      customerName: orders.customerName,
      senderName: orders.senderName,
      type: orders.type,
      kind: orders.kind,
      deliveryDate: orders.deliveryDate,
      shippingMethod: shipments.method,
      total: orders.total,
      status: orders.status,
      note: orders.note,
      urgentAt: orders.urgentAt,
      urgentNote: orders.urgentNote,
    })
    .from(orders)
    .innerJoin(shipments, eq(shipments.orderId, orders.id))
    .where(createdBetween(from, to))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
  return rows
}

/** Data lengkap pesanan terpilih untuk Unduh CSV, urut nomor pesanan. */
export async function getOrdersForExport(orderIds: string[]): Promise<OrderExportRow[]> {
  const db = getDb()
  const [rows, items] = await Promise.all([
    db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        createdAt: orders.createdAt,
        type: orders.type,
        kind: orders.kind,
        customerName: orders.customerName,
        phone: customers.phone,
        address: shipments.address,
        senderName: orders.senderName,
        deliveryDate: orders.deliveryDate,
        method: shipments.method,
        status: orders.status,
        paidWith: paymentMethods.name,
        note: orders.note,
        channel: orders.channel,
        marketplaceOrderNo: orders.marketplaceOrderNo,
        trackingUrl: shipments.trackingUrl,
        request: orders.request,
        total: orders.total,
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .innerJoin(shipments, eq(shipments.orderId, orders.id))
      .leftJoin(payments, and(eq(payments.orderId, orders.id), eq(payments.status, "lunas")))
      .leftJoin(paymentMethods, eq(paymentMethods.id, payments.paymentMethodId))
      .where(inArray(orders.id, orderIds))
      .orderBy(asc(orders.orderNo)),
    db
      .select({
        orderId: orderItems.orderId,
        menuName: menus.name,
        size: menuVariants.size,
        qty: orderItems.qty,
      })
      .from(orderItems)
      .innerJoin(menuVariants, eq(menuVariants.id, orderItems.menuVariantId))
      .innerJoin(menus, eq(menus.id, menuVariants.menuId))
      .where(inArray(orderItems.orderId, orderIds))
      .orderBy(asc(menus.createdAt), asc(menuVariants.size)),
  ])
  return rows.map(({ id, ...row }) => ({
    ...row,
    items: items.filter((item) => item.orderId === id),
  }))
}
