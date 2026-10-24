import "server-only"

import { asc, eq } from "drizzle-orm"
import { authUsers } from "drizzle-orm/supabase"

import { getDb } from "@/db"
import { profiles } from "@/db/schema"

export type StaffRow = {
  id: string
  name: string
  email: string
  role: (typeof profiles.$inferSelect)["role"]
  isActive: boolean
  lastSignInAt: Date | null
}

/** Akun staf beserta email dari Supabase Auth. Urut per role (Admin → Owner), lalu nama. */
export async function listStaff(): Promise<StaffRow[]> {
  const rows = await getDb()
    .select({
      id: profiles.id,
      name: profiles.name,
      email: authUsers.email,
      role: profiles.role,
      isActive: profiles.isActive,
      lastSignInAt: authUsers.lastSignInAt,
    })
    .from(profiles)
    .innerJoin(authUsers, eq(authUsers.id, profiles.id))
    .orderBy(asc(profiles.role), asc(profiles.name))
  return rows.map((row) => ({ ...row, email: row.email ?? "" }))
}
