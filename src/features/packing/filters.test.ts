import { describe, expect, it } from "vitest"

import { filterPackingOrders, matchesQuery, parsePackingFilters } from "./filters"

const base = { senderName: null, phone: null, cardTo: null, cardFrom: null }

const orders = [
  {
    ...base,
    id: "wa-normal",
    orderNo: "BB261114001",
    customerName: "Sari",
    type: "normal",
    channel: "whatsapp",
    kind: "po",
    senderName: "Santi",
    phone: "0819 0591 3318",
    cardTo: "Kak Sari",
    cardFrom: "Santi",
  },
  {
    ...base,
    id: "wa-hampers",
    orderNo: "BB261114002",
    customerName: "Alya",
    type: "hampers",
    channel: "whatsapp",
    kind: "ready_stock",
  },
  {
    ...base,
    id: "wa-campur",
    orderNo: "BB261114003",
    customerName: "Rina",
    type: "normal_hampers",
    channel: "whatsapp",
    kind: "made_to_order",
  },
  {
    ...base,
    id: "shopee-hampers",
    orderNo: "BB261114004",
    customerName: "Budi",
    type: "hampers",
    channel: "shopee",
    kind: "po",
  },
  {
    ...base,
    id: "tokped-normal",
    orderNo: "BB261114005",
    customerName: "Citra",
    type: "normal",
    channel: "tokopedia",
    kind: "ready_stock",
  },
] as const

const ids = (filters: Parameters<typeof filterPackingOrders>[1]) =>
  filterPackingOrders([...orders], filters).map((order) => order.id)

describe("parsePackingFilters", () => {
  it("nilai dikenal dipakai, selain itu diabaikan", () => {
    expect(
      parsePackingFilters({ tipe: "hampers", sumber: "olshop", jenis: "po", q: " sari " }),
    ).toEqual({ type: "hampers", source: "olshop", kind: "po", q: "sari" })
    expect(parsePackingFilters({ tipe: "aneh", sumber: "tiktok", jenis: "rs", q: " " })).toEqual({
      type: undefined,
      source: undefined,
      kind: undefined,
      q: undefined,
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

  it("Jenis PO / RS / MTO, bisa digabung dengan filter lain", () => {
    expect(ids({ kind: "po" })).toEqual(["wa-normal", "shopee-hampers"])
    expect(ids({ kind: "ready_stock" })).toEqual(["wa-hampers", "tokped-normal"])
    expect(ids({ kind: "made_to_order", type: "hampers" })).toEqual(["wa-campur"])
  })

  it("Cari digabung dengan filter", () => {
    expect(ids({ q: "budi" })).toEqual(["shopee-hampers"])
    expect(ids({ q: "budi", kind: "ready_stock" })).toEqual([])
  })
})

describe("matchesQuery", () => {
  const order = orders[0]

  it("no. pesanan, penerima, pengirim, dan nama di kartu (tanpa beda huruf besar)", () => {
    expect(matchesQuery(order, "114001")).toBe(true)
    expect(matchesQuery(order, "SARI")).toBe(true)
    expect(matchesQuery(order, "santi")).toBe(true)
    expect(matchesQuery(order, "kak sari")).toBe(true)
    expect(matchesQuery(order, "alya")).toBe(false)
    expect(matchesQuery(order, undefined)).toBe(true)
  })

  it("no. telp per digit; 08 dan 628 dianggap sama", () => {
    expect(matchesQuery(order, "0819-0591")).toBe(true)
    expect(matchesQuery(order, "62819 0591 3318")).toBe(true)
    expect(matchesQuery(order, "3318")).toBe(true)
    expect(matchesQuery(order, "99")).toBe(false)
  })
})
