import { describe, expect, it } from "vitest"

import { loyangNeed, stockNeeds } from "./stock-needs"

describe("stockNeeds", () => {
  it("loyang per porsi Large/Regular; dessert dan bundle tidak memakai loyang", () => {
    expect(
      stockNeeds([
        {
          menuName: "Spaghetti Classico Bologna Brulee",
          categoryName: "Pasta",
          size: "large",
          qty: 2,
        },
        { menuName: "Not Your Mac and Cheese", categoryName: "Pasta", size: "regular", qty: 1 },
        { menuName: "Choco Bon Bon", categoryName: "Dessert", size: "single", qty: 3 },
      ]),
    ).toEqual({ loyangLarge: 2, loyangRegular: 1, boxes: {} })
  })

  it("box hanya untuk menu kategori Hampers, walau nama pasta mirip", () => {
    expect(
      stockNeeds([
        { menuName: "Melt My Mac and Cheese", categoryName: "Pasta", size: "large", qty: 1 },
        { menuName: "Classico Red", categoryName: "Hampers", size: "large", qty: 2 },
        { menuName: "Holy E Olio", categoryName: "Hampers", size: "regular", qty: 1 },
        { menuName: "Classico Red", categoryName: "Hampers", size: "large", qty: 1 },
      ]),
    ).toEqual({
      loyangLarge: 4,
      loyangRegular: 1,
      boxes: { "Classic Red (Large)": 3, "Holy E Olio (Regular)": 1 },
    })
  })
})

describe("loyang per porsi (diatur Owner)", () => {
  it("dikali jumlah loyang per porsi; 0 = tanpa loyang", () => {
    expect(
      stockNeeds([
        { menuName: "Lasagna", categoryName: "Pasta", size: "large", qty: 2, loyangQty: 2 },
        { menuName: "Aglio", categoryName: "Pasta", size: "regular", qty: 3, loyangQty: 0 },
      ]),
    ).toEqual({ loyangLarge: 4, loyangRegular: 0, boxes: {} })
  })

  it("menu satu harga memakai loyang hanya bila ukurannya diatur", () => {
    const bundle = {
      menuName: "Bundle of 3",
      categoryName: "Special Bundle",
      size: "single" as const,
      qty: 2,
      loyangQty: 3,
    }
    expect(loyangNeed({ ...bundle, loyangSize: "regular" })).toEqual({ size: "regular", qty: 6 })
    expect(loyangNeed({ ...bundle, loyangSize: null })).toBeNull()
    expect(stockNeeds([{ ...bundle, loyangSize: "large" }])).toEqual({
      loyangLarge: 6,
      loyangRegular: 0,
      boxes: {},
    })
  })
})
