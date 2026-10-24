// Katalog menu untuk form pesanan, dan pencocokan hasil parser WA ke varian menu.
// Murni (tanpa DB) supaya bisa dipakai di klien dan diuji.

import type { ParsedItem } from "@/lib/wa-parser"

export type CatalogVariant = {
  id: string
  menuName: string
  category: "pasta" | "dessert" | "bundle"
  size: "large" | "regular" | "single"
  price: number
  photoPath: string | null
}

export type CatalogGroup = { key: string; title: string; variants: CatalogVariant[] }

const GROUPS = [
  { key: "large", title: "Large", match: (v: CatalogVariant) => v.size === "large" },
  { key: "regular", title: "Regular", match: (v: CatalogVariant) => v.size === "regular" },
  { key: "dessert", title: "Dessert", match: (v: CatalogVariant) => v.category === "dessert" },
  { key: "bundle", title: "Special Bundle", match: (v: CatalogVariant) => v.category === "bundle" },
]

/** Kelompok sesuai urutan template WA: Size Large, Size Regular, Dessert, Special Bundle. */
export function groupCatalog(catalog: CatalogVariant[]): CatalogGroup[] {
  const used = new Set<string>()
  const groups = GROUPS.map(({ key, title, match }) => {
    const variants = catalog.filter((variant) => !used.has(variant.id) && match(variant))
    for (const variant of variants) used.add(variant.id)
    return { key, title, variants }
  })
  const rest = catalog.filter((variant) => !used.has(variant.id))
  if (rest.length) groups.push({ key: "lainnya", title: "Lainnya", variants: rest })
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
