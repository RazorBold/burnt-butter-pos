import { describe, expect, it } from "vitest"

import { type Activity, mergeActivity, unreadActivity } from "./feed"

const item = (id: string, at: string, actorId: string | null = "u2"): Activity => ({
  id,
  kind: "order",
  at,
  title: id,
  detail: null,
  href: null,
  actorId,
  actorName: null,
})

describe("mergeActivity", () => {
  it("terbaru di atas dan dipotong ke batas", () => {
    const merged = mergeActivity(
      [
        [item("a", "2026-11-11T01:00:00.000Z"), item("b", "2026-11-11T03:00:00.000Z")],
        [item("c", "2026-11-11T02:00:00.000Z")],
      ],
      2,
    )
    expect(merged.map((entry) => entry.id)).toEqual(["b", "c"])
  })
})

describe("unreadActivity", () => {
  const items = [
    item("baru-orang-lain", "2026-11-11T03:00:00.000Z", "u2"),
    item("baru-sendiri", "2026-11-11T03:30:00.000Z", "u1"),
    item("lama", "2026-11-11T01:00:00.000Z", "u2"),
  ]

  it("hanya yang lebih baru dari terakhir dilihat dan bukan buatan sendiri", () => {
    expect(
      unreadActivity(items, "2026-11-11T02:00:00.000Z", "u1").map((entry) => entry.id),
    ).toEqual(["baru-orang-lain"])
  })

  it("belum pernah dibuka: tidak ada yang dihitung (tidak membanjiri saat pertama kali)", () => {
    expect(unreadActivity(items, null, "u1")).toEqual([])
  })
})
