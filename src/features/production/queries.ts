import "server-only"

import { getDb } from "@/db"
import type { OrderStatus } from "@/features/orders/filters"
import type { OrderType, ShippingMethod } from "@/lib/wa-parser"

import type { ProductionItem } from "./summary"

export type ProductionOrder = {
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
  createdAt: Date
  items: ProductionItem[]
}

/** Pesanan (tidak dibatalkan) yang dikirim pada tanggal ini, urut waktu dibuat. */
export async function listProductionOrders(deliveryDate: string): Promise<ProductionOrder[]> {
  const rows = await getDb().query.orders.findMany({
    where: (order, { and, eq, ne }) =>
      and(eq(order.deliveryDate, deliveryDate), ne(order.status, "dibatalkan")),
    with: {
      shipment: { columns: { method: true } },
      items: {
        columns: { qty: true },
        with: {
          variant: {
            columns: { size: true },
            with: {
              menu: { columns: { name: true, category: true, photoPath: true, createdAt: true } },
            },
          },
        },
      },
    },
    orderBy: (order, { asc }) => [asc(order.createdAt), asc(order.orderNo)],
  })

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
    hasCard: Boolean(row.cardTo || row.cardWishes || row.cardFrom),
    createdAt: row.createdAt,
    items: row.items.map((item) => ({
      menuName: item.variant.menu.name,
      category: item.variant.menu.category,
      size: item.variant.size,
      qty: item.qty,
      photoPath: item.variant.menu.photoPath,
      menuOrder: item.variant.menu.createdAt.getTime(),
    })),
  }))
}
