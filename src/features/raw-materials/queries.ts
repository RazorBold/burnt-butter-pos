import "server-only"

import { and, asc, count, desc, eq } from "drizzle-orm"

import { getDb } from "@/db"
import { profiles, rawMaterials, stockMovements } from "@/db/schema"
import { type StockStatus, stockStatus } from "@/features/packagings/stock"

export type RawMaterialRow = {
  id: string
  name: string
  unit: string
  stock: number
  minStock: number
  status: StockStatus
}

/** Semua bahan baku, urut seperti desain (urutan dibuat). Status dihitung dari stok minimum. */
export async function listRawMaterials(): Promise<RawMaterialRow[]> {
  const rows = await getDb()
    .select({
      id: rawMaterials.id,
      name: rawMaterials.name,
      unit: rawMaterials.unit,
      stock: rawMaterials.stock,
      minStock: rawMaterials.minStock,
    })
    .from(rawMaterials)
    .orderBy(asc(rawMaterials.createdAt), asc(rawMaterials.name))
  return rows.map((row) => ({ ...row, status: stockStatus(row.stock, row.minStock) }))
}

export const RAW_MOVEMENT_PAGE_SIZE = 10

export type RawMaterialMovementRow = {
  id: string
  itemName: string
  unit: string
  direction: "in" | "out"
  qty: number
  note: string | null
  createdAt: Date
  createdByName: string | null
}

/** Riwayat stok bahan baku, terbaru di atas, 10 per halaman. */
export async function listRawMaterialMovements({
  rawMaterialId,
  page,
}: {
  rawMaterialId?: string
  page: number
}) {
  const db = getDb()
  const where = and(
    eq(stockMovements.itemType, "raw_material"),
    rawMaterialId ? eq(stockMovements.itemId, rawMaterialId) : undefined,
  )
  const [{ total }] = await db.select({ total: count() }).from(stockMovements).where(where)
  const pageCount = Math.max(1, Math.ceil(total / RAW_MOVEMENT_PAGE_SIZE))
  const current = Math.min(Math.max(1, page), pageCount)

  const rows: RawMaterialMovementRow[] = await db
    .select({
      id: stockMovements.id,
      itemName: rawMaterials.name,
      unit: rawMaterials.unit,
      direction: stockMovements.direction,
      qty: stockMovements.qty,
      note: stockMovements.note,
      createdAt: stockMovements.createdAt,
      createdByName: profiles.name,
    })
    .from(stockMovements)
    .innerJoin(rawMaterials, eq(rawMaterials.id, stockMovements.itemId))
    .leftJoin(profiles, eq(profiles.id, stockMovements.createdBy))
    .where(where)
    .orderBy(desc(stockMovements.createdAt))
    .limit(RAW_MOVEMENT_PAGE_SIZE)
    .offset((current - 1) * RAW_MOVEMENT_PAGE_SIZE)

  return { rows, total, page: current, pageCount }
}
