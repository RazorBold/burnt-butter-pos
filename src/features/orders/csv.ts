// Unduh CSV pesanan terpilih (BELL-19). Murni supaya bisa diuji; dipanggil Server Action.

import { formatJam, toJakartaDateString } from "@/lib/format"
import { formatPhone } from "@/lib/phone"
import type { OrderType, ShippingMethod } from "@/lib/wa-parser"

import { ORDER_CHANNEL_LABEL, type OrderChannel, SHIPPING_METHOD_LABEL } from "./constants"
import { ORDER_STATUS_LABEL, ORDER_TYPE_LABEL, type OrderStatus } from "./filters"

export type OrderExportRow = {
  orderNo: string
  createdAt: Date
  type: OrderType
  customerName: string
  phone: string | null
  address: string | null
  senderName: string | null
  deliveryDate: string
  method: ShippingMethod
  status: OrderStatus
  /** Nama metode bayar bila lunas; `null` = belum bayar. */
  paidWith: string | null
  items: { menuName: string; size: "large" | "regular" | "single"; qty: number }[]
  request: string | null
  total: number
  channel: OrderChannel
  marketplaceOrderNo: string | null
  expedition: string | null
  trackingNo: string | null
}

const SIZE_LABEL = { large: "Large", regular: "Regular", single: null } as const

const COLUMNS: [string, (row: OrderExportRow) => string | number][] = [
  ["No. Pesanan", (row) => row.orderNo],
  ["Dibuat (WIB)", (row) => `${toJakartaDateString(row.createdAt)} ${formatJam(row.createdAt)}`],
  ["Tipe", (row) => ORDER_TYPE_LABEL[row.type]],
  ["Nama Customer", (row) => row.customerName],
  // Dengan spasi supaya Excel membacanya sebagai teks dan tidak membuang angka 0 di depan.
  ["No. HP", (row) => (row.phone ? formatPhone(row.phone) : "")],
  ["Alamat", (row) => row.address ?? ""],
  ["Pengirim Hadiah", (row) => row.senderName ?? ""],
  ["Tanggal Kirim", (row) => row.deliveryDate],
  ["Pengiriman", (row) => SHIPPING_METHOD_LABEL[row.method]],
  ["Status", (row) => ORDER_STATUS_LABEL[row.status]],
  ["Pembayaran", (row) => (row.paidWith ? "Lunas" : "Belum bayar")],
  ["Dibayar Lewat", (row) => row.paidWith ?? ""],
  [
    "Menu",
    (row) =>
      row.items
        .map((item) => {
          const size = SIZE_LABEL[item.size]
          return `${item.qty}x ${item.menuName}${size ? ` (${size})` : ""}`
        })
        .join("; "),
  ],
  ["Request", (row) => row.request ?? ""],
  ["Total (Rp)", (row) => row.total],
  ["Sumber", (row) => ORDER_CHANNEL_LABEL[row.channel]],
  ["No. Marketplace", (row) => row.marketplaceOrderNo ?? ""],
  ["Kurir Ekspedisi", (row) => row.expedition ?? ""],
  ["Resi", (row) => row.trackingNo ?? ""],
]

/**
 * Satu sel CSV. Teks yang diawali = + - @ diberi tanda kutip satu supaya tidak dijalankan
 * sebagai rumus saat dibuka di Excel (CSV injection).
 */
export function csvCell(value: string | number): string {
  if (typeof value === "number") return String(value)
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** CSV dengan pemisah koma dan baris CRLF. BOM UTF-8 ditambahkan saat diunduh. */
export function ordersToCsv(rows: OrderExportRow[]): string {
  const lines = [
    COLUMNS.map(([title]) => csvCell(title)).join(","),
    ...rows.map((row) => COLUMNS.map(([, read]) => csvCell(read(row))).join(",")),
  ]
  return `${lines.join("\r\n")}\r\n`
}
