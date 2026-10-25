// Status stok dan perubahan stok manual (masuk, keluar, hitung ulang). Murni supaya bisa diuji
// dan dipakai di klien (pratinjau) maupun server (validasi). Dipakai juga oleh Bahan Baku nanti.

export type StockStatus = "cukup" | "menipis" | "habis"

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  cukup: "Cukup",
  menipis: "Menipis",
  habis: "Habis",
}

/** Habis bila 0, Menipis bila sama dengan atau di bawah stok minimum, selain itu Cukup. */
export function stockStatus(stock: number, minStock: number | null): StockStatus {
  if (stock <= 0) return "habis"
  if (minStock !== null && stock <= minStock) return "menipis"
  return "cukup"
}

export const MOVEMENT_MODES = ["masuk", "keluar", "hitung"] as const
export type MovementMode = (typeof MOVEMENT_MODES)[number]

export const MOVEMENT_MODE_LABEL: Record<MovementMode, string> = {
  masuk: "Stok masuk",
  keluar: "Stok keluar",
  hitung: "Hitung ulang",
}

export type MovementPlan =
  | { ok: true; direction: "in" | "out"; qty: number; nextStock: number }
  | { ok: false; message: string }

/**
 * Ubah input form jadi satu pergerakan stok.
 * - masuk/keluar: `qty` adalah jumlah yang masuk/keluar.
 * - hitung: `qty` adalah hasil hitung fisik; yang dicatat selisihnya dengan stok tercatat.
 */
export function planMovement(
  mode: MovementMode,
  qty: number,
  stock: number,
  unit = "pcs",
): MovementPlan {
  if (!Number.isInteger(qty) || qty < 0)
    return { ok: false, message: "Isi jumlah dengan angka bulat." }
  if (mode === "hitung") {
    const diff = qty - stock
    if (diff === 0)
      return { ok: false, message: `Hasil hitung sama dengan stok tercatat (${stock} ${unit}).` }
    return { ok: true, direction: diff > 0 ? "in" : "out", qty: Math.abs(diff), nextStock: qty }
  }
  if (qty === 0) return { ok: false, message: "Jumlah minimal 1." }
  if (mode === "keluar") {
    if (qty > stock) return { ok: false, message: `Stok tinggal ${stock} ${unit}.` }
    return { ok: true, direction: "out", qty, nextStock: stock - qty }
  }
  return { ok: true, direction: "in", qty, nextStock: stock + qty }
}
