import { describe, expect, it } from "vitest"

import { firstShortage, netUsage } from "./needs"

describe("netUsage", () => {
  it("keluar dikurangi masuk; yang sudah dikembalikan semua hilang", () => {
    expect(
      netUsage([
        { packagingId: "box-large", direction: "out", qty: 2 },
        { packagingId: "paper-bag", direction: "out", qty: 1 },
        { packagingId: "paper-bag", direction: "in", qty: 1 },
        { packagingId: "box-large", direction: "out", qty: 1 },
      ]),
    ).toEqual([{ packagingId: "box-large", qty: 3 }])
  })
})

describe("firstShortage", () => {
  const stock = new Map([
    ["box-large", { name: "Box Large", stock: 1, unit: "pcs" }],
    ["paper-bag", { name: "Paper Bag", stock: 10, unit: "pcs" }],
  ])

  it("stok cukup → null", () => {
    expect(firstShortage([{ packagingId: "paper-bag", qty: 10 }], stock)).toBeNull()
  })

  it("menyebut packaging yang kurang beserta sisa dan kebutuhannya", () => {
    expect(
      firstShortage(
        [
          { packagingId: "paper-bag", qty: 1 },
          { packagingId: "box-large", qty: 2 },
        ],
        stock,
      ),
    ).toBe("stok Box Large kurang (sisa 1, butuh 2 pcs)")
  })
})
