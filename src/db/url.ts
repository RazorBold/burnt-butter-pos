// URL database dari env. Integrasi Supabase di Vercel mengisi POSTGRES_URL (pooler transaction,
// port 6543) dan POSTGRES_URL_NON_POOLING (session, port 5432). DATABASE_URL dan
// DIRECT_DATABASE_URL tetap bisa dipakai untuk menimpa keduanya di luar Vercel.

// Parameter khusus Prisma/Supavisor yang tidak dikenal driver postgres-js.
const UNSUPPORTED_PARAMS = ["supa", "pgbouncer"]

function clean(raw: string): string {
  const url = new URL(raw)
  for (const param of UNSUPPORTED_PARAMS) url.searchParams.delete(param)
  return url.toString()
}

/** Untuk aplikasi (serverless): pooler mode transaction. */
export function pooledDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
  return raw ? clean(raw) : undefined
}

/** Untuk migrasi dan seed: koneksi session (mendukung prepared statement & DDL). */
export function directDatabaseUrl(): string | undefined {
  const raw = process.env.DIRECT_DATABASE_URL ?? process.env.POSTGRES_URL_NON_POOLING
  return raw ? clean(raw) : undefined
}
