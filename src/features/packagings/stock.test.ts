import { describe, expect, it } from "vitest"

import { parseQty, planMovement, stockStatus } from "./stock"

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

describe("planMovement dengan desimal (bahan baku)", () => {
  it("menerima 2 angka di belakang koma dan menjumlah tanpa galat pembulatan", () => {
    expect(planMovement("masuk", 0.2, 0.1, "kg", 2)).toEqual({
      ok: true,
      direction: "in",
      qty: 0.2,
      nextStock: 0.3,
    })
    expect(planMovement("keluar", 2.5, 8, "kg", 2)).toMatchObject({ nextStock: 5.5 })
    expect(planMovement("hitung", 7.75, 8, "kg", 2)).toMatchObject({
      direction: "out",
      qty: 0.25,
      nextStock: 7.75,
    })
  })

  it("menolak 3 desimal dan memformat pesan ala Indonesia", () => {
    expect(planMovement("masuk", 1.255, 8, "kg", 2).ok).toBe(false)
    expect(planMovement("keluar", 9, 8.5, "kg", 2)).toEqual({
      ok: false,
      message: "Stok tinggal 8,5 kg.",
    })
    expect(planMovement("masuk", 1.5, 8, "pcs").ok).toBe(false)
  })
})

describe("parseQty", () => {
  it("koma desimal, titik ribuan", () => {
    expect(parseQty("2,5")).toBe(2.5)
    expect(parseQty("1.250,75")).toBe(1250.75)
    expect(parseQty("1.000")).toBe(1000)
    expect(parseQty("2.5")).toBe(2.5)
    expect(parseQty(" 12 ")).toBe(12)
  })

  it("kosong = null, bukan angka = NaN", () => {
    expect(parseQty("")).toBeNull()
    expect(parseQty("dua")).toBeNaN()
    expect(parseQty("-3")).toBeNaN()
    expect(parseQty("1,2,3")).toBeNaN()
  })
})
