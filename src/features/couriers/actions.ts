"use server"

import { and, eq, ne, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getDb } from "@/db"
import { couriers } from "@/db/schema"
import { fieldErrors } from "@/lib/form"
import { AuthorizationError, requireRole } from "@/lib/auth"

import { courierFormFromData, courierFormSchema } from "./schemas"

const PAGE_PATH = "/master-data/kurir"

export type CourierFormState = {
  ok?: boolean
  message?: string
  errors?: Record<string, string>
}

function authMessage(error: unknown) {
  if (error instanceof AuthorizationError) return error.message
  throw error
}

export async function saveCourier(
  _prev: CourierFormState,
  formData: FormData,
): Promise<CourierFormState> {
  try {
    await requireRole(["admin"])
  } catch (error) {
    return { message: authMessage(error) }
  }

  const parsed = courierFormSchema.safeParse(courierFormFromData(formData))
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Periksa lagi isian yang ditandai." }
  }
  const input = parsed.data
  const db = getDb()

  const [duplicate] = await db
    .select({ id: couriers.id })
    .from(couriers)
    .where(
      and(
        sql`lower(${couriers.name}) = lower(${input.name})`,
        input.id ? ne(couriers.id, input.id) : undefined,
      ),
    )
    .limit(1)
  if (duplicate) return { errors: { name: "Nama kurir ini sudah ada." } }

  const values = {
    name: input.name,
    type: input.type,
    phone: input.phone,
    isActive: input.isActive,
  }
  if (input.id) {
    const updated = await db
      .update(couriers)
      .set(values)
      .where(eq(couriers.id, input.id))
      .returning({ id: couriers.id })
    if (updated.length === 0) return { message: "Kurir tidak ditemukan. Muat ulang halaman." }
  } else {
    await db.insert(couriers).values(values)
  }

  revalidatePath(PAGE_PATH)
  return { ok: true, message: input.id ? "Data kurir disimpan." : "Kurir baru ditambahkan." }
}

export async function setCourierActive(
  id: string,
  isActive: boolean,
): Promise<{ ok: boolean; message: string }> {
  try {
    await requireRole(["admin"])
  } catch (error) {
    return { ok: false, message: authMessage(error) }
  }
  await getDb().update(couriers).set({ isActive }).where(eq(couriers.id, id))
  revalidatePath(PAGE_PATH)
  return {
    ok: true,
    message: isActive
      ? "Kurir diaktifkan kembali."
      : "Kurir dinonaktifkan. Tidak bisa dipilih untuk pengiriman baru.",
  }
}
