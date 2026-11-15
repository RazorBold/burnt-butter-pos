// Pesanan lunas mana yang belum dilihat staf ini. Murni supaya bisa diuji. "Dilihat" disimpan
// per browser sebagai waktu lunas terbaru yang sudah di-"Siap, diproses"-kan.

export type PaidStamp = { id: string; paidAt: string }

/**
 * Lunas setelah `lastSeen` (ISO). Tanpa `lastSeen` (browser baru): tidak ada, supaya perangkat
 * yang baru login tidak langsung dibanjiri pesanan lunas hari ini; titik awalnya disimpan dulu.
 */
export function unseenPaid<T extends PaidStamp>(orders: T[], lastSeen: string | null): T[] {
  if (!lastSeen) return []
  const seen = Date.parse(lastSeen)
  return orders.filter((order) => Date.parse(order.paidAt) > seen)
}

/** Waktu lunas terbaru di daftar, untuk disimpan setelah popup ditutup. */
export function latestPaidAt(orders: PaidStamp[], fallback: string | null): string | null {
  return orders.reduce<string | null>(
    (latest, order) =>
      !latest || Date.parse(order.paidAt) > Date.parse(latest) ? order.paidAt : latest,
    fallback,
  )
}
