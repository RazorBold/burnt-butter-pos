import { describe, expect, it } from "vitest"

import { latestPaidAt, unseenPaid } from "./seen"

const orders = [
  { id: "a", paidAt: "2026-11-16T03:00:00.000Z" },
  { id: "b", paidAt: "2026-11-16T05:00:00.000Z" },
]

describe("unseenPaid", () => {
  it("browser baru (belum ada titik awal): tidak ada popup", () => {
    expect(unseenPaid(orders, null)).toEqual([])
  })

  it("hanya yang lunas setelah terakhir dilihat", () => {
    expect(unseenPaid(orders, "2026-11-16T04:00:00.000Z").map((order) => order.id)).toEqual(["b"])
    expect(unseenPaid(orders, "2026-11-16T05:00:00.000Z")).toEqual([])
    expect(unseenPaid(orders, "2026-11-16T02:00:00.000Z")).toHaveLength(2)
  })
})

describe("latestPaidAt", () => {
  it("waktu terbaru, atau fallback bila kosong", () => {
    expect(latestPaidAt(orders, null)).toBe("2026-11-16T05:00:00.000Z")
    expect(latestPaidAt(orders, "2026-11-16T09:00:00.000Z")).toBe("2026-11-16T09:00:00.000Z")
    expect(latestPaidAt([], "x")).toBe("x")
  })
})
