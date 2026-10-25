import "server-only"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "./schema"
import { appDatabaseUrl } from "./url"

function createDb() {
  const url = appDatabaseUrl()
  if (!url) throw new Error("POSTGRES_URL_NON_POOLING / DATABASE_URL belum diisi. Lihat .env.example.")
  return drizzle(
    postgres(url, {
      // Aman untuk mode session maupun transaction.
      prepare: false,
      // Mode session membatasi jumlah koneksi; tiap instance (termasuk fungsi Vercel) cukup 3.
      max: 3,
      // Pooler menutup koneksi yang lama menganggur tanpa memberi tahu klien. Tutup duluan dari
      // sisi kita, batasi umur koneksi, dan jangan menunggu tanpa batas saat membuka koneksi.
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connect_timeout: 10,
    }),
    { schema },
  )
}

export type Db = ReturnType<typeof createDb>

// Dibuat saat pertama dipakai (bukan saat import) supaya build tidak butuh DATABASE_URL,
// dan disimpan di globalThis supaya hot reload di dev tidak membuka koneksi baru terus.
const globalForDb = globalThis as unknown as { db?: Db }

export function getDb(): Db {
  globalForDb.db ??= createDb()
  return globalForDb.db
}
