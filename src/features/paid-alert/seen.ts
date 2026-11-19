// Notifikasi popup mana yang belum dilihat staf ini (lunas, selesai packing). Murni supaya bisa
// diuji. "Dilihat" disimpan per browser sebagai waktu kejadian terbaru yang sudah ditutup.

export type PaidStamp = { id: string; paidAt: string }

type At<T> = (item: T) => string
const paidAtOf = (item: PaidStamp) => item.paidAt

/**
 * Kejadian setelah `lastSeen` (ISO). Tanpa `lastSeen` (browser baru): tidak ada, supaya perangkat
 * yang baru login tidak langsung dibanjiri kejadian hari ini; titik awalnya disimpan dulu.
 */
export function unseenSince<T>(items: T[], lastSeen: string | null, at: At<T>): T[] {
  if (!lastSeen) return []
  const seen = Date.parse(lastSeen)
  return items.filter((item) => Date.parse(at(item)) > seen)
}

/** Waktu kejadian terbaru di daftar, untuk disimpan setelah popup ditutup. */
export function latestAt<T>(items: T[], fallback: string | null, at: At<T>): string | null {
  return items.reduce<string | null>(
    (latest, item) => (!latest || Date.parse(at(item)) > Date.parse(latest) ? at(item) : latest),
    fallback,
  )
}

/** Lunas setelah `lastSeen`; lihat `unseenSince`. */
export function unseenPaid<T extends PaidStamp>(orders: T[], lastSeen: string | null): T[] {
  return unseenSince(orders, lastSeen, paidAtOf)
}

/** Waktu lunas terbaru di daftar. */
export function latestPaidAt(orders: PaidStamp[], fallback: string | null): string | null {
  return latestAt(orders, fallback, paidAtOf)
}
