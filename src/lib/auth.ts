import "server-only"

import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { cache } from "react"

import { getDb } from "@/db"
import { profiles } from "@/db/schema"
import { canAccessPath, type Role } from "@/lib/access"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type CurrentUser = {
  id: string
  email: string
  name: string
  role: Role
}

/**
 * User yang sedang login, atau null. Sesi diverifikasi dengan getClaims() (tanda tangan JWT),
 * lalu dicocokkan dengan tabel profiles. User Supabase tanpa profil aktif dianggap tidak login.
 * Membaca cookie, jadi pemanggilnya harus berada di dalam <Suspense>.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null

  const [profile] = await getDb()
    .select({ name: profiles.name, role: profiles.role, isActive: profiles.isActive })
    .from(profiles)
    .where(eq(profiles.id, claims.sub))
    .limit(1)

  if (!profile?.isActive) return null

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    name: profile.name,
    role: profile.role,
  }
})

/** Untuk halaman: arahkan ke /login bila belum login atau akun tidak aktif. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect("/login?alasan=sesi")
  return user
}

/** Untuk halaman: arahkan ke dashboard bila role tidak boleh membuka path ini. */
export async function requirePageAccess(pathname: string): Promise<CurrentUser> {
  const user = await requireUser()
  if (!canAccessPath(user.role, pathname)) redirect("/dashboard?akses=ditolak")
  return user
}

export class AuthorizationError extends Error {
  constructor(message = "Kamu tidak punya akses untuk aksi ini.") {
    super(message)
    this.name = "AuthorizationError"
  }
}

/** Untuk Server Action: lempar error bila belum login atau role tidak termasuk. */
export async function requireRole(roles: readonly Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) throw new AuthorizationError("Sesi berakhir. Silakan masuk lagi.")
  if (!roles.includes(user.role)) throw new AuthorizationError()
  return user
}
