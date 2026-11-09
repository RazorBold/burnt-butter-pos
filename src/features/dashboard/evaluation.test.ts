import { describe, expect, it } from "vitest"

import {
  buildGrowth,
  buildInsights,
  type EvalOrder,
  evaluationRanges,
  evaluationStart,
} from "./evaluation"

const order = (day: string, extra: Partial<EvalOrder> = {}): EvalOrder => ({
  day,
  type: "personal",
  status: "selesai",
  method: "pick_up",
  total: 100_000,
  customerId: "c1",
  portions: 1,
  firstDay: day,
  ...extra,
})

const money = (value: number) => `Rp${value}`

describe("evaluationRanges", () => {
  it("bulan berjalan dibanding tanggal yang sama bulan lalu, dipotong di akhir bulan", () => {
    const ranges = evaluationRanges("2026-03-31")
    expect(ranges.bulan.before).toEqual({ from: "2026-02-01", to: "2026-02-28" })
    expect(ranges.monthLabel).toEqual({ now: "1–31 Mar", before: "1–28 Feb" })
    expect(evaluationRanges("2026-01-09").bulan.before).toEqual({
      from: "2025-12-01",
      to: "2025-12-09",
    })
  })

  it("mingguan = 7 hari vs 7 hari sebelumnya; awal data = paling awal dari semua rentang", () => {
    const ranges = evaluationRanges("2026-11-09")
    expect(ranges.minggu.now).toEqual({ from: "2026-11-03", to: "2026-11-09" })
    expect(ranges.minggu.before).toEqual({ from: "2026-10-27", to: "2026-11-02" })
    expect(evaluationStart("2026-11-09")).toBe("2026-10-01")
    expect(evaluationStart("2026-11-30")).toBe("2026-10-01")
    expect(evaluationStart("2026-03-01")).toBe("2026-02-01")
  })
})

describe("buildGrowth", () => {
  it("hitung pesanan, omzet, rata-rata; batal tidak dihitung; pembanding kosong = null", () => {
    const orders = [
      order("2026-11-09"),
      order("2026-11-09", { total: 300_000 }),
      order("2026-11-09", { status: "dibatalkan", total: 999_000 }),
      order("2026-11-08"),
    ]
    const payments = [
      { day: "2026-11-09", amount: 150_000 },
      { day: "2026-11-08", amount: 100_000 },
    ]
    const [day, week, month] = buildGrowth(orders, payments, "2026-11-09")
    expect(day.orders).toEqual({ now: 2, before: 1, percent: 100 })
    expect(day.revenue).toEqual({ now: 150_000, before: 100_000, percent: 50 })
    expect(day.average).toEqual({ now: 200_000, before: 100_000, percent: 100 })
    expect(week.orders).toEqual({ now: 3, before: 0, percent: null })
    expect(month.compare).toBe("1–9 Nov vs 1–9 Okt")
  })
})

describe("buildInsights", () => {
  const base = {
    payments: [],
    anchor: "2026-11-09",
    menusNow: [],
    menusBefore: [],
    showMoney: true,
    isToday: false,
    formatMoney: money,
  }

  it("tanpa data: tidak ada masukan", () => {
    expect(buildInsights({ ...base, orders: [] })).toEqual([])
  })

  it("pesanan turun, hari tersibuk, menu terlaris, pelanggan lama, pembatalan", () => {
    const orders: EvalOrder[] = [
      // 7 hari sebelumnya: 7 pesanan (termasuk 2 Nov); 7 hari ini: 2 pesanan aktif (−71%).
      ...["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"].map(
        (day, index) => order(day, { customerId: `c${index}` }),
      ),
      // Senin 9 Nov dan Senin 2 Nov ramai.
      order("2026-11-09", { customerId: "c0", firstDay: "2026-10-27" }),
      order("2026-11-09", { customerId: "c1", firstDay: "2026-10-28" }),
      order("2026-11-09", { customerId: "c9", status: "dibatalkan" }),
      order("2026-11-02", { customerId: "c8" }),
    ]
    const insights = buildInsights({
      ...base,
      orders,
      menusNow: [
        { menuName: "Choco Bon Bon", qty: 4 },
        { menuName: "Mac & Joy", qty: 9 },
      ],
      menusBefore: [
        { menuName: "Choco Bon Bon", qty: 1 },
        { menuName: "Mac & Joy", qty: 9 },
      ],
    })
    const byKey = Object.fromEntries(insights.map((insight) => [insight.key, insight]))
    expect(byKey["pesanan-minggu"]).toMatchObject({
      tone: "turun",
      title: "Pesanan 7 hari turun 71%",
    })
    expect(byKey["hari-ramai"].title).toBe("Senin paling ramai")
    expect(byKey.menu.title).toBe("Terlaris 7 hari: Mac & Joy")
    expect(byKey.menu.text).toContain("Choco Bon Bon naik 300%")
    expect(byKey.pelanggan.title).toBe("29% pelanggan adalah pelanggan lama")
    expect(byKey.batal).toMatchObject({ tone: "waspada", title: "10% pesanan dibatalkan" })
    // Tanpa pembayaran pembanding: tidak ada masukan omzet.
    expect(byKey["omzet-minggu"]).toBeUndefined()
  })

  it("proyeksi omzet hanya untuk hari ini; Produksi tanpa masukan uang", () => {
    const orders = [order("2026-11-09")]
    const payments = [{ day: "2026-11-05", amount: 900_000 }]
    const today = buildInsights({ ...base, orders, payments, isToday: true })
    expect(today.find((insight) => insight.key === "proyeksi")?.title).toBe(
      "Proyeksi omzet bulan ini ± Rp3000000",
    )
    const produksi = buildInsights({ ...base, orders, payments, isToday: true, showMoney: false })
    expect(produksi.find((insight) => insight.key === "proyeksi")).toBeUndefined()
  })
})
