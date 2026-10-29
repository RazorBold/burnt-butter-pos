import { describe, expect, it } from "vitest"

import { type StockAlert, sortAlerts } from "./alerts"

const alert = (name: string, stock: number, minStock: number | null): StockAlert => ({
  id: name,
  kind: "packaging",
  name,
  stock,
  minStock,
  unit: "pcs",
  status: stock === 0 ? "habis" : "menipis",
  href: "/stok-packaging",
})

describe("sortAlerts", () => {
  it("Habis dulu, lalu yang paling jauh di bawah minimum, lalu nama", () => {
    const sorted = sortAlerts([
      alert("Box Dessert", 30, 40),
      alert("Paper Bag", 5, 50),
      alert("Cup Dessert", 0, 20),
      alert("Box Large", 30, 40),
    ])
    expect(sorted.map((item) => item.name)).toEqual([
      "Cup Dessert",
      "Paper Bag",
      "Box Dessert",
      "Box Large",
    ])
  })
})
