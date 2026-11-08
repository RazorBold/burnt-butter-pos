import { describe, expect, it } from "vitest"

import { latestUrgentAt, unseenUrgent } from "./seen"

const orders = [
  { id: "a", urgentAt: "2026-11-08T03:00:00.000Z" },
  { id: "b", urgentAt: "2026-11-08T05:00:00.000Z" },
]

describe("unseenUrgent", () => {
  it("belum pernah melihat: semua urgent yang masih berjalan", () => {
    expect(unseenUrgent(orders, null).map((order) => order.id)).toEqual(["a", "b"])
  })

  it("hanya yang ditandai setelah terakhir dilihat", () => {
    expect(unseenUrgent(orders, "2026-11-08T04:00:00.000Z").map((order) => order.id)).toEqual(["b"])
    expect(unseenUrgent(orders, "2026-11-08T05:00:00.000Z")).toEqual([])
  })

  it("ditandai urgent lagi (waktu baru) muncul lagi", () => {
    const again = [{ id: "a", urgentAt: "2026-11-08T06:00:00.000Z" }]
    expect(unseenUrgent(again, "2026-11-08T05:00:00.000Z")).toHaveLength(1)
  })
})

describe("latestUrgentAt", () => {
  it("waktu terbaru, atau fallback bila kosong", () => {
    expect(latestUrgentAt(orders, null)).toBe("2026-11-08T05:00:00.000Z")
    expect(latestUrgentAt([], "x")).toBe("x")
  })
})
