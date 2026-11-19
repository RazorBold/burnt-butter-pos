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

const jumlah = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 })

/** Jumlah stok: 1200 → "1.200", 2.5 → "2,5". */
export function formatJumlah(value: number): string {
  return jumlah.format(value)
}

function inJakarta(date: Date | string): TZDate {
  return new TZDate(typeof date === "string" ? new Date(date) : date, TIME_ZONE)
}

// Semua tanggal tampil sebagai DD/MM/YYYY supaya seragam dan tidak keliru saat pesanan ramai
// (permintaan pemilik toko, 19 Nov 2026).

/** "21/10/2026" */
export function formatTanggal(date: Date | string): string {
  return format(inJakarta(date), "dd/MM/yyyy")
}

/** "21/10/2026" */
export function formatTanggalPendek(date: Date | string): string {
  return format(inJakarta(date), "dd/MM/yyyy")
}

/** "Rabu, 21/10/2026" */
export function formatHariTanggal(date: Date | string): string {
  return format(inJakarta(date), "EEEE, dd/MM/yyyy", { locale: id })
}

/** "09:12" */
export function formatJam(date: Date | string): string {
  return format(inJakarta(date), "HH:mm")
}

/** "21/10/2026, 09:12" */
export function formatWaktuDibuat(date: Date | string): string {
  return format(inJakarta(date), "dd/MM/yyyy, HH:mm")
}

/** Tanggal kalender di WIB dalam format ISO, mis. "2026-10-21". */
export function toJakartaDateString(date: Date | string): string {
  return format(inJakarta(date), "yyyy-MM-dd")
}
