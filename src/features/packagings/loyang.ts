import "server-only"

import { and, eq, gte, inArray, sql } from "drizzle-orm"

import { getDb } from "@/db"
import { menuVariants, orderItems, packagingCategories, packagings, stockMovements } from "@/db/schema"
import { toJakartaDateString } from "@/lib/format"

import {
  calculateLoyangReturn,
  calculateNetLoyangDeduction,
  LOYANG_LARGE_NAME,
  LOYANG_NAMES,
  LOYANG_REGULAR_NAME,
} from "./loyang-logic"
import { type StockStatus, stockStatus } from "./stock"

export {
  calculateLoyangReturn,
  calculateNetLoyangDeduction,
  LOYANG_LARGE_NAME,
  LOYANG_NAMES,
  LOYANG_REGULAR_NAME,
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0]
type OrderRef = { id: string; orderNo: string }
export type LoyangSize = "large" | "regular"

export type LoyangItemRef = { id: string; name: string; stock: number; unit: string }
export type LoyangItemsMap = {
  large: LoyangItemRef
  regular: LoyangItemRef
}

/**
 * Pastikan item "Loyang Large" dan "Loyang Regular" beserta kategorinya sudah ada di database.
 */
export async function ensureLoyangItems(
  db: ReturnType<typeof getDb> | Tx = getDb(),
): Promise<LoyangItemsMap> {
  let [category] = await db
    .select({ id: packagingCategories.id })
    .from(packagingCategories)
    .where(sql`lower(${packagingCategories.name}) = 'loyang'`)
    .limit(1)

  if (!category) {
    const insertedCategories = await db
      .insert(packagingCategories)
      .values({ name: "Loyang", sortOrder: 0 })
      .onConflictDoNothing()
      .returning({ id: packagingCategories.id })
    if (insertedCategories.length > 0) {
      category = insertedCategories[0]
    } else {
      ;[category] = await db
        .select({ id: packagingCategories.id })
        .from(packagingCategories)
        .where(sql`lower(${packagingCategories.name}) = 'loyang'`)
        .limit(1)
    }
  }

  // Cek apakah ada item lama bernama "Loyang" tanpa ukuran
  const [generic] = await db
    .select({ id: packagings.id, name: packagings.name, stock: packagings.stock })
    .from(packagings)
    .where(sql`lower(${packagings.name}) = 'loyang'`)
    .limit(1)

  const [largeExisting] = await db
    .select({ id: packagings.id, name: packagings.name, stock: packagings.stock })
    .from(packagings)
    .where(sql`lower(${packagings.name}) = ${LOYANG_LARGE_NAME.toLowerCase()}`)
    .limit(1)

  if (generic && !largeExisting) {
    // Migrasikan item generic "Loyang" menjadi "Loyang Large" agar stok yang sudah diinput tidak hilang
    await db
      .update(packagings)
      .set({ name: LOYANG_LARGE_NAME, categoryId: category?.id ?? null })
      .where(eq(packagings.id, generic.id))
  }

  // Pastikan Loyang Large dan Loyang Regular ada
  for (const name of [LOYANG_LARGE_NAME, LOYANG_REGULAR_NAME]) {
    await db
      .insert(packagings)
      .values({
        name,
        unit: "loyang",
        stock: 0,
        minStock: 10,
        capacity: 50,
        categoryId: category?.id ?? null,
        isActive: true,
      })
      .onConflictDoNothing({ target: packagings.name })
  }

  const rows = await db
    .select({
      id: packagings.id,
      name: packagings.name,
      stock: packagings.stock,
      unit: packagings.unit,
    })
    .from(packagings)
    .where(
      inArray(
        sql`lower(${packagings.name})`,
        [LOYANG_LARGE_NAME.toLowerCase(), LOYANG_REGULAR_NAME.toLowerCase()],
      ),
    )

  const large = rows.find((r) => r.name.toLowerCase() === LOYANG_LARGE_NAME.toLowerCase())!
  const regular = rows.find((r) => r.name.toLowerCase() === LOYANG_REGULAR_NAME.toLowerCase())!

  return { large, regular }
}

/**
 * Potong stok loyang saat pesanan berubah menjadi Selesai.
 * Item menu Large memotong Loyang Large; item menu Regular memotong Loyang Regular.
 */
