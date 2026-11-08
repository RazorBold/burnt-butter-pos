import { describe, expect, it } from "vitest"

import type { OrderStatus } from "@/features/orders/filters"

import { type ProductionItem, productionTotals, stageOf, summarizeProduction } from "./summary"

// Urutan kategori seperti data awal: Pasta (berukuran), Dessert, Special Bundle.
const CATEGORY = {
  pasta: { categorySort: 0, sized: true },
  dessert: { categorySort: 1, sized: false },
  bundle: { categorySort: 2, sized: false },
} as const

const item = (
  menuName: string,
  size: ProductionItem["size"],
  qty: number,
  menuOrder: number,
  category: keyof typeof CATEGORY = "pasta",
): ProductionItem => ({ menuName, size, qty, menuOrder, ...CATEGORY[category], photoPath: null })

const order = (status: OrderStatus, items: ProductionItem[]) => ({ status, items })

const ORDERS = [
  order("baru", [
    item("Spaghetti Classico", "large", 2, 1),
    item("Choco Bon Bon", "single", 1, 6, "dessert"),
  ]),
  order("diproses", [
    item("Spaghetti Classico", "regular", 1, 1),
    item("Potato Gratin", "large", 1, 3),
  ]),
  order("siap_kirim", [
    item("Spaghetti Classico", "large", 1, 1),
    item("Bundle of 3", "single", 1, 7, "bundle"),
  ]),
  order("dibatalkan", [item("Spaghetti Classico", "large", 5, 1)]),
]

describe("stageOf", () => {
  it("Baru = belum, Diproses = sedang, Siap Kirim ke atas = selesai", () => {
    expect(stageOf("baru")).toBe("belum")
    expect(stageOf("diproses")).toBe("proses")
    expect(stageOf("siap_kirim")).toBe("selesai")
    expect(stageOf("selesai")).toBe("selesai")
  })
})

describe("summarizeProduction", () => {
  const summary = summarizeProduction(ORDERS)

  it("porsi per menu dan ukuran, urut seperti template; pesanan batal tidak dihitung", () => {
    expect(summary.map((menu) => [menu.menuName, menu.total, menu.done])).toEqual([
      ["Spaghetti Classico", 4, 1],
      ["Potato Gratin", 1, 0],
      ["Choco Bon Bon", 1, 0],
      ["Bundle of 3", 1, 1],
    ])
    expect(summary[0].sizes).toEqual([
      { size: "large", total: 3, done: 1 },
      { size: "regular", total: 1, done: 0 },
    ])
  })
})

describe("productionTotals", () => {
  it("total porsi dan jumlah pesanan per tahap", () => {
    expect(productionTotals(ORDERS)).toEqual({
      portions: 7,
      donePortions: 2,
      orders: { belum: 1, proses: 1, selesai: 1 },
    })
  })
})
