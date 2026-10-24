import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import postgres from "postgres"

import { directDatabaseUrl } from "../../src/db/url"
import { PHOTO_BUCKET } from "../../src/lib/photos"

config({ path: ".env.local", quiet: true })

/** Hapus satu customer uji (nama diawali "QA Customer "). */
export async function removeCustomerByName(name: string) {
  if (!name.startsWith("QA Customer "))
    throw new Error("Hanya customer uji (QA Customer …) yang boleh dihapus")
  const url = directDatabaseUrl()
  if (!url) return
  const sql = postgres(url, { max: 1 })
  try {
    await sql`delete from customers where name = ${name}`
  } finally {
    await sql.end()
  }
}

/**
 * Simpan isi Pengaturan toko sebelum test dan kembalikan persis sesudahnya (termasuk "belum
 * pernah disimpan"), karena tabel ini hanya satu baris dan dipakai data asli.
 */
export async function snapshotStoreSettings(): Promise<() => Promise<void>> {
  const url = directDatabaseUrl()
  if (!url) return async () => {}
  const sql = postgres(url, { max: 1 })
  const [row] = await sql<Record<string, unknown>[]>`select * from store_settings where id = 1`
  await sql.end()
  return async () => {
    const restore = postgres(url, { max: 1 })
    try {
      await restore`delete from store_settings where id = 1`
      if (row) await restore`insert into store_settings ${restore(row)}`
    } finally {
      await restore.end()
    }
  }
}

/** Hapus satu akun staf uji (email qa-staff-…@example.com) dari Auth; profilnya ikut terhapus. */
export async function removeStaffByEmail(email: string) {
  if (!/^qa-staff-[\w-]+@example\.com$/.test(email))
    throw new Error("Hanya akun uji (qa-staff-…@example.com) yang boleh dihapus")
  const url = directDatabaseUrl()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !supabaseUrl || !secret) return
  const sql = postgres(url, { max: 1 })
  try {
    const rows = await sql<{ id: string }[]>`select id from auth.users where email = ${email}`
    const admin = createClient(supabaseUrl, secret, { auth: { persistSession: false } })
    for (const row of rows) await admin.auth.admin.deleteUser(row.id)
  } finally {
    await sql.end()
  }
}

/** Hapus satu metode pembayaran uji (nama diawali "QA Metode "). */
export async function removePaymentMethodByName(name: string) {
  if (!name.startsWith("QA Metode "))
    throw new Error("Hanya metode uji (QA Metode …) yang boleh dihapus")
  const url = directDatabaseUrl()
  if (!url) return
  const sql = postgres(url, { max: 1 })
  try {
    await sql`delete from payment_methods where name = ${name}`
  } finally {
    await sql.end()
  }
}

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
