import { describe, expect, it } from "vitest"

import { latestAt, unseenSince } from "@/features/paid-alert/seen"

import { latestPackedPerOrder, packedAtOf } from "./packed"

const row = (orderId: string, packedAt: string, changedBy: string | null) => ({
  orderId,
  orderNo: `BB${orderId}`,
  customerName: "Rina",
  deliveryDate: "2026-11-20",
  type: "normal" as const,
  marketplaceOrderNo: null,
  byName: "Dapur",
  packedAt,
  changedBy,
})

describe("latestPackedPerOrder", () => {
  it("satu baris per pesanan (packing terakhir), tanpa field changedBy", () => {
    const result = latestPackedPerOrder(
      [
        row("1", "2026-11-19T05:00:00.000Z", "produksi"),
        row("1", "2026-11-19T03:00:00.000Z", "produksi"),
        row("2", "2026-11-19T04:00:00.000Z", null),
      ],
      "admin",
    )
    expect(result.map((order) => [order.orderId, order.packedAt])).toEqual([
      ["1", "2026-11-19T05:00:00.000Z"],
      ["2", "2026-11-19T04:00:00.000Z"],
    ])
    expect(result[0]).not.toHaveProperty("changedBy")
  })

  it("yang di-packing sendiri tidak diberi tahu, termasuk packing ulang terakhir", () => {
    const result = latestPackedPerOrder(
      [
        row("1", "2026-11-19T05:00:00.000Z", "admin"),
        row("1", "2026-11-19T03:00:00.000Z", "produksi"),
        row("2", "2026-11-19T04:00:00.000Z", "produksi"),
      ],
      "admin",
    )
    expect(result.map((order) => order.orderId)).toEqual(["2"])
  })
})

describe("unseenSince / latestAt untuk packing", () => {
  const orders = latestPackedPerOrder(
    [row("1", "2026-11-19T05:00:00.000Z", "p"), row("2", "2026-11-19T03:00:00.000Z", "p")],
    "admin",
  )

  it("browser baru tidak dibanjiri; setelah itu hanya yang lebih baru", () => {
    expect(unseenSince(orders, null, packedAtOf)).toEqual([])
    expect(
      unseenSince(orders, "2026-11-19T04:00:00.000Z", packedAtOf).map((o) => o.orderId),
    ).toEqual(["1"])
  })

  it("waktu terbaru untuk disimpan, atau fallback bila kosong", () => {
    expect(latestAt(orders, null, packedAtOf)).toBe("2026-11-19T05:00:00.000Z")
    expect(latestAt([], "2026-11-19T01:00:00.000Z", packedAtOf)).toBe("2026-11-19T01:00:00.000Z")
  })
})
