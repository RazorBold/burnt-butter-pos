// Notifikasi "selesai packing" untuk Admin. Murni (tanpa DB) supaya bisa diuji.

import type { OrderType } from "@/lib/wa-parser"

export type PackedOrder = {
  orderId: string
  orderNo: string
  customerName: string
  deliveryDate: string
  type: OrderType
  marketplaceOrderNo: string | null
  byName: string | null
  /** ISO, supaya aman dikirim lewat Server Action dan dibandingkan di klien. */
  packedAt: string
}

type PackedRow = PackedOrder & { changedBy: string | null }

/**
 * Satu baris per pesanan (packing terakhir; pesanan bisa dibatalkan packing lalu di-packing lagi),
 * tanpa yang di-packing oleh `me` sendiri. `rows` sudah urut terbaru dulu.
 */
export function latestPackedPerOrder(rows: PackedRow[], me: string): PackedOrder[] {
  const seen = new Set<string>()
  const result: PackedOrder[] = []
  for (const { changedBy, ...row } of rows) {
    if (seen.has(row.orderId)) continue
    seen.add(row.orderId)
    if (changedBy !== me) result.push(row)
  }
  return result
}

export const packedAtOf = (order: PackedOrder) => order.packedAt
