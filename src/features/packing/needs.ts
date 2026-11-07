// Pemakaian packaging per pesanan dari riwayat stok, dan cek stok saat packing. Murni supaya
// bisa diuji dan dipakai di klien (dialog packing) maupun server.

/** Jumlah satu jenis packaging. */
export type PackagingUse = { packagingId: string; qty: number }

/**
 * Pemakaian bersih packaging satu pesanan dari riwayat stok: keluar dikurangi masuk (stok yang
 * dikembalikan saat packing dibatalkan). Hanya yang masih > 0.
 */
export function netUsage(
  movements: { packagingId: string; direction: "in" | "out"; qty: number }[],
  packagingOrder: string[] = [],
): PackagingUse[] {
  const total = new Map<string, number>()
  for (const movement of movements) {
    const sign = movement.direction === "out" ? 1 : -1
    total.set(movement.packagingId, (total.get(movement.packagingId) ?? 0) + sign * movement.qty)
  }
  return sortUses(
    [...total].filter(([, qty]) => qty > 0).map(([packagingId, qty]) => ({ packagingId, qty })),
    packagingOrder,
  )
}

/**
 * Packaging pertama yang stoknya kurang untuk pemakaian ini, untuk pesan "stok X kurang".
 * `stock` = stok tercatat sekarang per packaging.
 */
export function firstShortage(
  uses: PackagingUse[],
  stock: Map<string, { name: string; stock: number; unit: string }>,
): string | null {
  for (const use of uses) {
    const item = stock.get(use.packagingId)
    if (!item) return "packaging tidak dikenal"
    if (item.stock < use.qty) {
      return `stok ${item.name} kurang (sisa ${item.stock}, butuh ${use.qty} ${item.unit})`
    }
  }
  return null
}

function sortUses(uses: PackagingUse[], order: string[]): PackagingUse[] {
  if (order.length === 0) return uses
  const rank = (id: string) => {
    const index = order.indexOf(id)
    return index === -1 ? order.length : index
  }
  return [...uses].sort((a, b) => rank(a.packagingId) - rank(b.packagingId))
}
