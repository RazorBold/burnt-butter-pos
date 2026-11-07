import "server-only"

import { and, asc, eq, gt, inArray } from "drizzle-orm"

import { getDb } from "@/db"
import { packagings, stockMovements } from "@/db/schema"
import type { OrderStatus } from "@/features/orders/filters"
import type { OrderType, ShippingMethod } from "@/lib/wa-parser"

import { netUsage, type PackagingUse } from "./needs"

export type PackingPackaging = {
  id: string
  name: string
  unit: string
  stock: number
  size: "large" | "regular" | "single" | null
}

export type PackingOrder = {
  id: string
  orderNo: string
  status: OrderStatus
  type: OrderType
  customerName: string
  senderName: string | null
  shippingMethod: ShippingMethod
  request: string | null
  note: string | null
  hasCard: boolean
  items: { menuName: string; size: "large" | "regular" | "single"; qty: number }[]
  /** Normal / Hampers; null sebelum di-packing (atau di-packing sebelum ada pilihan ini). */
  packagingType: "normal" | "hampers" | null
  /** Box hampers yang terpotong saat packing (bersih setelah pengembalian). */
  used: PackagingUse[]
}

/** Box hampers aktif (urutan Stok Packaging) beserta stoknya, untuk dialog packing. */
export async function listPackingPackagings(): Promise<PackingPackaging[]> {
  return getDb()
    .select({
      id: packagings.id,
      name: packagings.name,
      unit: packagings.unit,
      stock: packagings.stock,
      size: packagings.size,
    })
    .from(packagings)
    .where(eq(packagings.isActive, true))
    .orderBy(asc(packagings.createdAt), asc(packagings.name))
}

/**
 * Pesanan (tidak dibatalkan) yang dikirim pada tanggal ini, untuk papan Packaging: isi menu
 * dan packaging yang sudah terpotong.
 */
export async function listPackingOrders(
  deliveryDate: string,
  packagingList: PackingPackaging[],
): Promise<PackingOrder[]> {
  const db = getDb()
  const rows = await db.query.orders.findMany({
    where: (order, { and, eq, ne }) =>
      and(eq(order.deliveryDate, deliveryDate), ne(order.status, "dibatalkan")),
    with: {
      shipment: { columns: { method: true } },
      items: {
        columns: { qty: true },
        with: {
          variant: { columns: { size: true }, with: { menu: { columns: { name: true } } } },
        },
      },
    },
    orderBy: (order, { asc }) => [asc(order.createdAt), asc(order.orderNo)],
  })

  const ids = rows.map((row) => row.id)
  const movements =
    ids.length === 0
      ? []
      : await db
          .select({
            orderId: stockMovements.orderId,
            packagingId: stockMovements.itemId,
            direction: stockMovements.direction,
            qty: stockMovements.qty,
          })
          .from(stockMovements)
          .where(
            and(
              eq(stockMovements.itemType, "packaging"),
              inArray(stockMovements.orderId, ids),
              gt(stockMovements.qty, 0),
            ),
          )
  const order = packagingList.map((item) => item.id)

  return rows.map((row) => ({
    id: row.id,
    orderNo: row.orderNo,
    status: row.status,
    type: row.type,
    customerName: row.customerName,
    senderName: row.senderName,
    shippingMethod: row.shipment?.method ?? "kurir_internal",
    request: row.request,
    note: row.note,
    packagingType: row.packagingType,
    hasCard: Boolean(row.cardTo || row.cardWishes || row.cardFrom),
    items: row.items.map((item) => ({
      menuName: item.variant.menu.name,
      size: item.variant.size,
      qty: item.qty,
    })),
    used: netUsage(
      movements.filter((movement) => movement.orderId === row.id),
      order,
    ),
  }))
}
