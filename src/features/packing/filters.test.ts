import { describe, expect, it } from "vitest"

import { filterPackingOrders, parsePackingFilters } from "./filters"

const orders = [
  { id: "wa-normal", type: "normal", channel: "whatsapp" },
  { id: "wa-hampers", type: "hampers", channel: "whatsapp" },
  { id: "wa-campur", type: "normal_hampers", channel: "whatsapp" },
  { id: "shopee-hampers", type: "hampers", channel: "shopee" },
  { id: "tokped-normal", type: "normal", channel: "tokopedia" },
] as const

const ids = (filters: Parameters<typeof filterPackingOrders>[1]) =>
  filterPackingOrders([...orders], filters).map((order) => order.id)

describe("parsePackingFilters", () => {
  it("nilai dikenal dipakai, selain itu diabaikan", () => {
    expect(parsePackingFilters({ tipe: "hampers", sumber: "olshop" })).toEqual({
      type: "hampers",
      source: "olshop",
    })
    expect(parsePackingFilters({ tipe: "aneh", sumber: "tiktok" })).toEqual({
      type: undefined,
      source: undefined,
    })
  })
})

describe("filterPackingOrders", () => {
  it("tanpa filter: semua", () => {
    expect(ids({})).toHaveLength(5)
  })

  it("Normal & Hampers masuk ke filter Normal dan Hampers", () => {
    expect(ids({ type: "normal" })).toEqual(["wa-normal", "wa-campur", "tokped-normal"])
    expect(ids({ type: "hampers" })).toEqual(["wa-hampers", "wa-campur", "shopee-hampers"])
  })

  it("Olshop = Shopee + Tokopedia; bisa digabung dengan tipe", () => {
    expect(ids({ source: "olshop" })).toEqual(["shopee-hampers", "tokped-normal"])
    expect(ids({ source: "whatsapp", type: "hampers" })).toEqual(["wa-hampers", "wa-campur"])
    expect(ids({ source: "tokopedia" })).toEqual(["tokped-normal"])
  })
})
