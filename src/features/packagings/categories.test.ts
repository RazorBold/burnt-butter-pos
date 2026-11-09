import { describe, expect, it } from "vitest"

import { groupByCategory } from "./categories"

const item = (name: string, category: [string, string, number] | null) => ({
  name,
  categoryId: category?.[0] ?? null,
  categoryName: category?.[1] ?? null,
  categorySort: category?.[2] ?? null,
})

describe("groupByCategory", () => {
  it("urut kategori, tanpa kategori di Lainnya paling bawah", () => {
    const groups = groupByCategory([
      item("Paper Bag", null),
      item("Classic Red (Regular)", ["r", "Size Regular", 1]),
      item("Classic Red (Large)", ["l", "Size Large", 0]),
      item("Mac & Joy (Large)", ["l", "Size Large", 0]),
    ])
    expect(groups.map((group) => [group.title, group.items.map((i) => i.name)])).toEqual([
      ["Size Large", ["Classic Red (Large)", "Mac & Joy (Large)"]],
      ["Size Regular", ["Classic Red (Regular)"]],
      ["Lainnya", ["Paper Bag"]],
    ])
  })

  it("daftar kosong: tanpa kelompok", () => {
    expect(groupByCategory([])).toEqual([])
  })
})
