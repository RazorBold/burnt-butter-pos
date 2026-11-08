// Pesanan urgent mana yang belum dilihat staf ini. Murni supaya bisa diuji. "Dilihat" disimpan
// per browser sebagai waktu urgent terbaru yang sudah di-"Saya mengerti"-kan.

export type UrgentStamp = { id: string; urgentAt: string }

/** Urgent yang ditandai setelah `lastSeen` (ISO). Tanpa `lastSeen`: semua yang masih berjalan. */
export function unseenUrgent<T extends UrgentStamp>(orders: T[], lastSeen: string | null): T[] {
  if (!lastSeen) return orders
  const seen = Date.parse(lastSeen)
  return orders.filter((order) => Date.parse(order.urgentAt) > seen)
}

/** Waktu urgent terbaru di daftar, untuk disimpan setelah "Saya mengerti". */
export function latestUrgentAt(orders: UrgentStamp[], fallback: string | null): string | null {
  return orders.reduce<string | null>(
    (latest, order) =>
      !latest || Date.parse(order.urgentAt) > Date.parse(latest) ? order.urgentAt : latest,
    fallback,
  )
}
