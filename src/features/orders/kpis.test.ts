import { describe, expect, it } from "vitest"

import { computeKpis, type DailyOrderStats, kpiWindow } from "./kpis"

const day = (d: string, orders: number, hampers: number, value: number): DailyOrderStats => ({
  day: d,
  orders,
  normal: orders - hampers,
  hampers,
  value,
})

describe("computeKpis", () => {
  const daily = [
    day("2026-10-18", 1, 0, 100_000),
    day("2026-10-23", 10, 4, 2_000_000),
    day("2026-10-24", 12, 3, 2_400_000),
  ]

  it("satu hari: nilai hari itu, tren dibanding kemarin, sparkline 7 hari", () => {
    const kpis = computeKpis(daily, "2026-10-24", "2026-10-24")
    expect(kpis.orders).toEqual({ value: 12, percent: 20, series: [1, 0, 0, 0, 0, 10, 12] })
    expect(kpis.hampers.percent).toBe(-25)
    expect(kpis.normal.value).toBe(9)
    expect(kpis.value.value).toBe(2_400_000)
  })

  it("periode sebelumnya kosong: tanpa persen", () => {
    expect(computeKpis(daily, "2026-10-18", "2026-10-18").orders.percent).toBeNull()
  })

  it("rentang panjang: sparkline sepanjang rentang", () => {
    const kpis = computeKpis(daily, "2026-10-15", "2026-10-24")
    expect(kpis.orders.value).toBe(23)
    expect(kpis.orders.series).toHaveLength(10)
  })
})

describe("kpiWindow", () => {
  it("mencakup periode pembanding dan sparkline", () => {
    expect(kpiWindow("2026-10-24", "2026-10-24")).toEqual({ from: "2026-10-18", to: "2026-10-24" })
    expect(kpiWindow("2026-10-01", "2026-10-31")).toEqual({ from: "2026-08-31", to: "2026-10-31" })
  })
})
