"use server"

import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getDb } from "@/db"
import { profiles } from "@/db/schema"
import { safeNextPath } from "@/lib/access"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Format email belum benar.")),
  password: z.string().min(1, "Kata sandi wajib diisi."),
  next: z.string().optional(),
})

export type SignInState = {
  error?: string
  email?: string
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  })
  const email = String(formData.get("email") ?? "")
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Periksa lagi isian kamu.", email }
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) {
    const message =
      error?.code === "invalid_credentials"
        ? "Email atau kata sandi salah."
        : error?.code === "user_banned"
          ? "Akun ini sedang dinonaktifkan. Hubungi Owner."
          : error?.status === 429
            ? "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi."
            : "Belum bisa masuk. Coba lagi sebentar lagi."
    return { error: message, email }
  }

  const [profile] = await getDb()
    .select({ isActive: profiles.isActive })
    .from(profiles)
    .where(eq(profiles.id, data.user.id))
    .limit(1)

  if (!profile?.isActive) {
    await supabase.auth.signOut({ scope: "local" })
    return {
      error: "Akun ini belum punya akses ke panel. Minta Admin mengaktifkannya di User / Staff.",
      email,
    }
  }

  redirect(safeNextPath(parsed.data.next))
}

/** Keluar dari perangkat ini saja; sesi di perangkat lain (mis. HP kasir) tetap aktif. */
export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut({ scope: "local" })
  redirect("/login")
}
