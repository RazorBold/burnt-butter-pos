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
  urgentAt: Date | null
  urgentNote: string | null
  hasCard: boolean
  /** Sudah Lunas. Pesanan Baru yang belum lunas belum masuk antrean masak. */
  paid: boolean
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
      payments: { columns: { id: true }, where: (payment, { eq }) => eq(payment.status, "lunas") },
      items: {
        columns: { qty: true, note: true },
        with: {
          variant: {
            columns: { size: true },
            with: {
              menu: {
                columns: { name: true, photoPath: true, createdAt: true },
                with: { category: { columns: { sortOrder: true, sized: true } } },
              },
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
    urgentAt: row.urgentAt,
    urgentNote: row.urgentNote,
    hasCard: Boolean(row.cardTo || row.cardWishes || row.cardFrom),
    paid: row.payments.length > 0,
    createdAt: row.createdAt,
    items: row.items.map((item) => ({
      menuName: item.variant.menu.name,
      categorySort: item.variant.menu.category?.sortOrder ?? Number.MAX_SAFE_INTEGER,
      sized: item.variant.menu.category?.sized ?? item.variant.size !== "single",
      size: item.variant.size,
      qty: item.qty,
      photoPath: item.variant.menu.photoPath,
      menuOrder: item.variant.menu.createdAt.getTime(),
      note: item.note,
    })),
  }))
}
