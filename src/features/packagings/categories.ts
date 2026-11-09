// Pengelompokan stok packaging per kategori (diatur Owner). Murni supaya bisa diuji dan dipakai di
// halaman Stok Packaging (server) maupun dialog packing Hampers (klien).

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
