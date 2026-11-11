// Aktivitas terbaru untuk lonceng notifikasi: pesanan baru, lunas, status, edit, urgent, dan stok.
// Murni (tanpa DB) supaya bisa diuji dan dipakai di klien.

export const ACTIVITY_KINDS = ["order", "paid", "status", "edit", "urgent", "stock"] as const
export type ActivityKind = (typeof ACTIVITY_KINDS)[number]

export type Activity = {
  /** Unik antar sumber, mis. "paid:<payment id>". */
  id: string
  kind: ActivityKind
  /** ISO string supaya aman dikirim dari server ke klien. */
  at: string
  title: string
  detail: string | null
  href: string | null
  actorId: string | null
  actorName: string | null
}

export const ACTIVITY_LIMIT = 40

/** Gabung beberapa sumber, terbaru di atas, dan potong ke batas. */
export function mergeActivity(lists: Activity[][], limit = ACTIVITY_LIMIT): Activity[] {
  return lists
    .flat()
    .sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id))
    .slice(0, limit)
}

/** Belum dibaca: lebih baru dari terakhir dilihat dan bukan dibuat oleh user ini sendiri. */
export function unreadActivity(items: Activity[], seenAt: string | null, userId: string) {
  if (!seenAt) return []
  return items.filter((item) => item.at > seenAt && item.actorId !== userId)
}
