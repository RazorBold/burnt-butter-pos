// Ringkasan perubahan untuk log edit pesanan (order_edit_logs). Murni supaya bisa diuji.

import { formatRupiah, formatTanggalPendek } from "@/lib/format"
import type { OrderKind, OrderType, ShippingMethod } from "@/lib/wa-parser"

import { ORDER_KIND_LABEL, SHIPPING_METHOD_LABEL } from "./constants"
import { ORDER_TYPE_LABEL } from "./filters"

export type OrderEditPart = "data" | "menu" | "catatan"

export const EDIT_PART_LABEL: Record<OrderEditPart, string> = {
  data: "Data pesanan diubah",
  menu: "Menu diubah",
  catatan: "Catatan diubah",
}

/** Isian "Edit data" sebelum dan sesudah, sudah dinormalkan (teks kosong = null). */
export type DetailSnapshot = {
  name: string
  phone: string | null
  address: string | null
  deliveryDate: string
  kind: OrderKind
  type: OrderType
  method: ShippingMethod
  request: string | null
  senderName: string | null
  cardTo: string | null
  cardWishes: string | null
  cardFrom: string | null
  marketplaceOrderNo: string | null
  total: number
}

const short = (value: string | null) => {
  if (!value) return "kosong"
  return value.length > 40 ? `${value.slice(0, 40)}…` : value
}

export function describeDetailChanges(before: DetailSnapshot, after: DetailSnapshot): string[] {
  const changes: string[] = []
  const diff = <K extends keyof DetailSnapshot>(key: K) => before[key] !== after[key]

  if (diff("name")) changes.push(`Nama: ${before.name} → ${after.name}`)
  if (diff("phone")) changes.push(`No. HP: ${short(before.phone)} → ${short(after.phone)}`)
  if (diff("address")) changes.push("Alamat diubah")
  if (diff("deliveryDate")) {
    changes.push(
      `Tanggal kirim: ${formatTanggalPendek(before.deliveryDate)} → ${formatTanggalPendek(after.deliveryDate)}`,
    )
  }
  if (diff("kind")) {
    changes.push(`Jenis: ${ORDER_KIND_LABEL[before.kind]} → ${ORDER_KIND_LABEL[after.kind]}`)
  }
  if (diff("type")) {
    changes.push(`Tipe: ${ORDER_TYPE_LABEL[before.type]} → ${ORDER_TYPE_LABEL[after.type]}`)
  }
  if (diff("method")) {
    changes.push(
      `Pengiriman: ${SHIPPING_METHOD_LABEL[before.method]} → ${SHIPPING_METHOD_LABEL[after.method]}`,
    )
  }
  if (diff("request")) changes.push(`Request: ${short(before.request)} → ${short(after.request)}`)
  if (diff("senderName")) {
    changes.push(`Pengirim: ${short(before.senderName)} → ${short(after.senderName)}`)
  }
  if (diff("cardTo") || diff("cardWishes") || diff("cardFrom")) changes.push("Kartu ucapan diubah")
  if (diff("marketplaceOrderNo")) {
    changes.push(
      `No. invoice: ${short(before.marketplaceOrderNo)} → ${short(after.marketplaceOrderNo)}`,
    )
  }
  if (diff("total")) {
    changes.push(`Total: ${formatRupiah(before.total)} → ${formatRupiah(after.total)}`)
  }
  return changes
}

export type ItemSnapshot = {
  menuVariantId: string
  /** Nama menu + ukuran, mis. "Spaghetti Classico (Large)". */
  label: string
  qty: number
  note: string | null
}

export function describeItemChanges(before: ItemSnapshot[], after: ItemSnapshot[]): string[] {
  const changes: string[] = []
  const old = new Map(before.map((item) => [item.menuVariantId, item]))
  const now = new Map(after.map((item) => [item.menuVariantId, item]))

  for (const item of after) {
    const previous = old.get(item.menuVariantId)
    if (!previous) {
      changes.push(`Tambah ${item.qty}x ${item.label}${item.note ? ` (${item.note})` : ""}`)
      continue
    }
    if (previous.qty !== item.qty) changes.push(`${item.label}: ${previous.qty} → ${item.qty}`)
    if ((previous.note ?? "") !== (item.note ?? "")) {
      changes.push(
        item.note ? `Catatan ${item.label}: ${short(item.note)}` : `Catatan ${item.label} dihapus`,
      )
    }
  }
  for (const item of before) {
    if (!now.has(item.menuVariantId)) changes.push(`Hapus ${item.qty}x ${item.label}`)
  }
  return changes
}

export function describeNoteChange(before: string | null, after: string | null): string[] {
  if ((before ?? "") === (after ?? "")) return []
  if (!after) return ["Catatan dihapus"]
  return [before ? `Catatan: ${short(before)} → ${short(after)}` : `Catatan: ${short(after)}`]
}
