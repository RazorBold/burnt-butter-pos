import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import postgres from "postgres"

import { directDatabaseUrl } from "../../src/db/url"
import { PHOTO_BUCKET } from "../../src/lib/photos"

config({ path: ".env.local", quiet: true })

/** Hapus satu kurir uji (nama diawali "QA Kurir "). */
export async function removeCourierByName(name: string) {
  if (!name.startsWith("QA Kurir "))
    throw new Error("Hanya kurir uji (QA Kurir …) yang boleh dihapus")
  const url = directDatabaseUrl()
  if (!url) return
  const sql = postgres(url, { max: 1 })
  try {
    await sql`delete from couriers where name = ${name}`
  } finally {
    await sql.end()
  }
}

/**
 * Hapus satu menu uji (berdasarkan nama persisnya) beserta fotonya di Storage.
 * DB lokal = DB produksi, jadi hanya baris yang dibuat test itu sendiri yang dihapus.
 */
export async function removeMenuByName(name: string) {
  if (!name.startsWith("QA Menu ")) throw new Error("Hanya menu uji (QA Menu …) yang boleh dihapus")
  const url = directDatabaseUrl()
  if (!url) return
  const sql = postgres(url, { max: 1 })
  try {
    const rows = await sql<{ photo_path: string | null }[]>`
      delete from menus where name = ${name} returning photo_path`
    const paths = rows
      .map((row) => row.photo_path)
      .filter((p): p is string => !!p && !p.startsWith("/"))
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const secret = process.env.SUPABASE_SECRET_KEY
    if (paths.length && supabaseUrl && secret) {
      await createClient(supabaseUrl, secret, { auth: { persistSession: false } })
        .storage.from(PHOTO_BUCKET)
        .remove(paths)
    }
  } finally {
    await sql.end()
  }
}
