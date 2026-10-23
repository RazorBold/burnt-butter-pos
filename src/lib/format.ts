import { TZDate } from "@date-fns/tz"
import { format } from "date-fns"
import { id } from "date-fns/locale"

export const TIME_ZONE = "Asia/Jakarta"

const rupiah = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 })

/** 4780000 → "Rp 4.780.000" */
export function formatRupiah(amount: number): string {
  const sign = amount < 0 ? "-" : ""
  return `${sign}Rp ${rupiah.format(Math.abs(amount))}`
}

function inJakarta(date: Date | string): TZDate {
  return new TZDate(typeof date === "string" ? new Date(date) : date, TIME_ZONE)
}

/** "21 Oktober 2026" */
export function formatTanggal(date: Date | string): string {
  return format(inJakarta(date), "d MMMM yyyy", { locale: id })
}

/** "21/10/2026" */
export function formatTanggalPendek(date: Date | string): string {
  return format(inJakarta(date), "dd/MM/yyyy")
}

/** "Rabu, 21 Oktober 2026" */
export function formatHariTanggal(date: Date | string): string {
  return format(inJakarta(date), "EEEE, d MMMM yyyy", { locale: id })
}

/** "09:12" */
export function formatJam(date: Date | string): string {
  return format(inJakarta(date), "HH:mm")
}

/** "21 Okt 2026, 09:12" */
export function formatWaktuDibuat(date: Date | string): string {
  return format(inJakarta(date), "d MMM yyyy, HH:mm", { locale: id })
}

/** Tanggal kalender di WIB dalam format ISO, mis. "2026-10-21". */
export function toJakartaDateString(date: Date | string): string {
  return format(inJakarta(date), "yyyy-MM-dd")
}
