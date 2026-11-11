import "server-only"

import { and, eq, inArray, sql } from "drizzle-orm"

import { getDb } from "@/db"
import {
  menuCategories,
  menus,
  menuVariants,
  orderItems,
  packagings,
  stockMovements,
} from "@/db/schema"

import { ensureLoyangItems } from "./loyang"
import { hampersBoxName } from "./stock-needs"
import { isHampersCategory } from "@/features/orders/order-type"

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0]
type OrderRef = { id: string; orderNo: string }

/**
 * Potong stok loyang (Large & Regular) dan box packaging hampers saat pesanan TERBAYAR (LUNAS).
 * Idempoten: aman dipanggil berulang kali untuk pesanan yang sama.
 */
export async function deductOrderStock(tx: Tx, paidOrders: OrderRef[], userId: string) {
  if (paidOrders.length === 0) return

  const loyangMap = await ensureLoyangItems(tx)
  const orderIds = paidOrders.map((o) => o.id)

  // Ambil semua item menu untuk pesanan yang dibayar
  const items = await tx
    .select({
      orderId: orderItems.orderId,
      menuName: menus.name,
      categoryName: menuCategories.name,
      size: menuVariants.size,
      qty: orderItems.qty,
    })
    .from(orderItems)
    .innerJoin(menuVariants, eq(menuVariants.id, orderItems.menuVariantId))
    .innerJoin(menus, eq(menus.id, menuVariants.menuId))
    .leftJoin(menuCategories, eq(menuCategories.id, menus.categoryId))
    .where(inArray(orderItems.orderId, orderIds))

  // Ambil semua box packaging edisi hampers yang ada di DB
  const boxRows = await tx
    .select({ id: packagings.id, name: packagings.name })
    .from(packagings)
    .where(
      inArray(sql`lower(${packagings.name})`, [
        "classic red (large)",
        "classic red (regular)",
        "mac & joy (large)",
        "mac & joy (regular)",
        "melted cheese (large)",
        "melted cheese (regular)",
        "holy e olio (large)",
        "holy e olio (regular)",
      ]),
    )

  const boxMap = new Map<string, string>()
  for (const b of boxRows) {
    boxMap.set(b.name.toLowerCase(), b.id)
  }

  // Hitung kebutuhan per order: loyang Large/Regular, dan box hampers
  // orderId -> Map<itemId, { name: string; qty: number }>
  const requiredByOrder = new Map<string, Map<string, { name: string; qty: number }>>()

  for (const item of items) {
    const orderReq =
      requiredByOrder.get(item.orderId) ?? new Map<string, { name: string; qty: number }>()

    // 1. Loyang
    if (item.size === "large") {
      const cur = orderReq.get(loyangMap.large.id) ?? { name: loyangMap.large.name, qty: 0 }
      cur.qty += item.qty
      orderReq.set(loyangMap.large.id, cur)
    } else if (item.size === "regular") {
      const cur = orderReq.get(loyangMap.regular.id) ?? { name: loyangMap.regular.name, qty: 0 }
      cur.qty += item.qty
      orderReq.set(loyangMap.regular.id, cur)
    }

    // 2. Box Hampers: hanya menu di kategori Hampers. Menu pasta biasa (mis. "Spaghetti Classico",
    // "Melt My Mac", "Aglio E Olio") tidak boleh ikut memotong box walau namanya mirip.
    const isHampersMenu = isHampersCategory(item.categoryName)
    if (isHampersMenu && (item.size === "large" || item.size === "regular")) {
      const boxName = hampersBoxName(item.menuName, item.size)
      if (boxName) {
        const boxId = boxMap.get(boxName.toLowerCase())
        if (boxId) {
          const cur = orderReq.get(boxId) ?? { name: boxName, qty: 0 }
          cur.qty += item.qty
          orderReq.set(boxId, cur)
        }
      }
    }

    requiredByOrder.set(item.orderId, orderReq)
  }

  // Kumpulkan semua item ID yang relevan
  const allItemIds = new Set<string>([
    loyangMap.large.id,
    loyangMap.regular.id,
    ...boxRows.map((b) => b.id),
  ])

  // Cek mutasi yang sudah pernah ada untuk pesanan-pesanan ini (idempoten)
  const existingMovements = await tx
    .select({
      orderId: stockMovements.orderId,
      itemId: stockMovements.itemId,
      direction: stockMovements.direction,
      qty: stockMovements.qty,
    })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.itemType, "packaging"),
        inArray(stockMovements.itemId, Array.from(allItemIds)),
        inArray(stockMovements.orderId, orderIds),
      ),
    )

  // orderId:itemId -> net deducted qty
  const netDeducted = new Map<string, number>()
  for (const m of existingMovements) {
    if (!m.orderId) continue
    const key = `${m.orderId}:${m.itemId}`
    const cur = netDeducted.get(key) ?? 0
    const delta = m.direction === "out" ? m.qty : -m.qty
    netDeducted.set(key, cur + delta)
  }

  const totalDeductionByItem = new Map<string, number>()
  const newMovements: (typeof stockMovements.$inferInsert)[] = []

  for (const order of paidOrders) {
    const orderReq = requiredByOrder.get(order.id)
    if (!orderReq) continue

    for (const [itemId, { name, qty }] of orderReq) {
      const key = `${order.id}:${itemId}`
      const already = netDeducted.get(key) ?? 0
      const needed = Math.max(0, qty - already)

      if (needed > 0) {
        const cur = totalDeductionByItem.get(itemId) ?? 0
        totalDeductionByItem.set(itemId, cur + needed)
        newMovements.push({
          itemType: "packaging",
          itemId,
          direction: "out",
          qty: needed,
          orderId: order.id,
          note: `Pesanan ${order.orderNo} lunas (${needed} ${name})`,
          createdBy: userId,
        })
      }
    }
  }

  if (newMovements.length > 0) {
    await tx.insert(stockMovements).values(newMovements)
    for (const [itemId, deduction] of totalDeductionByItem) {
      await tx
        .update(packagings)
        .set({ stock: sql`${packagings.stock} - ${deduction}` })
        .where(eq(packagings.id, itemId))
    }
  }
}

