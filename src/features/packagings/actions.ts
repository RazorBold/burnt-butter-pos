"use server"

import { and, eq, ne, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getDb } from "@/db"
import { packagings, stockMovements } from "@/db/schema"
import { CAN_EDIT_STOCK } from "@/lib/access"
import { AuthorizationError, requireRole } from "@/lib/auth"
import { fieldErrors } from "@/lib/form"
import { photoFromForm, removeStoredPhoto, uploadPhoto } from "@/lib/photo-storage"
import { photoFileError } from "@/lib/photos"

import { packagingFormFromData, packagingFormSchema, stockMovementSchema } from "./schemas"
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
  revalidatePath("/dashboard")
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

/** Tambah/ubah packaging (Admin). Stok tidak diubah di sini, kecuali stok awal packaging baru. */
export async function savePackaging(
  _prev: PackagingFormState,
  formData: FormData,
): Promise<PackagingFormState> {
  let userId: string
  try {
    userId = (await requireRole(["admin"])).id
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
    size: input.size,
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
