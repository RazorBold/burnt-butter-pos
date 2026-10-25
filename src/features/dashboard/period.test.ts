import { describe, expect, it } from "vitest"

import { parseDashboardPeriod } from "./period"

const TODAY = "2026-10-21"

describe("parseDashboardPeriod", () => {
  it("default: hari ini", () => {
    expect(parseDashboardPeriod({}, TODAY)).toEqual({
      anchor: TODAY,
      period: "hari",
      from: TODAY,
      to: TODAY,
    })
  })

  it("7 / 30 hari dan bulan ini berakhir di tanggal acuan", () => {
    expect(parseDashboardPeriod({ periode: "7" }, TODAY)).toMatchObject({ from: "2026-10-15" })
    expect(parseDashboardPeriod({ periode: "30" }, TODAY)).toMatchObject({ from: "2026-09-22" })
    expect(parseDashboardPeriod({ periode: "bulan", tanggal: "2026-09-10" }, TODAY)).toMatchObject({
      anchor: "2026-09-10",
      from: "2026-09-01",
      to: "2026-09-10",
    })
  })

  it("tanggal masa depan atau tidak valid kembali ke hari ini", () => {
    expect(parseDashboardPeriod({ tanggal: "2026-12-01" }, TODAY).anchor).toBe(TODAY)
    expect(parseDashboardPeriod({ tanggal: "kemarin", periode: "99" }, TODAY)).toMatchObject({
      anchor: TODAY,
      period: "hari",
    })
  })
})
