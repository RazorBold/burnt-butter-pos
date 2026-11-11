import { describe, expect, it } from "vitest"

import { groupByCategory, summarizeCategories } from "./categories"
import type { StockStatus } from "./stock"

const item = (
  name: string,
  category: [string, string, number] | null,
  stock = 10,
  capacity: number | null = null,
  status: StockStatus = "cukup",
) => ({
  name,
  categoryId: category?.[0] ?? null,
  categoryName: category?.[1] ?? null,
  categorySort: category?.[2] ?? null,
  stock,
  capacity,
  status,
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

describe("summarizeCategories", () => {
  it("menjumlahkan total stok per kategori dan menghitung status", () => {
    const summary = summarizeCategories([
      item("Classic Red (Large)", ["l", "Size Large", 0], 9, 20, "cukup"),
      item("Mac & Joy (Large)", ["l", "Size Large", 0], 10, 20, "cukup"),
      item("Holy E Olio (Large)", ["l", "Size Large", 0], 5, 20, "menipis"),
      item("Classic Red (Regular)", ["r", "Size Regular", 1], 15, null, "cukup"),
    ])

    expect(summary).toEqual([
      {
        key: "l",
        title: "Size Large",
        stock: 24,
        capacity: 60,
        status: "menipis",
        itemCount: 3,
      },
      {
        key: "r",
        title: "Size Regular",
        stock: 15,
        capacity: null,
        status: "cukup",
        itemCount: 1,
      },
    ])
  })
})
