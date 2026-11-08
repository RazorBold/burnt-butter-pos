// Katalog menu untuk form pesanan, dan pencocokan hasil parser WA ke varian menu.
// Murni (tanpa DB) supaya bisa dipakai di klien dan diuji.

import type { ParsedItem } from "@/lib/wa-parser"

export type CatalogVariant = {
  id: string
  menuName: string
  /** Kategori menu (diatur Owner): urutan kelompok di form, dan berukuran atau tidak. */
  categoryId: string
  categoryName: string
  categorySort: number
  sized: boolean
  size: "large" | "regular" | "single"
  price: number
  photoPath: string | null
}

export type CatalogGroup = { key: string; title: string; variants: CatalogVariant[] }

const SIZE_TITLE = { large: "Large", regular: "Regular" } as const

/**
 * Kelompok menu sesuai urutan kategori (seperti template WA): kategori berukuran dipecah jadi
 * Large dan Regular, kategori lain satu kelompok bernama kategorinya. Bila ada lebih dari satu
 * kategori berukuran, judulnya diberi nama kategori ("Event Large") supaya tidak kembar.
 */
export function groupCatalog(catalog: CatalogVariant[]): CatalogGroup[] {
  const categories = new Map<string, { name: string; sort: number; sized: boolean }>()
  for (const variant of catalog) {
    if (!categories.has(variant.categoryId)) {
      categories.set(variant.categoryId, {
        name: variant.categoryName,
        sort: variant.categorySort,
        sized: variant.sized,
      })
    }
  }
  const ordered = [...categories].sort(
    ([, a], [, b]) => a.sort - b.sort || a.name.localeCompare(b.name),
  )
  const sizedCount = ordered.filter(([, category]) => category.sized).length

  const groups: CatalogGroup[] = []
  for (const [id, category] of ordered) {
    const inCategory = catalog.filter((variant) => variant.categoryId === id)
    if (category.sized) {
      for (const size of ["large", "regular"] as const) {
        groups.push({
          key: `${id}-${size}`,
          title: sizedCount > 1 ? `${category.name} ${SIZE_TITLE[size]}` : SIZE_TITLE[size],
          variants: inCategory.filter((variant) => variant.size === size),
        })
      }
    } else {
      groups.push({ key: id, title: category.name, variants: inCategory })
    }
  }
  return groups.filter((group) => group.variants.length > 0)
}

function normalize(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/**
 * Cocokkan item hasil parser ke varian katalog: nama (tanpa spasi/tanda baca) + ukuran.
 * Bila menu hanya punya satu varian, ukurannya tidak perlu cocok (mis. Choco Bon Bon).
 * Nama yang ditulis sebagian ("Gratin Lasagna") dipakai bila hanya cocok ke satu menu.
 * Salah ketik tidak ditebak; item itu ditampilkan sebagai "tidak dikenali".
 */
export function matchParsedItems(
  items: ParsedItem[],
  catalog: CatalogVariant[],
): { quantities: Record<string, number>; unmatched: ParsedItem[] } {
  const quantities: Record<string, number> = {}
  const unmatched: ParsedItem[] = []

  for (const item of items) {
    const key = normalize(item.name)
    const sameName = catalog.filter((variant) => normalize(variant.menuName) === key)
    const candidates = sameName.length
      ? sameName
      : catalog.filter((variant) => {
          const name = normalize(variant.menuName)
          return key.length >= 5 && (name.includes(key) || key.includes(name))
        })
    const menus = new Set(candidates.map((variant) => variant.menuName))
    const variant =
      menus.size !== 1
        ? undefined
        : (candidates.find((candidate) => candidate.size === item.size) ??
          (candidates.length === 1 ? candidates[0] : undefined))

    if (variant) quantities[variant.id] = (quantities[variant.id] ?? 0) + item.qty
    else unmatched.push(item)
  }
  return { quantities, unmatched }
}

export function orderTotal(catalog: CatalogVariant[], quantities: Record<string, number>) {
  let items = 0
  let total = 0
  for (const variant of catalog) {
    const qty = quantities[variant.id] ?? 0
    items += qty
    total += qty * variant.price
  }
  return { items, total }
}
