import "server-only"

import { getDb } from "@/db"

import type { MenuCategory } from "./schemas"

export type MenuVariantRow = { id: string; size: "large" | "regular" | "single"; price: number }

export type MenuRow = {
  id: string
  name: string
  slug: string
  category: MenuCategory
  description: string | null
  photoPath: string | null
  isActive: boolean
  variants: MenuVariantRow[]
}

const SIZE_ORDER = { large: 0, regular: 1, single: 2 } as const

/** Daftar menu untuk Master Data. Urutan: kategori (pasta → dessert → bundle), lalu urutan dibuat. */
export async function listMenus({
  q,
  category,
}: {
  q?: string
  category?: MenuCategory
}): Promise<MenuRow[]> {
  const search = q?.trim().replace(/[\\%_]/g, (char) => `\\${char}`)

  const rows = await getDb().query.menus.findMany({
    where: (menu, { and, eq, ilike }) =>
      and(
        search ? ilike(menu.name, `%${search}%`) : undefined,
        category ? eq(menu.category, category) : undefined,
      ),
    with: {
      variants: {
        where: (variant, { eq }) => eq(variant.isActive, true),
        columns: { id: true, size: true, price: true },
      },
    },
    orderBy: (menu, { asc }) => [asc(menu.category), asc(menu.createdAt), asc(menu.name)],
  })

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    description: row.description,
    photoPath: row.photoPath,
    isActive: row.isActive,
    variants: [...row.variants].sort((a, b) => SIZE_ORDER[a.size] - SIZE_ORDER[b.size]),
  }))
}
