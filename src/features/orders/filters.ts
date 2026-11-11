// Filter Daftar Pesanan dari URL (?q=&tgl=&dari=&sampai=&jenis=&tipe=&status=&kirim=&sumber=&hal=).
// Murni supaya bisa dipakai di server dan diuji.

import type { OrderKind, OrderType, ShippingMethod } from "@/lib/wa-parser"

import { ORDER_CHANNELS, type OrderChannel, ORDER_KINDS, SHIPPING_METHODS } from "./constants"

export const ORDER_STATUSES = [
  "baru",
  "diproses",
  "siap_packing",
  "siap_kirim",
  "dikirim",
  "selesai",
  "dibatalkan",
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  baru: "Baru",
  diproses: "Diproses",
  siap_packing: "Siap Packing",
  siap_kirim: "Siap Kirim",
  dikirim: "Dikirim",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
}

export const ORDER_TYPES = ["normal", "hampers", "normal_hampers"] as const

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  normal: "Normal",
  hampers: "Hampers",
  normal_hampers: "Normal & Hampers",
}

/** Dasar rentang tanggal: waktu pesanan dibuat (default) atau tanggal kirim (?tgl=kirim). */
export const DATE_BASES = ["dibuat", "kirim"] as const
export type DateBasis = (typeof DATE_BASES)[number]

export type OrderFilters = {
  q?: string
  basis: DateBasis
  /** Rentang tanggal (WIB) sesuai `basis`, "YYYY-MM-DD", inklusif. */
  from: string
  to: string
  kind?: OrderKind
  type?: OrderType
  status?: OrderStatus
  method?: ShippingMethod
  channel?: OrderChannel
  page: number
}

/** Rentang terpanjang yang diterima, supaya satu permintaan tidak menarik data bertahun-tahun. */
export const MAX_RANGE_DAYS = 366

type Params = Record<string, string | string[] | undefined>

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

function pick<T extends string>(values: readonly T[], value: unknown): T | undefined {
  return values.find((item) => item === value)
}

/** Nilai URL yang tidak dikenal diabaikan; tanpa tanggal = hari ini. */
export function parseOrderFilters(params: Params, today: string): OrderFilters {
  const one = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }
  let from = isDate(one("dari")) ? one("dari")! : undefined
  let to = isDate(one("sampai")) ? one("sampai")! : undefined
  from ??= to ?? today
  to ??= from
  if (from > to) [from, to] = [to, from]
  if (daysBetween(from, to) >= MAX_RANGE_DAYS) from = addDays(to, -(MAX_RANGE_DAYS - 1))

  const page = Number(one("hal"))
  return {
    q: one("q")?.trim() || undefined,
    basis: one("tgl") === "kirim" ? "kirim" : "dibuat",
    from,
    to,
    kind: pick(ORDER_KINDS, one("jenis")),
    type: pick(ORDER_TYPES, one("tipe")),
    status: pick(ORDER_STATUSES, one("status")),
    method: pick(SHIPPING_METHODS, one("kirim")),
    channel: pick(ORDER_CHANNELS, one("sumber")),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

/** Periode pembanding untuk tren KPI: rentang sepanjang yang sama, tepat sebelum `from`. */
export function previousRange(from: string, to: string): { from: string; to: string } {
  const length = daysBetween(from, to) + 1
  return { from: addDays(from, -length), to: addDays(from, -1) }
}

/** Parameter URL untuk TablePagination (tanpa ?hal=). */
export function filterParams(
  filters: OrderFilters,
  today: string,
): Record<string, string | undefined> {
  const isToday = filters.from === today && filters.to === today
  return {
    q: filters.q,
    tgl: filters.basis === "kirim" ? "kirim" : undefined,
    dari: isToday ? undefined : filters.from,
    sampai: isToday ? undefined : filters.to,
    jenis: filters.kind,
    tipe: filters.type,
    status: filters.status,
    kirim: filters.method,
    sumber: filters.channel,
  }
}
