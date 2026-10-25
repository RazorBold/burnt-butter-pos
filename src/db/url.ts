// URL database dari env. Integrasi Supabase di Vercel mengisi POSTGRES_URL (pooler transaction,
// port 6543) dan POSTGRES_URL_NON_POOLING (pooler session, port 5432). Aplikasi dan skrip
// sama-sama memakai mode session. DATABASE_URL dan DIRECT_DATABASE_URL bisa menimpa.

// Parameter khusus Prisma/Supavisor yang tidak dikenal driver postgres-js.
const UNSUPPORTED_PARAMS = ["supa", "pgbouncer"]

function clean(raw: string): string {
  const url = new URL(raw)
  for (const param of UNSUPPORTED_PARAMS) url.searchParams.delete(param)
  return url.toString()
}

/**
 * Untuk aplikasi: pooler mode session (port 5432). Mode transaction (POSTGRES_URL, port 6543)
 * tidak dipakai: postgres-js mengirim beberapa query beruntun lewat satu koneksi (pipelining),
 * dan Supavisor mode transaction bisa melepas koneksi server di tengahnya. Akibatnya query
 * menggantung (Postgres menunggu ClientRead) atau terselip ke transaksi orang lain.
 * DATABASE_URL tetap bisa dipakai untuk menimpa.
 */
export function appDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL ?? process.env.POSTGRES_URL_NON_POOLING
  return raw ? clean(raw) : undefined
}

/** Untuk migrasi dan seed: koneksi session (mendukung prepared statement & DDL). */
export function directDatabaseUrl(): string | undefined {
  const raw = process.env.DIRECT_DATABASE_URL ?? process.env.POSTGRES_URL_NON_POOLING
  return raw ? clean(raw) : undefined
}
