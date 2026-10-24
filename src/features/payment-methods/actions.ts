"use server"

import { and, eq, ne, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getDb } from "@/db"
import { paymentMethods } from "@/db/schema"
import { AuthorizationError, requireRole } from "@/lib/auth"
import { fieldErrors } from "@/lib/form"

import { paymentMethodFormFromData, paymentMethodFormSchema } from "./schemas"

const PAGE_PATH = "/master-data/metode-pembayaran"

export type PaymentMethodFormState = {
  ok?: boolean
  message?: string
  errors?: Record<string, string>
}

function authMessage(error: unknown) {
  if (error instanceof AuthorizationError) return error.message
  throw error
}

export async function savePaymentMethod(
  _prev: PaymentMethodFormState,
  formData: FormData,
): Promise<PaymentMethodFormState> {
  try {
    await requireRole(["admin"])
  } catch (error) {
    return { message: authMessage(error) }
  }

  const parsed = paymentMethodFormSchema.safeParse(paymentMethodFormFromData(formData))
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Periksa lagi isian yang ditandai." }
  }
  const input = parsed.data
  const db = getDb()

  const [duplicate] = await db
    .select({ id: paymentMethods.id })
    .from(paymentMethods)
    .where(
      and(
        sql`lower(${paymentMethods.name}) = lower(${input.name})`,
        input.id ? ne(paymentMethods.id, input.id) : undefined,
      ),
    )
    .limit(1)
  if (duplicate) return { errors: { name: "Metode dengan nama ini sudah ada." } }

  const values = { name: input.name, type: input.type, isActive: input.isActive }
  if (input.id) {
    const updated = await db
      .update(paymentMethods)
      .set(values)
      .where(eq(paymentMethods.id, input.id))
      .returning({ id: paymentMethods.id })
    if (updated.length === 0) return { message: "Metode tidak ditemukan. Muat ulang halaman." }
  } else {
    await db.insert(paymentMethods).values(values)
  }

  revalidatePath(PAGE_PATH)
  return {
    ok: true,
    message: input.id ? "Metode pembayaran disimpan." : "Metode pembayaran ditambahkan.",
  }
}

export async function setPaymentMethodActive(
  id: string,
  isActive: boolean,
): Promise<{ ok: boolean; message: string }> {
  try {
    await requireRole(["admin"])
  } catch (error) {
    return { ok: false, message: authMessage(error) }
  }
  await getDb().update(paymentMethods).set({ isActive }).where(eq(paymentMethods.id, id))
  revalidatePath(PAGE_PATH)
  return {
    ok: true,
    message: isActive
      ? "Metode pembayaran diaktifkan kembali."
      : "Metode dinonaktifkan. Tidak bisa dipilih untuk pembayaran baru.",
  }
}
