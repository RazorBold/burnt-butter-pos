import "server-only"

import { and, asc, count, eq, inArray, isNull, ne, or, type SQL, sql } from "drizzle-orm"

import { getDb } from "@/db"
import { couriers, orders, shipments, shippingOptions } from "@/db/schema"
import type { OrderStatus } from "@/features/orders/filters"
import type { ShipmentStatus } from "@/features/orders/status"
import type { OrderType, ShippingMethod } from "@/lib/wa-parser"

import type { DeliverySlot, ShipmentFilters, ShipmentState, ShipmentTab } from "./logic"

export const SHIPMENT_PAGE_SIZE = 10

export type ShipmentRow = {
  orderId: string
  orderNo: string
  customerName: string
  senderName: string | null
  type: OrderType
  orderStatus: OrderStatus
  method: ShippingMethod
  /** Nama kategori pengiriman (Master Data); null untuk data lama. */
  optionName: string | null
  liveTracking: boolean | null
  address: string | null
  courierId: string | null
  courierName: string | null
  trackingUrl: string | null
  note: string | null
  urgentAt: Date | null
  urgentNote: string | null
  slot: DeliverySlot | null
  status: ShipmentStatus | null
}

function tabCondition(tab: ShipmentTab): SQL | undefined {
  switch (tab) {
    case "perlu":
      return or(
        isNull(shipments.status),
        inArray(shipments.status, ["menunggu_kurir", "siap_dikirim", "siap_diambil"]),
      )
    case "jalan":
      return inArray(shipments.status, ["dalam_perjalanan", "dikirim"])
    case "selesai":
      return eq(shipments.status, "selesai")
    default:
      return undefined
  }
}

function stateCondition(state: ShipmentState | undefined) {
  if (!state) return undefined
  return state === "belum_siap" ? isNull(shipments.status) : eq(shipments.status, state)
}

/** Pesanan (tidak dibatalkan) yang dikirim pada tanggal ini, beserta filter metode & kurir. */
function baseWhere(filters: ShipmentFilters) {
  return and(
    eq(orders.deliveryDate, filters.date),
    ne(orders.status, "dibatalkan"),
    filters.method ? eq(shipments.method, filters.method) : undefined,
    filters.courierId ? eq(shipments.courierId, filters.courierId) : undefined,
  )
}

/** Daftar pengiriman per halaman + jumlah per tab (tab tidak ikut menyaring hitungannya). */
export async function listShipments(filters: ShipmentFilters) {
  const db = getDb()
  const where = and(baseWhere(filters), stateCondition(filters.state), tabCondition(filters.tab))

  const [tabCounts] = await db
    .select({
      semua: count(),
      perlu: sql<number>`count(*) filter (where ${tabCondition("perlu")})`.mapWith(Number),
      jalan: sql<number>`count(*) filter (where ${tabCondition("jalan")})`.mapWith(Number),
      selesai: sql<number>`count(*) filter (where ${tabCondition("selesai")})`.mapWith(Number),
    })
    .from(orders)
    .innerJoin(shipments, eq(shipments.orderId, orders.id))
    .where(and(baseWhere(filters), stateCondition(filters.state)))

  const [{ total }] = await db
    .select({ total: count() })
    .from(orders)
    .innerJoin(shipments, eq(shipments.orderId, orders.id))
    .where(where)
  const pageCount = Math.max(1, Math.ceil(total / SHIPMENT_PAGE_SIZE))
  const page = Math.min(filters.page, pageCount)

  const rows: ShipmentRow[] = await db
    .select({
      orderId: orders.id,
      orderNo: orders.orderNo,
      customerName: orders.customerName,
      senderName: orders.senderName,
      type: orders.type,
      orderStatus: orders.status,
      method: shipments.method,
      optionName: shippingOptions.name,
      liveTracking: shippingOptions.liveTracking,
      address: shipments.address,
      courierId: shipments.courierId,
      courierName: couriers.name,
      trackingUrl: shipments.trackingUrl,
      note: orders.note,
      urgentAt: orders.urgentAt,
      urgentNote: orders.urgentNote,
      slot: shipments.slot,
      status: shipments.status,
    })
    .from(orders)
    .innerJoin(shipments, eq(shipments.orderId, orders.id))
    .leftJoin(couriers, eq(couriers.id, shipments.courierId))
    .leftJoin(shippingOptions, eq(shippingOptions.id, shipments.optionId))
    .where(where)
    .orderBy(asc(orders.createdAt), asc(orders.orderNo))
    .limit(SHIPMENT_PAGE_SIZE)
    .offset((page - 1) * SHIPMENT_PAGE_SIZE)

  return { rows, total, page, pageCount, tabCounts }
}

/** Ringkasan pengiriman untuk tanggal kirim ini (F-40). */
/** Jumlah pengiriman per kategori (Master Data) pada tanggal ini. */
export type ShipmentOptionCount = {
  optionId: string | null
  method: ShippingMethod
  name: string | null
  count: number
}

export async function getShipmentSummary(date: string) {
  const db = getDb()
  const where = and(eq(orders.deliveryDate, date), ne(orders.status, "dibatalkan"))
  const [[row], perOption] = await Promise.all([
    db
      .select({
        perlu: sql<number>`count(*) filter (where ${tabCondition("perlu")})`.mapWith(Number),
        selesai: sql<number>`count(*) filter (where ${tabCondition("selesai")})`.mapWith(Number),
      })
      .from(orders)
      .innerJoin(shipments, eq(shipments.orderId, orders.id))
      .where(where),
    db
      .select({
        optionId: shipments.optionId,
        method: shipments.method,
        name: shippingOptions.name,
        count: count(),
      })
      .from(orders)
      .innerJoin(shipments, eq(shipments.orderId, orders.id))
      .leftJoin(shippingOptions, eq(shippingOptions.id, shipments.optionId))
      .where(where)
      .groupBy(shipments.optionId, shipments.method, shippingOptions.name),
  ])
  return { ...row, perOption: perOption as ShipmentOptionCount[] }
}

export type CourierOption = { id: string; name: string; type: "internal" | "eksternal" }

/** Kurir aktif untuk filter dan pilihan Ubah Kurir. Kurir internal di atas. */
export async function listActiveCouriers(): Promise<CourierOption[]> {
  return getDb()
    .select({ id: couriers.id, name: couriers.name, type: couriers.type })
    .from(couriers)
    .where(eq(couriers.isActive, true))
    .orderBy(asc(couriers.type), asc(couriers.name))
}
