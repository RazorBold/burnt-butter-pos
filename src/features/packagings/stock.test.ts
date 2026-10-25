import { describe, expect, it } from "vitest"

import { planMovement, stockStatus } from "./stock"

describe("stockStatus", () => {
  it("sesuai desain: Box Dessert 30 dengan minimum 40 = Menipis", () => {
    expect(stockStatus(30, 40)).toBe("menipis")
    expect(stockStatus(40, 40)).toBe("menipis")
    expect(stockStatus(120, 50)).toBe("cukup")
  })

  it("0 selalu Habis; tanpa minimum hanya Cukup atau Habis", () => {
    expect(stockStatus(0, 10)).toBe("habis")
    expect(stockStatus(0, null)).toBe("habis")
    expect(stockStatus(3, null)).toBe("cukup")
  })
})

describe("planMovement", () => {
  it("masuk dan keluar", () => {
    expect(planMovement("masuk", 50, 120)).toEqual({
      ok: true,
      direction: "in",
      qty: 50,
      nextStock: 170,
    })
    expect(planMovement("keluar", 20, 120)).toEqual({
      ok: true,
      direction: "out",
      qty: 20,
      nextStock: 100,
    })
  })

  it("keluar tidak boleh melebihi stok; jumlah harus >= 1 dan bulat", () => {
    expect(planMovement("keluar", 31, 30, "pcs")).toEqual({
      ok: false,
      message: "Stok tinggal 30 pcs.",
    })
    expect(planMovement("masuk", 0, 30).ok).toBe(false)
    expect(planMovement("masuk", 2.5, 30).ok).toBe(false)
  })

  it("hitung ulang mencatat selisih", () => {
    expect(planMovement("hitung", 95, 100)).toEqual({
      ok: true,
      direction: "out",
      qty: 5,
      nextStock: 95,
    })
    expect(planMovement("hitung", 0, 12)).toMatchObject({ direction: "out", qty: 12, nextStock: 0 })
    expect(planMovement("hitung", 110, 100)).toMatchObject({ direction: "in", qty: 10 })
    expect(planMovement("hitung", 100, 100).ok).toBe(false)
  })
})
