"use server"

import { and, eq, ne, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getDb } from "@/db"
import { rawMaterials, stockMovements } from "@/db/schema"
import { planMovement } from "@/features/packagings/stock"
import { CAN_EDIT_RAW_STOCK, CAN_MANAGE_MASTER } from "@/lib/access"
import { AuthorizationError, requireRole } from "@/lib/auth"
import { fieldErrors } from "@/lib/form"
import { formatJumlah } from "@/lib/format"

import {
  RAW_MATERIAL_DECIMALS,
  rawMaterialFormFromData,
  rawMaterialFormSchema,
  rawMaterialMovementSchema,
} from "./schemas"

export type RawMaterialFormState = {
  ok?: boolean
  message?: string
  errors?: Record<string, string>
}

type ActionResult = { ok: boolean; message: string }

function revalidateRawMaterials() {
  revalidatePath("/master-data/bahan-baku")
  revalidatePath("/dashboard")
}

/** Tambah/ubah bahan baku (Admin). Stok tidak diubah di sini, kecuali stok awal bahan baru. */
export async function saveRawMaterial(
  _prev: RawMaterialFormState,
  formData: FormData,
): Promise<RawMaterialFormState> {
  let userId: string
  try {
    userId = (await requireRole(CAN_MANAGE_MASTER)).id
  } catch (error) {
    if (error instanceof AuthorizationError) return { message: error.message }
    throw error
  }

  const parsed = rawMaterialFormSchema.safeParse(rawMaterialFormFromData(formData))
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Periksa lagi isian yang ditandai." }
  }
  const input = parsed.data
  const db = getDb()

  const [duplicate] = await db
    .select({ id: rawMaterials.id })
    .from(rawMaterials)
    .where(
      and(
        sql`lower(${rawMaterials.name}) = lower(${input.name})`,
        input.id ? ne(rawMaterials.id, input.id) : undefined,
      ),
    )
    .limit(1)
  if (duplicate) return { errors: { name: "Bahan baku dengan nama ini sudah ada." } }

  const values = { name: input.name, unit: input.unit, minStock: input.minStock }
  if (input.id) {
    const updated = await db
      .update(rawMaterials)
      .set(values)
      .where(eq(rawMaterials.id, input.id))
      .returning({ id: rawMaterials.id })
    if (updated.length === 0) {
      return { message: "Bahan baku tidak ditemukan. Muat ulang halaman." }
    }
  } else {
    const initial = input.initialStock ?? 0
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(rawMaterials)
        .values({ ...values, stock: initial })
        .returning({ id: rawMaterials.id })
      if (initial > 0) {
        await tx.insert(stockMovements).values({
          itemType: "raw_material",
          itemId: created.id,
          direction: "in",
          qty: initial,
          note: "Stok awal",
          createdBy: userId,
        })
      }
    })
  }

  revalidateRawMaterials()
  return {
    ok: true,
    message: input.id ? "Data bahan baku disimpan." : "Bahan baku ditambahkan.",
  }
}

/**
 * Catat stok bahan baku masuk, keluar, atau hitung ulang (Admin, Produksi). Baris dikunci
 * selama transaksi supaya dua pencatatan bersamaan tidak saling menimpa.
 */
export async function recordRawMaterialMovement(input: unknown): Promise<ActionResult> {
  let userId: string
  try {
    userId = (await requireRole(CAN_EDIT_RAW_STOCK)).id
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
  const parsed = rawMaterialMovementSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data belum lengkap." }
  }
  const { rawMaterialId, mode, qty, note } = parsed.data

  return getDb().transaction(async (tx) => {
    const [item] = await tx
      .select({ name: rawMaterials.name, stock: rawMaterials.stock, unit: rawMaterials.unit })
      .from(rawMaterials)
      .where(eq(rawMaterials.id, rawMaterialId))
      .for("update")
    if (!item) return { ok: false, message: "Bahan baku tidak ditemukan. Muat ulang halaman." }

    const plan = planMovement(mode, qty, item.stock, item.unit, RAW_MATERIAL_DECIMALS)
    if (!plan.ok) return { ok: false, message: plan.message }

    await tx
      .update(rawMaterials)
      .set({ stock: plan.nextStock })
      .where(eq(rawMaterials.id, rawMaterialId))
    await tx.insert(stockMovements).values({
      itemType: "raw_material",
      itemId: rawMaterialId,
      direction: plan.direction,
      qty: plan.qty,
      note: note || (mode === "hitung" ? "Hitung ulang stok" : null),
      createdBy: userId,
    })
    revalidateRawMaterials()
    return {
      ok: true,
      message: `Stok ${item.name} jadi ${formatJumlah(plan.nextStock)} ${item.unit}.`,
    }
  })
}
