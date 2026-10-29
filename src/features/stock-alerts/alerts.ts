// Peringatan stok menipis (BELL-33). Murni supaya bisa diuji dan dipakai navbar (klien).

import type { StockStatus } from "@/features/packagings/stock"

export type StockAlert = {
  id: string
  kind: "packaging" | "raw_material"
  name: string
  stock: number
  minStock: number | null
  unit: string
  status: Exclude<StockStatus, "cukup">
  href: string
}

/** Habis lebih dulu, lalu yang paling jauh di bawah minimumnya, lalu nama. */
export function sortAlerts(alerts: StockAlert[]): StockAlert[] {
  const shortfall = (alert: StockAlert) =>
    alert.minStock ? alert.stock / alert.minStock : alert.stock === 0 ? 0 : 1
  return [...alerts].sort(
    (a, b) =>
      Number(b.status === "habis") - Number(a.status === "habis") ||
      shortfall(a) - shortfall(b) ||
      a.name.localeCompare(b.name, "id"),
  )
}
