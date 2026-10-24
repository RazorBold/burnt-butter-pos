/**
 * Nomor pesanan: "BB" + YYMMDD (tanggal dibuat, WIB) + urutan harian 3 digit.
 * "2026-10-24", 1 → "BB261024001". Urutan diambil dari order_counters di dalam transaksi.
 */
export function formatOrderNo(jakartaDate: string, seq: number): string {
  const [year, month, day] = jakartaDate.split("-")
  return `BB${year.slice(2)}${month}${day}${String(seq).padStart(3, "0")}`
}
