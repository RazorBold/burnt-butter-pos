// Pengelompokan stok packaging per kategori (diatur Owner). Murni supaya bisa diuji dan dipakai di
// halaman Stok Packaging (server) maupun dialog packing Hampers (klien).

import type { StockStatus } from "./stock"

export type PackagingCategoryRef = { id: string; name: string }

export type Categorized = {
  categoryId: string | null
  categoryName: string | null
  categorySort: number | null
}

export type CategoryGroup<T> = { key: string; title: string; items: T[] }

export const UNCATEGORIZED = "Lainnya"

/** Kelompok sesuai urutan kategori; item tanpa kategori di kelompok "Lainnya" paling bawah. */
export function groupByCategory<T extends Categorized>(items: T[]): CategoryGroup<T>[] {
  const groups = new Map<string, { title: string; sort: number; items: T[] }>()
  for (const item of items) {
    const key = item.categoryId ?? "lain"
    let group = groups.get(key)
    if (!group) {
      group = {
        title: item.categoryName ?? UNCATEGORIZED,
        sort: item.categoryId ? (item.categorySort ?? 0) : Number.MAX_SAFE_INTEGER,
        items: [],
      }
      groups.set(key, group)
    }
    group.items.push(item)
  }
  return [...groups]
    .sort(([, a], [, b]) => a.sort - b.sort || a.title.localeCompare(b.title))
    .map(([key, group]) => ({ key, title: group.title, items: group.items }))
}

export type CategoryStockSummary = {
  key: string
  title: string
  stock: number
  capacity: number | null
  status: StockStatus
  itemCount: number
}

/** Ringkasan stok per kategori untuk widget ringkas di dashboard. */
export function summarizeCategories<
  T extends Categorized & { stock: number; capacity?: number | null; status: StockStatus },
>(items: T[]): CategoryStockSummary[] {
  const groups = groupByCategory(items)
  return groups.map((group) => {
    const totalStock = group.items.reduce((sum, item) => sum + item.stock, 0)
    const hasCapacity = group.items.some(
      (item) => item.capacity !== null && item.capacity !== undefined,
    )
    const totalCapacity = hasCapacity
      ? group.items.reduce((sum, item) => sum + (item.capacity ?? 0), 0)
      : null

    const hasHabis = group.items.some((item) => item.status === "habis")
    const hasMenipis = group.items.some((item) => item.status === "menipis")
    const status: StockStatus = hasHabis ? "habis" : hasMenipis ? "menipis" : "cukup"

    return {
      key: group.key,
      title: group.title,
      stock: totalStock,
      capacity: totalCapacity,
      status,
      itemCount: group.items.length,
    }
  })
}
