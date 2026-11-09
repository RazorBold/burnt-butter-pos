"use server"

import { and, asc, count, eq, ne, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getDb } from "@/db"
import { packagingCategories, packagings, stockMovements } from "@/db/schema"
import { CAN_EDIT_STOCK, CAN_MANAGE_PACKAGING } from "@/lib/access"
import { AuthorizationError, requireRole } from "@/lib/auth"
import { fieldErrors } from "@/lib/form"
import { photoFromForm, removeStoredPhoto, uploadPhoto } from "@/lib/photo-storage"
import { photoFileError } from "@/lib/photos"

import {
  packagingCategoryFormSchema,
  packagingFormFromData,
  packagingFormSchema,
  stockMovementSchema,
} from "./schemas"
import { planMovement } from "./stock"

export type PackagingFormState = {
  ok?: boolean
  message?: string
  errors?: Record<string, string>
}

type ActionResult = { ok: boolean; message: string }

function revalidateStock() {
  revalidatePath("/stok-packaging")
  revalidatePath("/master-data/stok-packaging")
  revalidatePath("/packaging")
  revalidatePath("/dashboard")
}

async function requirePackagingManager(): Promise<ActionResult | null> {
  try {
    await requireRole(CAN_MANAGE_PACKAGING)
    return null
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "packaging"
  )
}

/**
 * Tambah/ubah jenis stok packaging (Owner). Stok tidak diubah di sini, kecuali stok awal
 * packaging baru; stok masuk / hitung ulang dicatat di menu Stok Packaging.
 */
export async function savePackaging(
  _prev: PackagingFormState,
  formData: FormData,
): Promise<PackagingFormState> {
  let userId: string
  try {
    userId = (await requireRole(CAN_MANAGE_PACKAGING)).id
  } catch (error) {
    if (error instanceof AuthorizationError) return { message: error.message }
    throw error
  }

  const parsed = packagingFormSchema.safeParse(packagingFormFromData(formData))
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Periksa lagi isian yang ditandai." }
  }
  const input = parsed.data
  const photo = photoFromForm(formData)
  const photoError = photo && photoFileError(photo)
  if (photoError) return { errors: { photo: photoError } }

  const db = getDb()
  const [duplicate] = await db
    .select({ id: packagings.id })
    .from(packagings)
    .where(
      and(
        sql`lower(${packagings.name}) = lower(${input.name})`,
        input.id ? ne(packagings.id, input.id) : undefined,
      ),
    )
    .limit(1)
  if (duplicate) return { errors: { name: "Packaging dengan nama ini sudah ada." } }
  if (input.categoryId) {
    const [category] = await db
      .select({ id: packagingCategories.id })
      .from(packagingCategories)
      .where(eq(packagingCategories.id, input.categoryId))
    if (!category) return { errors: { categoryId: "Kategori sudah dihapus. Pilih yang lain." } }
  }

  const [existing] = input.id
    ? await db
        .select({ photoPath: packagings.photoPath })
        .from(packagings)
        .where(eq(packagings.id, input.id))
    : []
  if (input.id && !existing) return { message: "Packaging tidak ditemukan. Muat ulang halaman." }

  let photoPath = existing?.photoPath ?? null
  if (photo) {
    const uploaded = await uploadPhoto("packaging", slugify(input.name), photo)
    if ("error" in uploaded) return { errors: { photo: uploaded.error } }
    photoPath = uploaded.path
  }

  const values = {
    name: input.name,
    unit: input.unit,
    categoryId: input.categoryId,
    minStock: input.minStock,
    capacity: input.capacity,
    photoPath,
  }
  if (input.id) {
    await db.update(packagings).set(values).where(eq(packagings.id, input.id))
    if (photo) await removeStoredPhoto(existing?.photoPath)
  } else {
    const initial = input.initialStock ?? 0
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(packagings)
        .values({ ...values, stock: initial })
        .returning({ id: packagings.id })
      if (initial > 0) {
        await tx.insert(stockMovements).values({
          itemType: "packaging",
          itemId: created.id,
          direction: "in",
          qty: initial,
          note: "Stok awal",
          createdBy: userId,
        })
      }
    })
  }

  revalidateStock()
  return { ok: true, message: input.id ? "Data packaging disimpan." : "Packaging ditambahkan." }
}

/**
 * Hapus jenis stok (Owner). Yang sudah punya riwayat stok (stok awal, masuk, atau terpakai packing)
 * diarsipkan supaya riwayat dan pesanan lama tetap utuh; yang belum pernah dicatat dihapus.
 */
export async function deletePackaging(id: string): Promise<ActionResult> {
  const denied = await requirePackagingManager()
  if (denied) return denied
  const db = getDb()
  const [item] = await db
    .select({ name: packagings.name, photoPath: packagings.photoPath })
    .from(packagings)
    .where(and(eq(packagings.id, id), eq(packagings.isActive, true)))
  if (!item) return { ok: false, message: "Packaging tidak ditemukan. Muat ulang halaman." }

  const [history] = await db
    .select({ total: count() })
    .from(stockMovements)
    .where(and(eq(stockMovements.itemType, "packaging"), eq(stockMovements.itemId, id)))
  if (history.total > 0) {
    await db
      .update(packagings)
      .set({ isActive: false, updatedAt: sql`now()` })
      .where(eq(packagings.id, id))
    revalidateStock()
    return {
      ok: true,
      message: `${item.name} dihapus dari daftar. Riwayat stok dan pesanan lama tetap utuh.`,
    }
  }
  await db.delete(packagings).where(eq(packagings.id, id))
  await removeStoredPhoto(item.photoPath)
  revalidateStock()
  return { ok: true, message: `${item.name} dihapus.` }
}

