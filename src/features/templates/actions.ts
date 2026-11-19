"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getDb } from "@/db"
import { messageTemplates } from "@/db/schema"
import { CAN_MANAGE_MASTER } from "@/lib/access"
import { AuthorizationError, requireRole } from "@/lib/auth"

import { getTemplateSources } from "./queries"
import {
  checkTemplate,
  DEFAULT_TEMPLATES,
  normalizeTemplateBody,
  TEMPLATE_KEYS,
  TEMPLATE_LABEL,
  TEMPLATE_MAX_LENGTH,
} from "./render"

export type TemplateResult =
  { ok: true; message: string } | { ok: false; message: string; problems?: string[] }

const inputSchema = z.object({
  key: z.enum(TEMPLATE_KEYS),
  body: z
    .string()
    .max(TEMPLATE_MAX_LENGTH + 500)
    .transform(normalizeTemplateBody),
})

async function requireOwner(): Promise<string | TemplateResult> {
  try {
    return (await requireRole(CAN_MANAGE_MASTER)).id
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    throw error
  }
}

function revalidate() {
  revalidatePath("/master-data/pengaturan")
  revalidatePath("/pesanan/baru")
}

/**
 * Simpan template (Owner). Ditolak bila Isi Otomatis tidak akan bisa membaca pesanan dari
 * template ini (label wajib hilang, penanda salah, menu tidak terbaca).
 */
export async function saveTemplate(input: unknown): Promise<TemplateResult> {
  const userId = await requireOwner()
  if (typeof userId !== "string") return userId
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: "Template tidak terbaca. Muat ulang halaman." }
  const { key, body } = parsed.data

  const { menus, shippingLines } = await getTemplateSources()
  const { problems } = checkTemplate(key, body, menus, shippingLines)
  if (problems.length > 0) {
    return { ok: false, message: "Template belum bisa disimpan. Perbaiki dulu:", problems }
  }

  // Sama dengan bawaan: simpan sebagai "bawaan" supaya ikut pembaruan template bawaan berikutnya.
  if (body === normalizeTemplateBody(DEFAULT_TEMPLATES[key])) {
    await getDb().delete(messageTemplates).where(eq(messageTemplates.key, key))
    revalidate()
    return { ok: true, message: `Template ${TEMPLATE_LABEL[key]} disimpan (sama dengan bawaan).` }
  }

  const values = { body, updatedBy: userId, updatedAt: new Date() }
  await getDb()
    .insert(messageTemplates)
    .values({ key, ...values })
    .onConflictDoUpdate({ target: messageTemplates.key, set: values })
  revalidate()
  return { ok: true, message: `Template ${TEMPLATE_LABEL[key]} disimpan.` }
}
