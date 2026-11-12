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
  /** Nama box packaging (mis. "Classic Red (Large)") → jumlah. */
  boxes: Record<string, number>
}

/** Nama box packaging untuk menu hampers. Kosong bila menu tidak punya box yang cocok. */
export function hampersBoxName(menuName: string, size: "large" | "regular"): string {
  const lower = menuName.toLowerCase()
  const sizeLabel = size === "large" ? "(Large)" : "(Regular)"
  if (lower.includes("classico") || lower.includes("classic")) return `Classic Red ${sizeLabel}`
  if (lower.includes("mac") && lower.includes("joy")) return `Mac & Joy ${sizeLabel}`
  if (lower.includes("melted") || lower.includes("melt")) return `Melted Cheese ${sizeLabel}`
  if (lower.includes("holy") || lower.includes("olio")) return `Holy E Olio ${sizeLabel}`
  return ""
}

/**
 * Loyang: sesuai pengaturan loyang per porsi tiap menu (lihat `loyangNeed`). Box: hanya menu di
 * kategori Hampers, satu per porsi; menu pasta biasa bernama mirip (mis. "Spaghetti Classico")
 * tidak dihitung.
 */
export function stockNeeds(items: NeedItem[]): StockNeeds {
  const needs: StockNeeds = { loyangLarge: 0, loyangRegular: 0, boxes: {} }
  for (const item of items) {
    const loyang = loyangNeed(item)
    if (loyang?.size === "large") needs.loyangLarge += loyang.qty
    else if (loyang) needs.loyangRegular += loyang.qty
    if (item.size === "single" || item.qty <= 0 || !isHampersCategory(item.categoryName)) continue
    const box = hampersBoxName(item.menuName, item.size)
    if (box) needs.boxes[box] = (needs.boxes[box] ?? 0) + item.qty
  }
  return needs
}
