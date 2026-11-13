"use server"

import { and, eq, ne, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getDb } from "@/db"
import { shippingOptions } from "@/db/schema"
import { CAN_MANAGE_MASTER } from "@/lib/access"
import { AuthorizationError, requireRole } from "@/lib/auth"
import { fieldErrors } from "@/lib/form"

import { shippingOptionFormFromData, shippingOptionFormSchema } from "./schemas"

export type ShippingOptionFormState = {
  ok?: boolean
  message?: string
  errors?: Record<string, string>
}

function authMessage(error: unknown) {
  if (error instanceof AuthorizationError) return error.message
  throw error
}

function revalidate() {
  revalidatePath("/master-data/kurir")
  revalidatePath("/pesanan")
  revalidatePath("/pengiriman")
}

/** Tambah / ubah kategori pengiriman (Owner). */
export async function saveShippingOption(
  _prev: ShippingOptionFormState,
  formData: FormData,
): Promise<ShippingOptionFormState> {
  try {
    await requireRole(CAN_MANAGE_MASTER)
  } catch (error) {
    return { message: authMessage(error) }
  }

  const parsed = shippingOptionFormSchema.safeParse(shippingOptionFormFromData(formData))
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Periksa lagi isian yang ditandai." }
  }
  const input = parsed.data
  const db = getDb()

  const [duplicate] = await db
    .select({ id: shippingOptions.id })
    .from(shippingOptions)
    .where(
      and(
        sql`lower(${shippingOptions.name}) = lower(${input.name})`,
        input.id ? ne(shippingOptions.id, input.id) : undefined,
      ),
    )
    .limit(1)
  if (duplicate) return { errors: { name: "Kategori dengan nama ini sudah ada." } }

  const values = {
    name: input.name,
    flow: input.flow,
    liveTracking: input.liveTracking,
    note: input.note || null,
    isActive: input.isActive,
  }
  if (input.id) {
    const updated = await db
      .update(shippingOptions)
      .set(values)
      .where(eq(shippingOptions.id, input.id))
      .returning({ id: shippingOptions.id })
    if (updated.length === 0) return { message: "Kategori tidak ditemukan. Muat ulang halaman." }
  } else {
    const [last] = await db
      .select({
        max: sql<number>`coalesce(max(${shippingOptions.sortOrder}), 0)`.mapWith(Number),
      })
      .from(shippingOptions)
    await db.insert(shippingOptions).values({ ...values, sortOrder: (last?.max ?? 0) + 1 })
  }

  revalidate()
  return {
    ok: true,
    message: input.id ? "Kategori pengiriman disimpan." : "Kategori pengiriman ditambahkan.",
  }
}

export async function setShippingOptionActive(
  id: string,
  isActive: boolean,
): Promise<{ ok: boolean; message: string }> {
  try {
    await requireRole(CAN_MANAGE_MASTER)
  } catch (error) {
    return { ok: false, message: authMessage(error) }
  }
  await getDb().update(shippingOptions).set({ isActive }).where(eq(shippingOptions.id, id))
  revalidate()
  return {
    ok: true,
    message: isActive
      ? "Kategori pengiriman diaktifkan kembali."
      : "Kategori dinonaktifkan. Tidak bisa dipilih untuk pesanan baru.",
  }
}
