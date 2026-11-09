"use server"

import { revalidatePath } from "next/cache"

import { getDb } from "@/db"
import { storeSettings } from "@/db/schema"
import { CAN_MANAGE_MASTER } from "@/lib/access"
import { AuthorizationError, requireRole } from "@/lib/auth"
import { fieldErrors } from "@/lib/form"

import { storeSettingsFromData, storeSettingsSchema } from "./schemas"

export type StoreSettingsFormState = {
  ok?: boolean
  message?: string
  errors?: Record<string, string>
}

export async function saveStoreSettings(
  _prev: StoreSettingsFormState,
  formData: FormData,
): Promise<StoreSettingsFormState> {
  let userId: string
  try {
    userId = (await requireRole(CAN_MANAGE_MASTER)).id
  } catch (error) {
    if (error instanceof AuthorizationError) return { message: error.message }
    throw error
  }

  const parsed = storeSettingsSchema.safeParse(storeSettingsFromData(formData))
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Periksa lagi isian yang ditandai." }
  }
  const values = { ...parsed.data, updatedBy: userId, updatedAt: new Date() }

  await getDb()
    .insert(storeSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: storeSettings.id, set: values })

  revalidatePath("/master-data/pengaturan")
  return { ok: true, message: "Pengaturan toko disimpan." }
}
