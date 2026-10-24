// KPI Daftar Pesanan dari rekap harian. Murni supaya bisa diuji tanpa database.

import { addDays, daysBetween, previousRange } from "./filters"

/** Rekap satu hari (WIB). Pesanan dibatalkan tidak ikut dihitung. */
export type DailyOrderStats = {
  day: string
  orders: number
  personal: number
  hadiah: number
  value: number
}

export type KpiMetric = "orders" | "personal" | "hadiah" | "value"

export type OrderKpi = {
  value: number
  /** Persen dibanding periode sebelumnya; null bila periode sebelumnya kosong. */
  percent: number | null
  /** Nilai harian untuk sparkline, minimal 7 hari terakhir sampai `to`. */
  series: number[]
}

export const SPARK_DAYS = 7

/** Rentang harian yang perlu diambil dari DB untuk periode, pembanding, dan sparkline. */
export function kpiWindow(from: string, to: string): { from: string; to: string } {
  const previous = previousRange(from, to)
  const sparkFrom = addDays(to, -(SPARK_DAYS - 1))
  return { from: [previous.from, sparkFrom].sort()[0], to }
}

export function computeKpis(
  daily: DailyOrderStats[],
  from: string,
  to: string,
): Record<KpiMetric, OrderKpi> {
  const byDay = new Map(daily.map((row) => [row.day, row]))
  const previous = previousRange(from, to)
  const sum = (metric: KpiMetric, start: string, end: string) => {
    let total = 0
    for (let day = start; day <= end; day = addDays(day, 1)) total += byDay.get(day)?.[metric] ?? 0
    return total
  }
  const seriesFrom = daysBetween(from, to) + 1 >= SPARK_DAYS ? from : addDays(to, -(SPARK_DAYS - 1))
  const metric = (key: KpiMetric): OrderKpi => {
    const value = sum(key, from, to)
    const before = sum(key, previous.from, previous.to)
    const series: number[] = []
    for (let day = seriesFrom; day <= to; day = addDays(day, 1))
      series.push(byDay.get(day)?.[key] ?? 0)
    return {
      value,
      percent: before === 0 ? null : ((value - before) / before) * 100,
      series,
    }
  }
  return {
    orders: metric("orders"),
    personal: metric("personal"),
    hadiah: metric("hadiah"),
    value: metric("value"),
  }
}
