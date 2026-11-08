"use server"

import { and, asc, count, eq, inArray, like, ne, notInArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getDb } from "@/db"
import { menuCategories, menus, menuVariants, orderItems } from "@/db/schema"
import { CAN_MANAGE_MENU } from "@/lib/access"
import { AuthorizationError, requireRole } from "@/lib/auth"
import { fieldErrors } from "@/lib/form"
import { photoFromForm, removeStoredPhoto, uploadPhoto } from "@/lib/photo-storage"
import { photoFileError } from "@/lib/photos"

import { categoryFormSchema, menuFormFromData, menuFormSchema, slugify } from "./schemas"

const PAGE_PATH = "/master-data/produk-menu"

/** Menu & kategori dipakai form pesanan, Produksi, dan detail pesanan. */
function revalidateMenus() {
  revalidatePath(PAGE_PATH)
  revalidatePath("/pesanan")
  revalidatePath("/pesanan/baru")
  revalidatePath("/produksi")
}

export type MenuFormState = {
  ok?: boolean
  message?: string
  errors?: Record<string, string>
}

type Size = "large" | "regular" | "single"

function authMessage(error: unknown) {
  if (error instanceof AuthorizationError) return error.message
  throw error
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "menu"
  const taken = await getDb()
    .select({ slug: menus.slug })
    .from(menus)
    .where(like(menus.slug, `${base}%`))
  const used = new Set(taken.map((row) => row.slug))
  if (!used.has(base)) return base
  for (let i = 2; ; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`
}

export async function saveMenu(_prev: MenuFormState, formData: FormData): Promise<MenuFormState> {
  try {
    await requireRole(CAN_MANAGE_MENU)
  } catch (error) {
    return { message: authMessage(error) }
  }

  const parsed = menuFormSchema.safeParse(menuFormFromData(formData))
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Periksa lagi isian yang ditandai." }
  }
  const input = parsed.data

  const db = getDb()
  const [category] = await db
    .select({ sized: menuCategories.sized })
    .from(menuCategories)
    .where(eq(menuCategories.id, input.categoryId))
  if (!category) return { errors: { categoryId: "Kategori tidak ditemukan. Muat ulang halaman." } }
  // Ukuran mengikuti kategori; form mengirim harga sesuai kategori yang dipilih.
  if (category.sized !== (input.sizing === "two_sizes")) {
    return { message: "Ukuran tidak cocok dengan kategori. Muat ulang halaman lalu coba lagi." }
  }

  const photo = photoFromForm(formData)
  const photoError = photo && photoFileError(photo)
  if (photoError) return { errors: { photo: photoError } }

  const existing = input.id
    ? (
        await db
          .select({ slug: menus.slug, photoPath: menus.photoPath })
          .from(menus)
          .where(eq(menus.id, input.id))
          .limit(1)
      )[0]
    : undefined
  if (input.id && !existing) return { message: "Menu tidak ditemukan. Muat ulang halaman." }

  const slug = existing?.slug ?? (await uniqueSlug(input.name))

  let photoPath = existing?.photoPath ?? null
  if (photo) {
    const uploaded = await uploadPhoto("menu", slug, photo)
    if ("error" in uploaded) return { errors: { photo: uploaded.error } }
    photoPath = uploaded.path
  }

  const prices: { size: Size; price: number }[] =
    input.sizing === "two_sizes"
      ? [
          { size: "large", price: input.priceLarge! },
          { size: "regular", price: input.priceRegular! },
        ]
      : [{ size: "single", price: input.priceSingle! }]

  await db.transaction(async (tx) => {
    const values = {
      name: input.name,
      categoryId: input.categoryId,
      description: input.description ?? null,
      photoPath,
      isActive: input.isActive,
    }
    const [menu] = input.id
      ? await tx.update(menus).set(values).where(eq(menus.id, input.id)).returning({ id: menus.id })
      : await tx
          .insert(menus)
          .values({ ...values, slug })
          .returning({ id: menus.id })

    for (const { size, price } of prices) {
      await tx
        .insert(menuVariants)
        .values({ menuId: menu.id, size, price, isActive: true })
        .onConflictDoUpdate({
          target: [menuVariants.menuId, menuVariants.size],
          set: { price, isActive: true },
        })
    }
    // Ukuran yang tidak dipakai lagi dinonaktifkan, bukan dihapus: pesanan lama masih merujuknya.
    await tx
      .update(menuVariants)
      .set({ isActive: false })
      .where(
        and(
          eq(menuVariants.menuId, menu.id),
          notInArray(
            menuVariants.size,
            prices.map((p) => p.size),
          ),
        ),
      )
  })

  // Foto lama di Storage dibuang setelah data tersimpan (foto bawaan /images/... dibiarkan).
  if (photo) await removeStoredPhoto(existing?.photoPath)

  revalidateMenus()
  return { ok: true, message: input.id ? "Perubahan menu disimpan." : "Menu baru ditambahkan." }
}

export async function setMenusActive(
  ids: string[],
  isActive: boolean,
): Promise<{ ok: boolean; message: string }> {
  try {
    await requireRole(CAN_MANAGE_MENU)
  } catch (error) {
    return { ok: false, message: authMessage(error) }
  }
  if (ids.length === 0) return { ok: false, message: "Tidak ada menu yang dipilih." }

  await getDb().update(menus).set({ isActive }).where(inArray(menus.id, ids))
  revalidateMenus()
  return {
    ok: true,
    message: isActive
      ? "Menu diaktifkan kembali."
      : "Menu dinonaktifkan. Tidak muncul di pesanan baru.",
  }
}

type Result = { ok: boolean; message: string }

async function requireMenuManager(): Promise<Result | null> {
  try {
    await requireRole(CAN_MANAGE_MENU)
    return null
  } catch (error) {
    return { ok: false, message: authMessage(error) }
  }
}

/**
 * Hapus menu (Owner). Menu yang sudah pernah dipesan diarsipkan (disembunyikan, data tetap untuk
 * riwayat pesanan dan laporan); yang belum pernah dipesan dihapus beserta ukurannya.
 */
export async function deleteMenu(id: string): Promise<Result> {
  const denied = await requireMenuManager()
  if (denied) return denied
  const db = getDb()
  const [menu] = await db
    .select({ name: menus.name, photoPath: menus.photoPath })
    .from(menus)
    .where(eq(menus.id, id))
  if (!menu) return { ok: false, message: "Menu tidak ditemukan. Muat ulang halaman." }

  const [used] = await db
    .select({ total: count() })
    .from(orderItems)
    .innerJoin(menuVariants, eq(menuVariants.id, orderItems.menuVariantId))
    .where(eq(menuVariants.menuId, id))

  if (used.total > 0) {
    await db.update(menus).set({ isArchived: true, isActive: false }).where(eq(menus.id, id))
    revalidateMenus()
    return {
      ok: true,
      message: `${menu.name} dihapus dari daftar. Pesanan lama yang memakainya tetap utuh.`,
    }
  }
  await db.delete(menus).where(eq(menus.id, id))
  await removeStoredPhoto(menu.photoPath)
  revalidateMenus()
  return { ok: true, message: `${menu.name} dihapus.` }
}

export type CategoryFormState = MenuFormState

/**
 * Tambah / ubah kategori (Owner). Kategori baru ditaruh paling bawah. Jenis ukuran tidak bisa
 * diubah selama masih ada menu di dalamnya, karena harga menunya ikut ukuran.
 */
export async function saveCategory(input: unknown): Promise<CategoryFormState> {
  const denied = await requireMenuManager()
  if (denied) return { message: denied.message }
  const parsed = categoryFormSchema.safeParse(input)
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Periksa lagi isian yang ditandai." }
  }
  const { id, name, sized } = parsed.data
  const db = getDb()

  const [duplicate] = await db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(
      and(
        sql`lower(${menuCategories.name}) = lower(${name})`,
        id ? ne(menuCategories.id, id) : undefined,
      ),
    )
  if (duplicate) return { errors: { name: "Kategori dengan nama ini sudah ada." } }

  if (id) {
    const [current] = await db
      .select({ sized: menuCategories.sized })
      .from(menuCategories)
      .where(eq(menuCategories.id, id))
    if (!current) return { message: "Kategori tidak ditemukan. Muat ulang halaman." }
    if (current.sized !== sized) {
      const [inUse] = await db
        .select({ total: count() })
        .from(menus)
        .where(and(eq(menus.categoryId, id), eq(menus.isArchived, false)))
      if (inUse.total > 0) {
        return {
          errors: {
            sized: "Jenis ukuran tidak bisa diubah selama masih ada menu di kategori ini.",
          },
        }
      }
    }
    await db
      .update(menuCategories)
      .set({ name, sized, updatedAt: sql`now()` })
      .where(eq(menuCategories.id, id))
  } else {
    const [last] = await db
      .select({ max: sql<number>`coalesce(max(${menuCategories.sortOrder}), -1)`.mapWith(Number) })
      .from(menuCategories)
    await db.insert(menuCategories).values({ name, sized, sortOrder: (last?.max ?? -1) + 1 })
  }
  revalidateMenus()
  return { ok: true, message: id ? "Kategori disimpan." : `Kategori ${name} ditambahkan.` }
}

/** Hapus kategori (Owner), hanya bila tidak ada menu di dalamnya (menu arsip tidak dihitung). */
export async function deleteCategory(id: string): Promise<Result> {
  const denied = await requireMenuManager()
  if (denied) return denied
  const db = getDb()
  const [category] = await db
    .select({ name: menuCategories.name })
    .from(menuCategories)
    .where(eq(menuCategories.id, id))
  if (!category) return { ok: false, message: "Kategori tidak ditemukan. Muat ulang halaman." }
  const [inUse] = await db
    .select({ total: count() })
    .from(menus)
    .where(and(eq(menus.categoryId, id), eq(menus.isArchived, false)))
  if (inUse.total > 0) {
    return {
      ok: false,
      message: `Masih ada ${inUse.total} menu di ${category.name}. Pindahkan atau hapus menunya dulu.`,
    }
  }
  // Menu arsip di kategori ini jadi tanpa kategori (ON DELETE SET NULL).
  await db.delete(menuCategories).where(eq(menuCategories.id, id))
  revalidateMenus()
  return { ok: true, message: `Kategori ${category.name} dihapus.` }
}

/** Geser kategori naik/turun satu posisi (urutan kelompok di form pesanan). */
export async function moveCategory(id: string, direction: "up" | "down"): Promise<Result> {
  const denied = await requireMenuManager()
  if (denied) return denied
  await getDb().transaction(async (tx) => {
    const rows = await tx
      .select({ id: menuCategories.id })
      .from(menuCategories)
      .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name))
      .for("update")
    const ids = rows.map((row) => row.id)
    const index = ids.indexOf(id)
    const target = direction === "up" ? index - 1 : index + 1
    if (index === -1 || target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    // Tulis ulang urutan 0..n supaya rapat.
    for (const [sortOrder, categoryId] of ids.entries()) {
      await tx.update(menuCategories).set({ sortOrder }).where(eq(menuCategories.id, categoryId))
    }
  })
  revalidateMenus()
  return { ok: true, message: "Urutan kategori disimpan." }
}
