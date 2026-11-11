// Kebutuhan stok loyang dan box hampers dari item pesanan. Murni dan dipakai bersama oleh
// pemotongan stok saat Lunas (order-stock.ts) dan pantauan pesanan belum bayar di Dashboard,
// supaya hitungannya selalu sama.

import { isHampersCategory } from "@/features/orders/order-type"

export type NeedItem = {
  menuName: string
  categoryName: string | null
  size: "large" | "regular" | "single"
  qty: number
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
 * Loyang: satu per porsi Large/Regular (semua menu). Box: hanya menu di kategori Hampers, satu per
 * porsi; menu pasta biasa bernama mirip (mis. "Spaghetti Classico") tidak dihitung.
 */
export function stockNeeds(items: NeedItem[]): StockNeeds {
  const needs: StockNeeds = { loyangLarge: 0, loyangRegular: 0, boxes: {} }
  for (const item of items) {
    if (item.size === "single" || item.qty <= 0) continue
    if (item.size === "large") needs.loyangLarge += item.qty
    else needs.loyangRegular += item.qty
    if (!isHampersCategory(item.categoryName)) continue
    const box = hampersBoxName(item.menuName, item.size)
    if (box) needs.boxes[box] = (needs.boxes[box] ?? 0) + item.qty
  }
  return needs
}
