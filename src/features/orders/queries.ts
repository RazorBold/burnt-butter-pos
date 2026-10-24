import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { getDb } from "@/db"
import { menus, menuVariants } from "@/db/schema"

import type { CatalogVariant } from "./catalog"

/** Varian menu aktif untuk form pesanan, urut seperti Master Data (kategori, lalu urutan dibuat). */
export async function getOrderCatalog(): Promise<CatalogVariant[]> {
  return getDb()
    .select({
      id: menuVariants.id,
      menuName: menus.name,
      category: menus.category,
      size: menuVariants.size,
      price: menuVariants.price,
      photoPath: menus.photoPath,
    })
    .from(menuVariants)
    .innerJoin(menus, eq(menus.id, menuVariants.menuId))
    .where(and(eq(menus.isActive, true), eq(menuVariants.isActive, true)))
    .orderBy(asc(menus.category), asc(menus.createdAt), asc(menus.name))
}
