"use server"

import { and, eq, ne, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { authUsers } from "drizzle-orm/supabase"

import { getDb } from "@/db"
import { profiles } from "@/db/schema"
import type { Role } from "@/lib/access"
import { AuthorizationError, type CurrentUser, requireRole } from "@/lib/auth"
import { fieldErrors } from "@/lib/form"
import { generatePassword } from "@/lib/password"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

import { createStaffSchema, staffFormFromData, updateStaffSchema } from "./schemas"

const PAGE_PATH = "/master-data/user-staff"
// Akun nonaktif juga diblokir di Supabase Auth, supaya sesi lamanya tidak bisa diperpanjang.
const BAN_FOREVER = "876000h"

export type Credentials = { email: string; password: string }

export type StaffFormState = {
  ok?: boolean
  message?: string
  errors?: Record<string, string>
  /** Hanya ada sekali, tepat setelah akun dibuat. Tidak disimpan di mana pun. */
  credentials?: Credentials
}

type ActionResult = { ok: boolean; message: string }

async function requireAdmin(): Promise<CurrentUser | string> {
  try {
    return await requireRole(["admin"])
  } catch (error) {
    if (error instanceof AuthorizationError) return error.message
    throw error
  }
}

/**
 * Aturan yang mencegah panel terkunci: Admin tidak bisa menurunkan role atau menonaktifkan
 * akunnya sendiri, dan harus selalu ada minimal satu Admin aktif.
 */
async function guardChange(
  actor: CurrentUser,
  target: { id: string; role: Role; isActive: boolean },
  next: { role: Role; isActive: boolean },
): Promise<string | undefined> {
  if (target.id === actor.id) {
    if (!next.isActive) return "Kamu tidak bisa menonaktifkan akunmu sendiri."
    if (next.role !== target.role) return "Role akunmu sendiri hanya bisa diubah Admin lain."
  }
  const losesAdmin = target.role === "admin" && target.isActive
  if (losesAdmin && (next.role !== "admin" || !next.isActive)) {
    const [other] = await getDb()
      .select({ id: profiles.id })
      .from(profiles)
      .where(
        and(eq(profiles.role, "admin"), eq(profiles.isActive, true), ne(profiles.id, target.id)),
      )
      .limit(1)
    if (!other) return "Harus ada minimal satu Admin aktif."
  }
}

async function findProfile(id: string) {
  const [profile] = await getDb()
    .select({ id: profiles.id, role: profiles.role, isActive: profiles.isActive })
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1)
  return profile
}

async function setAuthBan(id: string, isActive: boolean) {
  const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(id, {
    ban_duration: isActive ? "none" : BAN_FOREVER,
  })
  return error
}

export async function createStaff(
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const actor = await requireAdmin()
  if (typeof actor === "string") return { message: actor }

  const parsed = createStaffSchema.safeParse(staffFormFromData(formData))
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Periksa lagi isian yang ditandai." }
  }
  const input = parsed.data
  const db = getDb()

  const [existing] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(sql`lower(${authUsers.email}) = ${input.email}`)
    .limit(1)
  if (existing) return { errors: { email: "Email ini sudah dipakai akun lain." } }

  const password = generatePassword()
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) {
    if (error?.code === "email_exists") {
      return { errors: { email: "Email ini sudah dipakai akun lain." } }
    }
    return { message: "Akun belum bisa dibuat. Coba lagi sebentar lagi." }
  }

  try {
    await db.insert(profiles).values({ id: data.user.id, name: input.name, role: input.role })
  } catch (insertError) {
    // Jangan tinggalkan user Auth tanpa profil (tidak bisa dipakai, tapi emailnya terpakai).
    await admin.auth.admin.deleteUser(data.user.id)
    throw insertError
  }

  revalidatePath(PAGE_PATH)
  return {
    ok: true,
    message: "Akun staf dibuat.",
    credentials: { email: input.email, password },
  }
}

export async function updateStaff(
  _prev: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const actor = await requireAdmin()
  if (typeof actor === "string") return { message: actor }

  const parsed = updateStaffSchema.safeParse(staffFormFromData(formData))
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), message: "Periksa lagi isian yang ditandai." }
  }
  const input = parsed.data

  const target = await findProfile(input.id)
  if (!target) return { message: "Akun tidak ditemukan. Muat ulang halaman." }
  const blocked = await guardChange(actor, target, input)
  if (blocked) return { message: blocked }

  if (input.isActive !== target.isActive && (await setAuthBan(input.id, input.isActive))) {
    return { message: "Status akun belum bisa diubah. Coba lagi sebentar lagi." }
  }
  await getDb()
    .update(profiles)
    .set({ name: input.name, role: input.role, isActive: input.isActive })
    .where(eq(profiles.id, input.id))

  revalidatePath(PAGE_PATH)
  return { ok: true, message: "Data staf disimpan." }
}

export async function setStaffActive(id: string, isActive: boolean): Promise<ActionResult> {
  const actor = await requireAdmin()
  if (typeof actor === "string") return { ok: false, message: actor }

  const target = await findProfile(id)
  if (!target) return { ok: false, message: "Akun tidak ditemukan. Muat ulang halaman." }
  const blocked = await guardChange(actor, target, { role: target.role, isActive })
  if (blocked) return { ok: false, message: blocked }

  if (await setAuthBan(id, isActive)) {
    return { ok: false, message: "Status akun belum bisa diubah. Coba lagi sebentar lagi." }
  }
  await getDb().update(profiles).set({ isActive }).where(eq(profiles.id, id))

  revalidatePath(PAGE_PATH)
  return {
    ok: true,
    message: isActive
      ? "Akun diaktifkan. Staf bisa masuk lagi."
      : "Akun dinonaktifkan. Staf tidak bisa masuk sampai diaktifkan lagi.",
  }
}

export async function resetStaffPassword(
  id: string,
): Promise<{ ok: true; password: string } | { ok: false; message: string }> {
  const actor = await requireAdmin()
  if (typeof actor === "string") return { ok: false, message: actor }

  if (!(await findProfile(id))) {
    return { ok: false, message: "Akun tidak ditemukan. Muat ulang halaman." }
  }
  const password = generatePassword()
  const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(id, { password })
  if (error)
    return { ok: false, message: "Kata sandi belum bisa diganti. Coba lagi sebentar lagi." }
  return { ok: true, password }
}
