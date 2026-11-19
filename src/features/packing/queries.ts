import "server-only"

import { and, asc, eq, gt, inArray } from "drizzle-orm"

import { getDb } from "@/db"
import { packagingCategories, packagings, stockMovements } from "@/db/schema"
import type { OrderChannel } from "@/features/orders/constants"
import type { OrderStatus } from "@/features/orders/filters"
import type { OrderKind, OrderType, ShippingMethod } from "@/lib/wa-parser"

import { netUsage, type PackagingUse } from "./needs"

export type PackingPackaging = {
  id: string
  name: string
  unit: string
  stock: number
  categoryId: string | null
  categoryName: string | null
  categorySort: number | null
}

export type PackingOrder = {
  id: string
  orderNo: string
  status: OrderStatus
  type: OrderType
  /** Jenis pesanan: PO / Ready Stock / Made to Order. */
  kind: OrderKind
  /** Dikemas dengan Birthday Box (template Olshop). */
  birthdayBox: boolean
  /** No. invoice Shopee/Tokopedia; selalu tampil di kartu Packaging. */
  marketplaceOrderNo: string | null
  /** Sumber pesanan: WhatsApp, Shopee, Tokopedia. */
  channel: OrderChannel
  customerName: string
  senderName: string | null
  phone: string | null
  address: string | null
  deliveryDate: string
  shippingMethod: ShippingMethod
  /** Nama kategori pengiriman (Master Data), mis. "Sameday"; null untuk data lama. */
  shippingName: string | null
  request: string | null
  note: string | null
  urgentAt: Date | null
  urgentNote: string | null
  /** Kartu ucapan: wajib ditulis tim packing (permintaan pemilik toko, 14 Nov 2026). */
  cardTo: string | null
  cardWishes: string | null
  cardFrom: string | null
  items: {
    menuName: string
    size: "large" | "regular" | "single"
    qty: number
    note: string | null
  }[]
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
      categoryId: packagings.categoryId,
      categoryName: packagingCategories.name,
      categorySort: packagingCategories.sortOrder,
    })
    .from(packagings)
    .leftJoin(packagingCategories, eq(packagingCategories.id, packagings.categoryId))
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
      customer: { columns: { phone: true } },
      shipment: {
        columns: { method: true, address: true },
        with: { option: { columns: { name: true } } },
      },
      items: {
        columns: { qty: true, note: true },
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
    kind: row.kind,
    birthdayBox: row.birthdayBox,
    channel: row.channel,
    marketplaceOrderNo: row.marketplaceOrderNo,
    customerName: row.customerName,
    senderName: row.senderName,
    phone: row.customer?.phone ?? null,
    address: row.shipment?.address ?? null,
    deliveryDate: row.deliveryDate,
    shippingMethod: row.shipment?.method ?? "kurir_internal",
    shippingName: row.shipment?.option?.name ?? null,
    request: row.request,
    note: row.note,
    urgentAt: row.urgentAt,
    urgentNote: row.urgentNote,
    packagingType: row.packagingType,
    cardTo: row.cardTo,
    cardWishes: row.cardWishes,
    cardFrom: row.cardFrom,
    items: row.items.map((item) => ({
      menuName: item.variant.menu.name,
      size: item.variant.size,
      qty: item.qty,
      note: item.note,
    })),
    used: netUsage(
      movements.filter((movement) => movement.orderId === row.id),
      order,
    ),
  }))
}
