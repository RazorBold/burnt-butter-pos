import { describe, expect, it } from "vitest"

import { buildReport, type ReportOrder, type ReportPayment } from "./summary"

const order = (day: string, extra: Partial<ReportOrder> = {}): ReportOrder => ({
  day,
  type: "personal",
  status: "selesai",
  method: "kurir_internal",
  total: 100_000,
  customerId: "c1",
  portions: 2,
  ...extra,
})

const ORDERS: ReportOrder[] = [
  // Periode sebelumnya (1-3 Okt) untuk rentang 4-6 Okt.
  order("2026-10-02"),
  order("2026-10-03", { customerId: "c2" }),
  // Periode ini.
  order("2026-10-04", { type: "hadiah", method: "instant", status: "dikirim", total: 250_000 }),
  order("2026-10-05", { customerId: "c2", method: "pick_up", status: "baru", portions: 3 }),
  order("2026-10-05", { customerId: "c3" }),
  order("2026-10-06", { status: "dibatalkan" }),
]

const PAYMENTS: ReportPayment[] = [
  { day: "2026-10-02", amount: 100_000, methodType: "cash" },
  { day: "2026-10-04", amount: 250_000, methodType: "bank" },
  { day: "2026-10-05", amount: 150_000, methodType: "ewallet" },
]

describe("buildReport", () => {
  const report = buildReport(ORDERS, PAYMENTS, "2026-10-04", "2026-10-06")

  it("KPI periode ini dengan tren dibanding periode sebelumnya; batal tidak dihitung", () => {
    expect(report.kpis.orders).toMatchObject({ value: 3, percent: 50 })
    expect(report.kpis.portions).toMatchObject({ value: 7, percent: 75 })
    expect(report.kpis.payments).toMatchObject({ value: 400_000, percent: 300 })
    expect(report.kpis.customers).toMatchObject({ value: 3, percent: 50 })
    expect(report.kpis.orders.series).toHaveLength(7)
    expect(report.cancelled).toBe(1)
  })

  it("rekap per hari Personal/Hadiah, pesanan dan pendapatan", () => {
    expect(report.perDay).toEqual([
      { day: "2026-10-04", personal: 0, hadiah: 1, personalRevenue: 0, hadiahRevenue: 250_000 },
      { day: "2026-10-05", personal: 2, hadiah: 0, personalRevenue: 200_000, hadiahRevenue: 0 },
      { day: "2026-10-06", personal: 0, hadiah: 0, personalRevenue: 0, hadiahRevenue: 0 },
    ])
  })

  it("pembagian metode kirim, status, dan metode bayar", () => {
    expect(report.shipping).toEqual([
      { key: "kurir_internal", value: 1 },
      { key: "instant", value: 1 },
      { key: "pick_up", value: 1 },
    ])
    expect(report.status.find((row) => row.key === "baru")?.value).toBe(1)
    expect(report.paymentMethods).toEqual([
      { type: "bank", amount: 250_000, share: 0.625 },
      { type: "ewallet", amount: 150_000, share: 0.375 },
      { type: "cash", amount: 0, share: 0 },
    ])
  })
})
