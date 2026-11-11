export const LOYANG_LARGE_NAME = "Loyang Large"
export const LOYANG_REGULAR_NAME = "Loyang Regular"

export const LOYANG_NAMES = [LOYANG_LARGE_NAME, LOYANG_REGULAR_NAME] as const

/**
 * Hitung sisa kebutuhan pemotongan loyang untuk sebuah pesanan (idempoten).
 */
export function calculateNetLoyangDeduction(
  requiredQty: number,
  previousMovements: { direction: "in" | "out"; qty: number }[],
): number {
  const alreadyDeducted = previousMovements.reduce(
    (acc, m) => acc + (m.direction === "out" ? m.qty : -m.qty),
    0,
  )
  return Math.max(0, requiredQty - alreadyDeducted)
}

/**
 * Hitung jumlah loyang yang perlu dikembalikan saat pesanan mundur dari Selesai / dibatalkan.
 */
export function calculateLoyangReturn(
  previousMovements: { direction: "in" | "out"; qty: number }[],
): number {
  const netDeducted = previousMovements.reduce(
    (acc, m) => acc + (m.direction === "out" ? m.qty : -m.qty),
    0,
  )
  return Math.max(0, netDeducted)
}
