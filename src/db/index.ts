import "server-only"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "./schema"
import { appDatabaseUrl } from "./url"

const globalForDb = globalThis as unknown as {
  db?: Db
  dbSchema?: typeof schema
  client?: postgres.Sql
}

function createDb() {
  const url = appDatabaseUrl()
  if (!url) throw new Error("POSTGRES_URL / DATABASE_URL belum diisi. Lihat .env.example.")

  if (globalForDb.client) {
    try {
      globalForDb.client.end({ timeout: 2 }).catch(() => {})
    } catch {
      // Abaikan jika sudah tertutup
    }
  }

  // Mode session (port 5432) dibatasi 15 klien untuk SEMUA proses sekaligus (laptop, VPS,
  // script). Proses yang memakainya cukup 5 koneksi; antrean query aman di mode session.
  const sessionMode = new URL(url).port === "5432"
  const client = postgres(url, {
    // Pooler mode transaction tidak mendukung prepared statement.
    prepare: false,
    // postgres-js baru memipelinekan query bila semua koneksinya sibuk. Di mode transaction
    // (Vercel) koneksi yang cukup membuat pipelining (yang bermasalah di sana) praktis tidak terjadi.
    max: sessionMode ? 5 : 10,
    // Pooler menutup koneksi yang lama menganggur tanpa memberi tahu klien. Tutup duluan dari
    // sisi kita, batasi umur koneksi, dan jangan menunggu tanpa batas saat membuka koneksi.
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
  })
  globalForDb.client = client

  return drizzle(client, { schema })
}

export type Db = ReturnType<typeof createDb>

// Dibuat saat pertama dipakai (bukan saat import) supaya build tidak butuh DATABASE_URL,
// dan disimpan di globalThis supaya hot reload di dev tidak membuka koneksi baru terus.
// Dibuat ulang bila schema.ts berubah saat `pnpm dev` hidup: klien lama memegang skema lama, dan
// query relasional (db.query.*) diam-diam tidak membaca kolom baru. Koneksi lama tutup sendiri
// lewat idle_timeout.
export function getDb(): Db {
  if (!globalForDb.db || globalForDb.dbSchema !== schema) {
    globalForDb.db = createDb()
    globalForDb.dbSchema = schema
  }
  return globalForDb.db
}