export async function deductLoyang(
  tx: Tx,
  completedOrders: OrderRef[],
  userId: string,
) {
  if (completedOrders.length === 0) return
  const loyangMap = await ensureLoyangItems(tx)

  // Ambil item menu yang ukurannya large atau regular
  const items = await tx
    .select({
      orderId: orderItems.orderId,
      size: menuVariants.size,
      qty: orderItems.qty,
    })
    .from(orderItems)
    .innerJoin(menuVariants, eq(menuVariants.id, orderItems.menuVariantId))
    .where(
      and(
        inArray(
          orderItems.orderId,
          completedOrders.map((o) => o.id),
        ),
        inArray(menuVariants.size, ["large", "regular"]),
      ),
    )

  const qtyByOrderAndSize = new Map<string, { large: number; regular: number }>()
  for (const item of items) {
    const cur = qtyByOrderAndSize.get(item.orderId) ?? { large: 0, regular: 0 }
    if (item.size === "large") cur.large += item.qty
    else if (item.size === "regular") cur.regular += item.qty
    qtyByOrderAndSize.set(item.orderId, cur)
  }

  const loyangIds = [loyangMap.large.id, loyangMap.regular.id]

  // Cek mutasi loyang yang sudah pernah tercatat untuk pesanan ini (idempoten)
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
        inArray(stockMovements.itemId, loyangIds),
        inArray(
          stockMovements.orderId,
          completedOrders.map((o) => o.id),
        ),
      ),
    )

  const movementsByKey = new Map<string, { direction: "in" | "out"; qty: number }[]>()
  for (const m of existingMovements) {
    if (!m.orderId) continue
    const key = `${m.orderId}:${m.itemId}`
    const list = movementsByKey.get(key) ?? []
    list.push({ direction: m.direction, qty: m.qty })
    movementsByKey.set(key, list)
  }

  const totalDeductionByItem = new Map<string, number>()
  const newMovements: (typeof stockMovements.$inferInsert)[] = []

  for (const order of completedOrders) {
    const orderQty = qtyByOrderAndSize.get(order.id) ?? { large: 0, regular: 0 }

    for (const size of ["large", "regular"] as const) {
      const required = orderQty[size]
      if (required <= 0) continue

      const loyangItem = loyangMap[size]
      const key = `${order.id}:${loyangItem.id}`
      const prev = movementsByKey.get(key) ?? []
      const needed = calculateNetLoyangDeduction(required, prev)

      if (needed > 0) {
        const curTotal = totalDeductionByItem.get(loyangItem.id) ?? 0
        totalDeductionByItem.set(loyangItem.id, curTotal + needed)
        newMovements.push({
          itemType: "packaging",
          itemId: loyangItem.id,
          direction: "out",
          qty: needed,
          orderId: order.id,
          note: `Pesanan ${order.orderNo} selesai (${needed} ${loyangItem.name})`,
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
 * Kembalikan stok loyang bila pesanan dibatalkan atau statusnya diubah mundur dari Selesai.
 */
export async function returnLoyang(
  tx: Tx,
  uncompletedOrders: OrderRef[],
  userId: string,
  reason: (orderNo: string) => string,
) {
  if (uncompletedOrders.length === 0) return
  const loyangMap = await ensureLoyangItems(tx)
  const loyangIds = [loyangMap.large.id, loyangMap.regular.id]

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
        inArray(stockMovements.itemId, loyangIds),
        inArray(
          stockMovements.orderId,
          uncompletedOrders.map((o) => o.id),
        ),
      ),
    )

  const movementsByKey = new Map<string, { direction: "in" | "out"; qty: number }[]>()
  for (const m of existingMovements) {
    if (!m.orderId) continue
    const key = `${m.orderId}:${m.itemId}`
    const list = movementsByKey.get(key) ?? []
    list.push({ direction: m.direction, qty: m.qty })
    movementsByKey.set(key, list)
  }

  const totalReturnByItem = new Map<string, number>()
  const newMovements: (typeof stockMovements.$inferInsert)[] = []

  for (const order of uncompletedOrders) {
    for (const size of ["large", "regular"] as const) {
      const loyangItem = loyangMap[size]
      const key = `${order.id}:${loyangItem.id}`
      const prev = movementsByKey.get(key) ?? []
      const toReturn = calculateLoyangReturn(prev)

      if (toReturn > 0) {
        const curTotal = totalReturnByItem.get(loyangItem.id) ?? 0
        totalReturnByItem.set(loyangItem.id, curTotal + toReturn)
        newMovements.push({
          itemType: "packaging",
          itemId: loyangItem.id,
          direction: "in",
          qty: toReturn,
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

export type LoyangSummaryItem = {
  id: string
  name: string
  size: LoyangSize
  stock: number
  capacity: number | null
  unit: string
  status: StockStatus
  inToday: number
  outToday: number
}

export type LoyangSummary = {
  large: LoyangSummaryItem
  regular: LoyangSummaryItem
}

/**
 * Ringkasan stok loyang Large dan Regular hari ini untuk Dashboard.
 */
export async function getLoyangSummary(
  db: ReturnType<typeof getDb> | Tx = getDb(),
): Promise<LoyangSummary> {
  const items = await ensureLoyangItems(db)
  const today = toJakartaDateString(new Date())
  const ids = [items.large.id, items.regular.id]

  const flows = await db
    .select({
      itemId: stockMovements.itemId,
      inToday: sql<number>`coalesce(sum(${stockMovements.qty}) filter (where ${stockMovements.direction} = 'in'), 0)`.mapWith(Number),
      outToday: sql<number>`coalesce(sum(${stockMovements.qty}) filter (where ${stockMovements.direction} = 'out'), 0)`.mapWith(Number),
    })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.itemType, "packaging"),
        inArray(stockMovements.itemId, ids),
        gte(stockMovements.createdAt, new Date(`${today}T00:00:00+07:00`)),
      ),
    )
    .groupBy(stockMovements.itemId)

  const flowMap = new Map(flows.map((f) => [f.itemId, f]))

  const currentRows = await db
    .select({
      id: packagings.id,
      stock: packagings.stock,
      minStock: packagings.minStock,
      capacity: packagings.capacity,
      unit: packagings.unit,
      name: packagings.name,
    })
    .from(packagings)
    .where(inArray(packagings.id, ids))

  const currentMap = new Map(currentRows.map((r) => [r.id, r]))

  const build = (size: LoyangSize): LoyangSummaryItem => {
    const item = items[size]
    const cur = currentMap.get(item.id)
    const stock = cur?.stock ?? item.stock
    const minStock = cur?.minStock ?? null
    const flow = flowMap.get(item.id)
    return {
      id: item.id,
      name: item.name,
      size,
      stock,
      capacity: cur?.capacity ?? null,
      unit: cur?.unit ?? "loyang",
      status: stockStatus(stock, minStock),
      inToday: flow?.inToday ?? 0,
      outToday: flow?.outToday ?? 0,
    }
  }

  return {
    large: build("large"),
    regular: build("regular"),
  }
}
