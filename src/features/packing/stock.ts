import "server-only"

import { and, asc, eq, inArray, sql } from "drizzle-orm"

import type { getDb } from "@/db"
import { packagings, stockMovements } from "@/db/schema"

import { firstShortage, netUsage, type PackagingUse } from "./needs"

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0]
type OrderRef = { id: string; orderNo: string }

/**
 * Kunci baris packaging yang dipakai (urut id supaya transaksi bersamaan tidak saling kunci).
 * `activeOnly`: packaging arsip tidak boleh dipakai packing baru, tapi stoknya tetap bisa
 * dikembalikan.
 */
async function lockPackagings(tx: Tx, ids: string[], activeOnly = false) {
  if (ids.length === 0) return new Map<string, { name: string; stock: number; unit: string }>()
  const rows = await tx
    .select({
      id: packagings.id,
      name: packagings.name,
      stock: packagings.stock,
      unit: packagings.unit,
    })
    .from(packagings)
    .where(and(inArray(packagings.id, ids), activeOnly ? eq(packagings.isActive, true) : undefined))
    .orderBy(asc(packagings.id))
    .for("update")
  return new Map(rows.map(({ id, ...row }) => [id, row]))
}

/**
 * Potong stok packaging untuk pesanan yang selesai di-packing. `usage` = packaging yang diisi
 * admin di dialog packing (pesanan tanpa isian tidak memotong stok). Pesanan yang stoknya
 * kurang dilewati dengan alasannya, sisanya tetap dipotong.
 */
export async function deductPacking(
  tx: Tx,
  orders: OrderRef[],
  userId: string,
  usage: Record<string, PackagingUse[]> = {},
): Promise<{ packed: Set<string>; skipped: { id: string; reason: string }[] }> {
  const usesOf = (id: string) => usage[id] ?? []

  const ids = [...new Set(orders.flatMap((order) => usesOf(order.id).map((u) => u.packagingId)))]
  const stock = await lockPackagings(tx, ids, true)
  const packed = new Set<string>()
  const skipped: { id: string; reason: string }[] = []
  const movements: (typeof stockMovements.$inferInsert)[] = []

  for (const order of [...orders].sort((a, b) => a.orderNo.localeCompare(b.orderNo))) {
    const uses = usesOf(order.id).filter((use) => use.qty > 0)
    const shortage = firstShortage(uses, stock)
    if (shortage) {
      skipped.push({ id: order.id, reason: shortage })
      continue
    }
    for (const use of uses) {
      stock.get(use.packagingId)!.stock -= use.qty
      movements.push({
        itemType: "packaging",
        itemId: use.packagingId,
        direction: "out",
        qty: use.qty,
        orderId: order.id,
        note: `Packing ${order.orderNo}`,
        createdBy: userId,
      })
    }
    packed.add(order.id)
  }

  await saveStock(tx, stock, movements)
  return { packed, skipped }
}

/**
 * Kembalikan stok packaging yang terpotong pesanan ini (packing dibatalkan atau pesanan
 * dibatalkan). Dihitung dari riwayat stok, jadi aman dipanggil untuk pesanan yang belum pernah
 * di-packing (tidak ada yang dikembalikan).
 */
export async function returnPacking(
  tx: Tx,
  orders: OrderRef[],
  userId: string,
  reason: (orderNo: string) => string,
) {
  if (orders.length === 0) return
  const rows = await tx
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
        // Hanya potongan dari dialog packing (catatan "Packing …"). Loyang dan box yang terpotong
        // saat Lunas dikembalikan lewat returnOrderStock saat pembayaran/pesanan dibatalkan.
        sql`${stockMovements.note} like 'Packing %'`,
        inArray(
          stockMovements.orderId,
          orders.map((order) => order.id),
        ),
      ),
    )
  const usedBy = new Map(
    orders.map((order) => [order, netUsage(rows.filter((row) => row.orderId === order.id))]),
  )
  const ids = [...new Set([...usedBy.values()].flatMap((uses) => uses.map((u) => u.packagingId)))]
  if (ids.length === 0) return

  const stock = await lockPackagings(tx, ids)
  const movements: (typeof stockMovements.$inferInsert)[] = []
  for (const [order, uses] of usedBy) {
    for (const use of uses) {
      const item = stock.get(use.packagingId)
      if (!item) continue // packaging sudah dihapus
      item.stock += use.qty
      movements.push({
        itemType: "packaging",
        itemId: use.packagingId,
        direction: "in",
        qty: use.qty,
        orderId: order.id,
        note: reason(order.orderNo),
        createdBy: userId,
      })
    }
  }
  await saveStock(tx, stock, movements)
}

async function saveStock(
  tx: Tx,
  stock: Map<string, { stock: number }>,
  movements: (typeof stockMovements.$inferInsert)[],
) {
  if (movements.length === 0) return
  const changed = new Set(movements.map((movement) => movement.itemId))
  for (const id of changed) {
    await tx
      .update(packagings)
      .set({ stock: stock.get(id)!.stock, updatedAt: sql`now()` })
      .where(eq(packagings.id, id))
  }
  await tx.insert(stockMovements).values(movements)
}
