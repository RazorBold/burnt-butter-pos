import "server-only"

import { and, asc, count, desc, eq, gte, sql } from "drizzle-orm"

import { getDb } from "@/db"
import { packagingCategories, packagings, profiles, stockMovements } from "@/db/schema"
import { toJakartaDateString } from "@/lib/format"

import { type StockStatus, stockStatus } from "./stock"

export type PackagingRow = {
  id: string
  name: string
  photoPath: string | null
  stock: number
  capacity: number | null
  minStock: number | null
  unit: string
  categoryId: string | null
  categoryName: string | null
  categorySort: number | null
  status: StockStatus
}

export type PackagingCategoryRow = {
  id: string
  name: string
  sortOrder: number
  /** Jenis stok aktif di kategori ini. */
  itemCount: number
}

/** Kategori stok packaging, urut sesuai pengaturan Owner. */
export async function listPackagingCategories(): Promise<PackagingCategoryRow[]> {
  return getDb()
    .select({
      id: packagingCategories.id,
      name: packagingCategories.name,
      sortOrder: packagingCategories.sortOrder,
      itemCount: count(packagings.id),
    })
    .from(packagingCategories)
    .leftJoin(
      packagings,
      and(eq(packagings.categoryId, packagingCategories.id), eq(packagings.isActive, true)),
    )
    .groupBy(packagingCategories.id)
    .orderBy(asc(packagingCategories.sortOrder), asc(packagingCategories.name))
}

/**
 * Packaging aktif (yang diarsipkan tidak ikut): urut kategori (tanpa kategori paling bawah), lalu
 * urut dibuat. Status dihitung dari stok minimum.
 */
export async function listPackagings(): Promise<PackagingRow[]> {
  const rows = await getDb()
    .select({
      id: packagings.id,
      name: packagings.name,
      photoPath: packagings.photoPath,
      stock: packagings.stock,
      capacity: packagings.capacity,
      minStock: packagings.minStock,
      unit: packagings.unit,
      categoryId: packagings.categoryId,
      categoryName: packagingCategories.name,
      categorySort: packagingCategories.sortOrder,
    })
    .from(packagings)
    .leftJoin(packagingCategories, eq(packagingCategories.id, packagings.categoryId))
    .where(eq(packagings.isActive, true))
    .orderBy(
      sql`${packagingCategories.sortOrder} asc nulls last`,
      asc(packagings.createdAt),
      asc(packagings.name),
    )
  return rows.map((row) => ({ ...row, status: stockStatus(row.stock, row.minStock) }))
}

export const MOVEMENT_PAGE_SIZE = 10

export type StockMovementRow = {
  id: string
  packagingName: string
  unit: string
  direction: "in" | "out"
  qty: number
  note: string | null
  createdAt: Date
  createdByName: string | null
}

/** Riwayat stok packaging, terbaru di atas, 10 per halaman. */
export async function listPackagingMovements({
  packagingId,
  page,
}: {
  packagingId?: string
  page: number
}) {
  const db = getDb()
  const where = and(
    eq(stockMovements.itemType, "packaging"),
    packagingId ? eq(stockMovements.itemId, packagingId) : undefined,
  )
  const [{ total }] = await db.select({ total: count() }).from(stockMovements).where(where)
  const pageCount = Math.max(1, Math.ceil(total / MOVEMENT_PAGE_SIZE))
  const current = Math.min(Math.max(1, page), pageCount)

  const rows: StockMovementRow[] = await db
    .select({
      id: stockMovements.id,
      packagingName: packagings.name,
      unit: packagings.unit,
      direction: stockMovements.direction,
      qty: stockMovements.qty,
      note: stockMovements.note,
      createdAt: stockMovements.createdAt,
      createdByName: profiles.name,
    })
    .from(stockMovements)
    .innerJoin(packagings, eq(packagings.id, stockMovements.itemId))
    .leftJoin(profiles, eq(profiles.id, stockMovements.createdBy))
    .where(where)
    .orderBy(desc(stockMovements.createdAt))
    .limit(MOVEMENT_PAGE_SIZE)
    .offset((current - 1) * MOVEMENT_PAGE_SIZE)

  return { rows, total, page: current, pageCount }
}

/** Total packaging masuk dan keluar hari ini (WIB), semua jenis. */
export async function getTodayPackagingFlow(): Promise<{ in: number; out: number }> {
  const today = toJakartaDateString(new Date())
  const [row] = await getDb()
    .select({
      in: sql<number>`coalesce(sum(${stockMovements.qty}) filter (where ${stockMovements.direction} = 'in'), 0)`.mapWith(
        Number,
      ),
      out: sql<number>`coalesce(sum(${stockMovements.qty}) filter (where ${stockMovements.direction} = 'out'), 0)`.mapWith(
        Number,
      ),
    })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.itemType, "packaging"),
        gte(stockMovements.createdAt, new Date(`${today}T00:00:00+07:00`)),
      ),
    )
  return row
}
