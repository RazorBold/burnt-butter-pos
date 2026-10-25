// URL database dari env. Integrasi Supabase di Vercel mengisi POSTGRES_URL (pooler transaction,
// port 6543) dan POSTGRES_URL_NON_POOLING (pooler session, port 5432). DATABASE_URL dan
// DIRECT_DATABASE_URL bisa menimpa keduanya (dipakai di lokal).

// Parameter khusus Prisma/Supavisor yang tidak dikenal driver postgres-js.
const UNSUPPORTED_PARAMS = ["supa", "pgbouncer"]

function clean(raw: string): string {
  const url = new URL(raw)
  for (const param of UNSUPPORTED_PARAMS) url.searchParams.delete(param)
  return url.toString()
}

/**
 * Untuk aplikasi. Produksi (Vercel): POSTGRES_URL, pooler mode transaction (port 6543).
 * Mode session tidak dipakai di Vercel karena dibatasi 15 klien untuk seluruh aplikasi, dan
 * banyak instance fungsi langsung menghabiskannya (EMAXCONNSESSION).
 * Lokal: isi DATABASE_URL dengan URL mode session (POSTGRES_URL_NON_POOLING). Satu proses lokal
 * melayani banyak request sekaligus, dan di mode transaction pipelining postgres-js bisa membuat
 * query menggantung (lihat docs/ARCHITECTURE.md).
 */
export function appDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL ?? process.env.POSTGRES_URL
  return raw ? clean(raw) : undefined
}

/** Untuk migrasi dan seed: koneksi session (mendukung prepared statement & DDL). */
export function directDatabaseUrl(): string | undefined {
  const raw = process.env.DIRECT_DATABASE_URL ?? process.env.POSTGRES_URL_NON_POOLING
  return raw ? clean(raw) : undefined
}