/** Tambah / ubah nama kategori stok (Owner). Kategori baru ditaruh paling bawah. */
export async function savePackagingCategory(input: unknown): Promise<PackagingFormState> {
  const denied = await requirePackagingManager()
  if (denied) return { message: denied.message }
  const parsed = packagingCategoryFormSchema.safeParse(input)
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Periksa lagi isian yang ditandai." }
  }
  const { id, name } = parsed.data
  const db = getDb()
  const [duplicate] = await db
    .select({ id: packagingCategories.id })
    .from(packagingCategories)
    .where(
      and(
        sql`lower(${packagingCategories.name}) = lower(${name})`,
        id ? ne(packagingCategories.id, id) : undefined,
      ),
    )
  if (duplicate) return { errors: { name: "Kategori dengan nama ini sudah ada." } }

  if (id) {
    const updated = await db
      .update(packagingCategories)
      .set({ name, updatedAt: sql`now()` })
      .where(eq(packagingCategories.id, id))
      .returning({ id: packagingCategories.id })
    if (updated.length === 0) return { message: "Kategori tidak ditemukan. Muat ulang halaman." }
  } else {
    const [last] = await db
      .select({
        max: sql<number>`coalesce(max(${packagingCategories.sortOrder}), -1)`.mapWith(Number),
      })
      .from(packagingCategories)
    await db.insert(packagingCategories).values({ name, sortOrder: (last?.max ?? -1) + 1 })
  }
  revalidateStock()
  return { ok: true, message: id ? "Kategori disimpan." : `Kategori ${name} ditambahkan.` }
}

/** Hapus kategori stok (Owner), hanya bila tidak ada packaging aktif di dalamnya. */
export async function deletePackagingCategory(id: string): Promise<ActionResult> {
  const denied = await requirePackagingManager()
  if (denied) return denied
  const db = getDb()
  const [category] = await db
    .select({ name: packagingCategories.name })
    .from(packagingCategories)
    .where(eq(packagingCategories.id, id))
  if (!category) return { ok: false, message: "Kategori tidak ditemukan. Muat ulang halaman." }
  const [inUse] = await db
    .select({ total: count() })
    .from(packagings)
    .where(and(eq(packagings.categoryId, id), eq(packagings.isActive, true)))
  if (inUse.total > 0) {
    return {
      ok: false,
      message: `Masih ada ${inUse.total} packaging di ${category.name}. Pindahkan atau hapus dulu.`,
    }
  }
  // Packaging arsip di kategori ini jadi tanpa kategori (ON DELETE SET NULL).
  await db.delete(packagingCategories).where(eq(packagingCategories.id, id))
  revalidateStock()
  return { ok: true, message: `Kategori ${category.name} dihapus.` }
}

/** Geser kategori stok naik/turun satu posisi (urutan kelompok di Stok Packaging & packing). */
export async function movePackagingCategory(
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const denied = await requirePackagingManager()
  if (denied) return denied
  await getDb().transaction(async (tx) => {
    const rows = await tx
      .select({ id: packagingCategories.id })
      .from(packagingCategories)
      .orderBy(asc(packagingCategories.sortOrder), asc(packagingCategories.name))
      .for("update")
    const ids = rows.map((row) => row.id)
    const index = ids.indexOf(id)
    const target = direction === "up" ? index - 1 : index + 1
    if (index === -1 || target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    for (const [sortOrder, categoryId] of ids.entries()) {
      await tx
        .update(packagingCategories)
        .set({ sortOrder })
        .where(eq(packagingCategories.id, categoryId))
    }
  })
  revalidateStock()
  return { ok: true, message: "Urutan kategori disimpan." }
}

/**
 * Catat stok masuk atau hitung ulang (Admin, Produksi). Baris packaging dikunci selama
 * transaksi supaya dua pencatatan bersamaan tidak saling menimpa.
 */
export async function recordStockMovement(input: unknown): Promise<ActionResult> {
  let userId: string
  try {
    userId = (await requireRole(CAN_EDIT_STOCK)).id
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
  const parsed = stockMovementSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data belum lengkap." }
  }
  const { packagingId, mode, qty, note } = parsed.data
  // Pemakaian packaging tercatat otomatis saat packing; manual hanya tambah atau hitung ulang.
  if (mode === "keluar") {
    return {
      ok: false,
      message:
        "Stok keluar tercatat otomatis dari menu Packaging. Pakai Hitung ulang untuk membetulkan.",
    }
  }

  return getDb().transaction(async (tx) => {
    const [item] = await tx
      .select({ name: packagings.name, stock: packagings.stock, unit: packagings.unit })
      .from(packagings)
      .where(eq(packagings.id, packagingId))
      .for("update")
    if (!item) return { ok: false, message: "Packaging tidak ditemukan. Muat ulang halaman." }

    const plan = planMovement(mode, qty, item.stock, item.unit)
    if (!plan.ok) return { ok: false, message: plan.message }

    await tx.update(packagings).set({ stock: plan.nextStock }).where(eq(packagings.id, packagingId))
    await tx.insert(stockMovements).values({
      itemType: "packaging",
      itemId: packagingId,
      direction: plan.direction,
      qty: plan.qty,
      note: note || (mode === "hitung" ? "Hitung ulang stok" : null),
      createdBy: userId,
    })
    revalidateStock()
    return {
      ok: true,
      message: `Stok ${item.name} jadi ${plan.nextStock} ${item.unit}.`,
    }
  })
}
