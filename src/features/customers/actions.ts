"use server"

import { and, eq, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getDb } from "@/db"
import { customers } from "@/db/schema"
import { CAN_EDIT_CUSTOMER } from "@/lib/access"
import { AuthorizationError, requireRole } from "@/lib/auth"
import { fieldErrors } from "@/lib/form"

import { customerFormFromData, customerFormSchema } from "./schemas"

const PAGE_PATH = "/master-data/customer"

export type CustomerFormState = {
  ok?: boolean
  message?: string
  errors?: Record<string, string>
}

export async function saveCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  try {
    await requireRole(CAN_EDIT_CUSTOMER)
  } catch (error) {
    if (error instanceof AuthorizationError) return { message: error.message }
    throw error
  }

  const parsed = customerFormSchema.safeParse(customerFormFromData(formData))
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Periksa lagi isian yang ditandai." }
  }
  const input = parsed.data
  const db = getDb()

  // No. HP adalah kunci customer: Input Pesanan mencocokkan customer lama lewat nomor ini.
  const [duplicate] = await db
    .select({ name: customers.name })
    .from(customers)
    .where(and(eq(customers.phone, input.phone), input.id ? ne(customers.id, input.id) : undefined))
    .limit(1)
  if (duplicate) {
    return { errors: { phone: `No. HP ini sudah tercatat atas nama ${duplicate.name}.` } }
  }

  const values = { name: input.name, phone: input.phone, address: input.address }
  if (input.id) {
    const updated = await db
      .update(customers)
      .set(values)
      .where(eq(customers.id, input.id))
      .returning({ id: customers.id })
    if (updated.length === 0) return { message: "Customer tidak ditemukan. Muat ulang halaman." }
  } else {
    await db.insert(customers).values(values)
  }

  revalidatePath(PAGE_PATH)
  return { ok: true, message: input.id ? "Data customer disimpan." : "Customer ditambahkan." }
}