/**
 * Kembalikan stok loyang dan box saat pesanan dibatalkan atau pembayaran dibatalkan.
 */
export async function returnOrderStock(
  tx: Tx,
  unpaidOrders: OrderRef[],
  userId: string,
  reason: (orderNo: string) => string,
) {
  if (unpaidOrders.length === 0) return

  const loyangMap = await ensureLoyangItems(tx)
  const orderIds = unpaidOrders.map((o) => o.id)

  const boxRows = await tx
    .select({ id: packagings.id })
    .from(packagings)
    .where(
      inArray(sql`lower(${packagings.name})`, [
        "classic red (large)",
        "classic red (regular)",
        "mac & joy (large)",
        "mac & joy (regular)",
        "melted cheese (large)",
        "melted cheese (regular)",
        "holy e olio (large)",
        "holy e olio (regular)",
      ]),
    )

  const allItemIds = [loyangMap.large.id, loyangMap.regular.id, ...boxRows.map((b) => b.id)]

  const existingMovements = await tx
    .select({
      orderId: stockMovements.orderId,
      itemId: stockMovements.itemId,
      direction: stockMovements.direction,
      qty: stockMovements.qty,
    })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.itemType, "packaging"),
        inArray(stockMovements.itemId, allItemIds),
        inArray(stockMovements.orderId, orderIds),
      ),
    )

  const netDeducted = new Map<string, number>()
  for (const m of existingMovements) {
    if (!m.orderId) continue
    const key = `${m.orderId}:${m.itemId}`
    const cur = netDeducted.get(key) ?? 0
    const delta = m.direction === "out" ? m.qty : -m.qty
    netDeducted.set(key, cur + delta)
  }

  const totalReturnByItem = new Map<string, number>()
  const newMovements: (typeof stockMovements.$inferInsert)[] = []

  for (const order of unpaidOrders) {
    for (const itemId of allItemIds) {
      const key = `${order.id}:${itemId}`
      const net = netDeducted.get(key) ?? 0
      if (net > 0) {
        const cur = totalReturnByItem.get(itemId) ?? 0
        totalReturnByItem.set(itemId, cur + net)
        newMovements.push({
          itemType: "packaging",
          itemId,
          direction: "in",
          qty: net,
          orderId: order.id,
          note: reason(order.orderNo),
          createdBy: userId,
        })
      }
    }
  }

  if (newMovements.length > 0) {
    await tx.insert(stockMovements).values(newMovements)
    for (const [itemId, returned] of totalReturnByItem) {
      await tx
        .update(packagings)
        .set({ stock: sql`${packagings.stock} + ${returned}` })
        .where(eq(packagings.id, itemId))
    }
  }
}
