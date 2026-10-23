// Membuat (atau memperbarui) akun staf: user Supabase Auth + baris profiles.
// Dipakai untuk akun Admin pertama; setelah Master Data › User / Staff jadi, Admin membuat akun dari UI.
//
//   pnpm user:create --email admin@contoh.com --name "Admin" --role admin
//   pnpm user:create --email kasir@contoh.com --name "Kasir" --role kasir --password "rahasia123"
//   pnpm user:create --email admin@contoh.com --reset-password
//
// Tanpa --password, kata sandi acak dibuat dan dicetak sekali di terminal.

import { randomBytes } from "node:crypto"
import { parseArgs } from "node:util"

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import postgres from "postgres"

import { ROLES, type Role } from "../src/lib/access"
import { directDatabaseUrl } from "../src/db/url"

config({ path: ".env.local", quiet: true })

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string" },
    password: { type: "string" },
    "reset-password": { type: "boolean", default: false },
  },
})

function fail(message: string): never {
  console.error(`✗ ${message}`)
  process.exit(1)
}

function generatePassword() {
  // 16 karakter tanpa huruf yang mudah tertukar (0/O, 1/l/I).
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from(randomBytes(16), (byte) => alphabet[byte % alphabet.length]).join("")
}

async function main() {
  const email = values.email?.trim().toLowerCase()
  if (!email) fail("--email wajib diisi")

  const role = values.role as Role | undefined
  if (role && !ROLES.includes(role)) fail(`--role harus salah satu dari: ${ROLES.join(", ")}`)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  const dbUrl = directDatabaseUrl()
  if (!url || !secretKey || !dbUrl)
    fail("Env Supabase belum lengkap. Jalankan: vercel env pull .env.local")

  const supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const sql = postgres(dbUrl, { max: 1 })

  try {
    const [existing] = await sql<{ id: string }[]>`select id from auth.users where email = ${email}`
    const password = values.password ?? generatePassword()
    let userId: string
    let passwordChanged = false

    if (existing) {
      userId = existing.id
      if (values["reset-password"] || values.password) {
        const { error } = await supabase.auth.admin.updateUserById(userId, { password })
        if (error) fail(`Gagal mengganti kata sandi: ${error.message}`)
        passwordChanged = true
      }
    } else {
      if (!values.name || !role) fail("User baru butuh --name dan --role")
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (error || !data.user) fail(`Gagal membuat user: ${error?.message}`)
      userId = data.user.id
      passwordChanged = true
    }

    if (values.name || role) {
      const name = values.name ?? email
      await sql`
        insert into profiles (id, name, role, is_active)
        values (${userId}, ${name}, ${role ?? "kasir"}, true)
        on conflict (id) do update set
          name = coalesce(${values.name ?? null}, profiles.name),
          role = coalesce(${role ?? null}::user_role, profiles.role),
          is_active = true,
          updated_at = now()`
    }

    const [profile] = await sql<{ name: string; role: string; is_active: boolean }[]>`
      select name, role, is_active from profiles where id = ${userId}`
    if (!profile) fail("User ada di Auth tapi belum punya profil. Ulangi dengan --name dan --role.")

    console.log(
      `✓ ${existing ? "Diperbarui" : "Dibuat"}: ${email} (${profile.name}, ${profile.role})`,
    )
    if (passwordChanged && !values.password) {
      console.log(`  Kata sandi: ${password}`)
      console.log("  Simpan sekarang; kata sandi ini tidak ditampilkan lagi.")
    }
  } finally {
    await sql.end()
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)))
