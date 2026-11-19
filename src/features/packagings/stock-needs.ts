// Kebutuhan stok loyang dan box hampers dari item pesanan. Murni dan dipakai bersama oleh
// pemotongan stok saat Lunas (order-stock.ts) dan pantauan pesanan belum bayar di Dashboard,
// supaya hitungannya selalu sama.

import { isHampersCategory } from "@/features/orders/order-type"

export type NeedItem = {
  menuName: string
  categoryName: string | null
  size: "large" | "regular" | "single"
  qty: number
  /** Loyang per porsi (Master Data › Produk & Menu). Default 1. */
  loyangQty?: number
  /** Hanya untuk ukuran "single": loyang yang dipakai, null = tanpa loyang. */
  loyangSize?: "large" | "regular" | "single" | null
}

/**
 * Loyang yang dipakai satu baris item: ukuran Large/Regular memakai loyang seukurannya sebanyak
 * `loyangQty` per porsi; menu satu harga hanya memakai loyang bila `loyangSize` diatur Owner.
 */
export function loyangNeed(item: NeedItem): { size: "large" | "regular"; qty: number } | null {
  const perPortion = item.loyangQty ?? 1
  if (item.qty <= 0 || perPortion <= 0) return null
  const size =
    item.size === "single"
      ? item.loyangSize === "large" || item.loyangSize === "regular"
        ? item.loyangSize
        : null
      : item.size
  return size ? { size, qty: item.qty * perPortion } : null
}

export type StockNeeds = {
  loyangLarge: number
  loyangRegular: number
  /** Nama box packaging (mis. "Hampers LARGE") → jumlah. */
  boxes: Record<string, number>
}

/**
 * Box hampers per ukuran (keputusan pemilik toko, 19 Nov 2026): semua menu kategori Hampers
 * memakai box yang sama per ukuran, tidak lagi box per menu.
 */
export const HAMPERS_BOX_NAME = { large: "Hampers LARGE", regular: "Hampers REGULER" } as const

/**
 * Box per menu sebelum 19 Nov 2026 (sudah diarsipkan). Tetap dikenali supaya stok yang dulu
 * terpotong dari box ini kembali bila pesanan lamanya dibatalkan.
 */
export const LEGACY_HAMPERS_BOX_NAMES = [
  "Classic Red (Large)",
  "Classic Red (Regular)",
  "Mac & Joy (Large)",
  "Mac & Joy (Regular)",
  "Melted Cheese (Large)",
  "Melted Cheese (Regular)",
  "Holy E Olio (Large)",
  "Holy E Olio (Regular)",
]

/** Kunci nama box: huruf kecil, "regular" disamakan dengan "reguler" (ejaan di Master Data). */
export function boxKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ").replace("regular", "reguler")
}

/** Nama box packaging untuk satu porsi menu hampers ukuran ini. */
export function hampersBoxName(size: "large" | "regular"): string {
  return HAMPERS_BOX_NAME[size]
}

/**
 * Loyang: sesuai pengaturan loyang per porsi tiap menu (lihat `loyangNeed`). Box: hanya menu di
 * kategori Hampers, satu Hampers LARGE/REGULER per porsi sesuai ukuran; menu pasta biasa tidak
 * dihitung.
 */
export function stockNeeds(items: NeedItem[]): StockNeeds {
  const needs: StockNeeds = { loyangLarge: 0, loyangRegular: 0, boxes: {} }
  for (const item of items) {
    const loyang = loyangNeed(item)
    if (loyang?.size === "large") needs.loyangLarge += loyang.qty
    else if (loyang) needs.loyangRegular += loyang.qty
    if (item.size === "single" || item.qty <= 0 || !isHampersCategory(item.categoryName)) continue
    const box = hampersBoxName(item.size)
    needs.boxes[box] = (needs.boxes[box] ?? 0) + item.qty
  }
  return needs
}
