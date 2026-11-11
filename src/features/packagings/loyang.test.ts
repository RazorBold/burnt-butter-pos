import { describe, expect, it } from "vitest"

import { calculateLoyangReturn, calculateNetLoyangDeduction } from "./loyang-logic"

describe("calculateNetLoyangDeduction", () => {
  it("pesanan baru: potong sesuai jumlah item menu", () => {
    expect(calculateNetLoyangDeduction(3, [])).toBe(3)
  })

  it("pesanan yang sudah pernah dipotong penuh: tidak potong lagi (0)", () => {
    expect(
      calculateNetLoyangDeduction(3, [{ direction: "out", qty: 3 }]),
    ).toBe(0)
  })

  it("pesanan yang baru dipotong sebagian: potong kekurangannya saja", () => {
    expect(
      calculateNetLoyangDeduction(5, [{ direction: "out", qty: 2 }]),
    ).toBe(3)
  })

  it("pesanan yang pernah dikembalikan: potong kembali sesuai sisa yang dibutuhkan", () => {
    expect(
      calculateNetLoyangDeduction(4, [
        { direction: "out", qty: 4 },
        { direction: "in", qty: 4 },
      ]),
    ).toBe(4)
  })
})

describe("calculateLoyangReturn", () => {
  it("tanpa mutasi keluar sebelumnya: tidak ada yang dikembalikan (0)", () => {
    expect(calculateLoyangReturn([])).toBe(0)
  })

  it("mengembalikan seluruh loyang yang sudah pernah dipotong keluar", () => {
    expect(calculateLoyangReturn([{ direction: "out", qty: 5 }])).toBe(5)
  })

  it("memperhitungkan bila sebagian sudah pernah dikembalikan", () => {
    expect(
      calculateLoyangReturn([
        { direction: "out", qty: 5 },
        { direction: "in", qty: 2 },
      ]),
    ).toBe(3)
  })

  it("bila sudah dikembalikan semua: tidak ada yang dikembalikan lagi (0)", () => {
    expect(
      calculateLoyangReturn([
        { direction: "out", qty: 3 },
        { direction: "in", qty: 3 },
      ]),
    ).toBe(0)
  })
})
