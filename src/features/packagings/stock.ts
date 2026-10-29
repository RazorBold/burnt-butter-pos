// Status stok dan perubahan stok manual (masuk, keluar, hitung ulang). Murni supaya bisa diuji
// dan dipakai di klien (pratinjau) maupun server (validasi). Dipakai Stok Packaging (bilangan
// bulat) dan Bahan Baku (boleh 2 angka di belakang koma, mis. 2,5 kg).

import { formatJumlah } from "@/lib/format"

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

/** Banyaknya angka di belakang koma: 0 untuk packaging (pcs), 2 untuk bahan baku (kg, liter). */
export type StockDecimals = 0 | 2

/** Bulatkan ke jumlah desimal yang diizinkan, supaya 0,1 + 0,2 tidak jadi 0,30000000000000004. */
function round(value: number, decimals: StockDecimals) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

/** Jumlah sah: angka >= 0 dengan desimal tidak melebihi yang diizinkan. */
export function isValidQty(value: number, decimals: StockDecimals = 0): boolean {
  return Number.isFinite(value) && value >= 0 && round(value, decimals) === value
}

/**
 * Baca jumlah yang diketik pengguna. Koma = desimal ("2,5"); titik dianggap pemisah ribuan
 * bila ada koma atau bila tepat diikuti 3 angka ("1.000"), selain itu desimal ("2.5").
 * Kosong → null, tidak terbaca → NaN.
 */
export function parseQty(text: string): number | null {
  const value = text.trim().replace(/\s/g, "")
  if (!value) return null
  let normalized: string
  if (value.includes(",")) normalized = value.replace(/\./g, "").replace(",", ".")
  else if (/^\d{1,3}(\.\d{3})+$/.test(value)) normalized = value.replace(/\./g, "")
  else normalized = value
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN
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
  decimals: StockDecimals = 0,
): MovementPlan {
  if (!isValidQty(qty, decimals)) {
    return {
      ok: false,
      message:
        decimals === 0
          ? "Isi jumlah dengan angka bulat."
          : "Isi jumlah dengan angka, paling banyak 2 angka di belakang koma.",
    }
  }
  const amount = (value: number) => `${formatJumlah(value)} ${unit}`
  if (mode === "hitung") {
    const diff = round(qty - stock, decimals)
    if (diff === 0)
      return { ok: false, message: `Hasil hitung sama dengan stok tercatat (${amount(stock)}).` }
    return { ok: true, direction: diff > 0 ? "in" : "out", qty: Math.abs(diff), nextStock: qty }
  }
  if (qty === 0) return { ok: false, message: "Jumlah harus lebih dari 0." }
  if (mode === "keluar") {
    if (qty > stock) return { ok: false, message: `Stok tinggal ${amount(stock)}.` }
    return { ok: true, direction: "out", qty, nextStock: round(stock - qty, decimals) }
  }
  return { ok: true, direction: "in", qty, nextStock: round(stock + qty, decimals) }
}
