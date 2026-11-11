import { describe, expect, it } from "vitest"

import { orderTypeFromMenus } from "./order-type"

describe("orderTypeFromMenus", () => {
  it("hanya menu biasa: Normal", () => {
    expect(orderTypeFromMenus(["Pasta", "Dessert"])).toBe("normal")
  })

  it("hanya menu hampers: Hampers", () => {
    expect(orderTypeFromMenus(["Hampers", "Hampers"])).toBe("hampers")
  })

  it("campuran: Normal & Hampers", () => {
    expect(orderTypeFromMenus(["Pasta", "Hampers Christmas"])).toBe("normal_hampers")
  })

  it("tanpa kategori dianggap menu biasa", () => {
    expect(orderTypeFromMenus([null, undefined])).toBe("normal")
  })
})
