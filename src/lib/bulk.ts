// Hasil aksi massal (BELL-19) untuk toast: berapa yang diproses, mana yang dilewati dan kenapa.
// Murni supaya bisa diuji dan dipakai di Server Action mana pun.

/** Batas pesanan per aksi massal. Satu halaman tabel berisi 10 baris. */
export const BULK_LIMIT = 100

export type BulkSkip = { orderNo: string; reason: string }

/** `details` (opsional) menyebut pesanan yang dilewati, ditampilkan di bawah pesan toast. */
export type BulkResult = { ok: boolean; message: string; details?: string }

/**
 * Pesan untuk satu pesanan (`one`) atau banyak (`many`). Bila tidak ada yang diproses,
 * hasilnya gagal dan alasannya disebut satu per satu.
 */
export function summarizeBulk({
  done,
  skipped,
  one,
  many,
}: {
  done: string[]
  skipped: BulkSkip[]
  one: (orderNo: string) => string
  many: (count: number) => string
}): BulkResult {
  const list = skipped.map((skip) => `${skip.orderNo} (${skip.reason})`).join(", ")
  if (done.length === 0) {
    return {
      ok: false,
      message: "Tidak ada pesanan yang diubah.",
      details: skipped.length ? `Dilewati: ${list}.` : undefined,
    }
  }
  return {
    ok: true,
    message: done.length === 1 ? one(done[0]) : many(done.length),
    details: skipped.length ? `${skipped.length} dilewati: ${list}.` : undefined,
  }
}
