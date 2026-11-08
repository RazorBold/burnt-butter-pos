import "server-only"

import { and, asc, count, eq } from "drizzle-orm"

import { getDb } from "@/db"
import { menuCategories, menus } from "@/db/schema"

import type { MenuCategoryRef } from "./schemas"

export type MenuVariantRow = { id: string; size: "large" | "regular" | "single"; price: number }

export type MenuRow = {
  id: string
  name: string
  slug: string
  category: MenuCategoryRef | null
  description: string | null
  photoPath: string | null
  isActive: boolean
  variants: MenuVariantRow[]
}

export type MenuCategoryRow = MenuCategoryRef & {
  sortOrder: number
  /** Menu (tidak termasuk arsip) di kategori ini. */
  menuCount: number
}

const SIZE_ORDER = { large: 0, regular: 1, single: 2 } as const

/** Kategori menu, urut seperti di form pesanan, beserta jumlah menunya. */
export async function listMenuCategories(): Promise<MenuCategoryRow[]> {
  return getDb()
    .select({
      id: menuCategories.id,
      name: menuCategories.name,
      sized: menuCategories.sized,
      sortOrder: menuCategories.sortOrder,
      menuCount: count(menus.id),
    })
    .from(menuCategories)
    .leftJoin(menus, and(eq(menus.categoryId, menuCategories.id), eq(menus.isArchived, false)))
    .groupBy(menuCategories.id)
    .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name))
}

/**
 * Daftar menu untuk Master Data (tanpa arsip). Urutan: urutan kategori, lalu urutan dibuat.
 */
export async function listMenus({
  q,
  categoryId,
}: {
  q?: string
  categoryId?: string
}): Promise<MenuRow[]> {
  const search = q?.trim().replace(/[\\%_]/g, (char) => `\\${char}`)

  const rows = await getDb().query.menus.findMany({
    where: (menu, { and, eq, ilike }) =>
      and(
        eq(menu.isArchived, false),
        search ? ilike(menu.name, `%${search}%`) : undefined,
        categoryId ? eq(menu.categoryId, categoryId) : undefined,
      ),
    with: {
      category: { columns: { id: true, name: true, sized: true, sortOrder: true } },
      variants: {
        where: (variant, { eq }) => eq(variant.isActive, true),
        columns: { id: true, size: true, price: true },
      },
    },
    orderBy: (menu, { asc }) => [asc(menu.createdAt), asc(menu.name)],
  })

  return rows
    .sort(
      (a, b) =>
        (a.category?.sortOrder ?? Number.MAX_SAFE_INTEGER) -
        (b.category?.sortOrder ?? Number.MAX_SAFE_INTEGER),
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: row.category
        ? { id: row.category.id, name: row.category.name, sized: row.category.sized }
        : null,
      description: row.description,
      photoPath: row.photoPath,
      isActive: row.isActive,
      variants: [...row.variants].sort((a, b) => SIZE_ORDER[a.size] - SIZE_ORDER[b.size]),
    }))
}
