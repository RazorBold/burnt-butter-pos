// Kalender Pengiriman di Dashboard: grid bulan (Senin di kiri) dengan jumlah pesanan yang harus
// dikirim tiap tanggal. Murni supaya bisa diuji; data per tanggal diambil di queries.ts.

import { addDays } from "@/features/orders/filters"

export type DeliveryDay = {
  /** "YYYY-MM-DD" (tanggal kirim). */
  date: string
  /** Pesanan tidak dibatalkan yang dikirim tanggal ini. */
  orders: number
  /** Total porsi/item pesanan tersebut. */
  portions: number
  /** Pesanan yang belum lunas. */
  unpaid: number
  /** Pesanan yang belum Dikirim/Selesai (masih harus diurus). */
  pending: number
}

export type CalendarCell = { date: string; inMonth: boolean }

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

/** "?bulan=YYYY-MM"; nilai tidak valid = bulan dari `today`. */
export function parseCalendarMonth(value: unknown, today: string): string {
  return typeof value === "string" && MONTH.test(value) ? value : today.slice(0, 7)
}

/** Bulan bergeser `delta` (mis. -1 = bulan lalu), format "YYYY-MM". */
export function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number)
  const date = new Date(Date.UTC(year, mon - 1 + delta, 1))
  return date.toISOString().slice(0, 7)
}

/** Grid minggu penuh (Senin–Minggu) yang mencakup seluruh bulan. */
export function calendarWeeks(month: string): CalendarCell[][] {
  const first = `${month}-01`
  const next = `${shiftMonth(month, 1)}-01`
  // getUTCDay: 0 = Minggu. Mundur ke Senin terdekat.
  const offset = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7
  let cursor = addDays(first, -offset)
  const weeks: CalendarCell[][] = []
  while (cursor < next) {
    const week: CalendarCell[] = []
    for (let day = 0; day < 7; day++) {
      week.push({ date: cursor, inMonth: cursor.startsWith(month) })
      cursor = addDays(cursor, 1)
    }
    weeks.push(week)
  }
  return weeks
}

/** Rentang tanggal yang tampil di grid (termasuk hari dari bulan sebelah). */
export function calendarRange(month: string): { from: string; to: string } {
  const weeks = calendarWeeks(month)
  return { from: weeks[0][0].date, to: weeks.at(-1)![6].date }
}

/** Tingkat kepadatan 0–3 untuk warna sel, relatif terhadap hari tersibuk di grid. */
export function busyLevel(orders: number, max: number): 0 | 1 | 2 | 3 {
  if (orders <= 0 || max <= 0) return 0
  const ratio = orders / max
  return ratio > 2 / 3 ? 3 : ratio > 1 / 3 ? 2 : 1
}
