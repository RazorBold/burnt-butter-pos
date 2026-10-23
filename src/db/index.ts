import "server-only"

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "./schema"
import { pooledDatabaseUrl } from "./url"

function createDb() {
  const url = pooledDatabaseUrl()
  if (!url) throw new Error("POSTGRES_URL / DATABASE_URL belum diisi. Lihat .env.example.")
  // Pooler Supabase mode transaction tidak mendukung prepared statement.
  return drizzle(postgres(url, { prepare: false, max: 5 }), { schema })
}

export type Db = ReturnType<typeof createDb>

// Dibuat saat pertama dipakai (bukan saat import) supaya build tidak butuh DATABASE_URL,
// dan disimpan di globalThis supaya hot reload di dev tidak membuka koneksi baru terus.
const globalForDb = globalThis as unknown as { db?: Db }

export function getDb(): Db {
  globalForDb.db ??= createDb()
  return globalForDb.db
}
