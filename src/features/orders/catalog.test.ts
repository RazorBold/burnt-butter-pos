import { describe, expect, it } from "vitest"

import { parseWaOrder } from "@/lib/wa-parser"
import { PERSONAL_SAMPLE } from "@/lib/wa-parser/templates"

import { type CatalogVariant, groupCatalog, matchParsedItems, orderTotal } from "./catalog"
import { draftFromParsed, draftIssues, EMPTY_DRAFT } from "./draft"

const PASTA = { categoryId: "pasta", categoryName: "Pasta", categorySort: 0, sized: true }
const DESSERT = { categoryId: "dessert", categoryName: "Dessert", categorySort: 1, sized: false }
const BUNDLE = {
  categoryId: "bundle",
  categoryName: "Special Bundle",
  categorySort: 2,
  sized: false,
}

const pasta = (id: string, menuName: string, size: "large" | "regular", price: number) =>
  ({ id, menuName, ...PASTA, size, price, photoPath: null }) satisfies CatalogVariant

const CATALOG: CatalogVariant[] = [
  pasta("bolo-l", "Spaghetti Classico Bologna Brulee", "large", 65000),
  pasta("bolo-r", "Spaghetti Classico Bologna Brulee", "regular", 50000),
  pasta("mac-l", "Not Your Mac and Cheese", "large", 65000),
  pasta("mac-r", "Not Your Mac and Cheese", "regular", 50000),
  pasta("melt-l", "Melt My Mac and Cheese", "large", 65000),
  pasta("lasagna-l", "Potato Gratin Lasagna", "large", 65000),
  {
    id: "choco",
    menuName: "Choco Bon Bon",
    ...DESSERT,
    size: "single",
    price: 40000,
    photoPath: null,
  },
  {
    id: "bundle",
    menuName: "Bundle of 3",
    ...BUNDLE,
    size: "single",
    price: 180000,
    photoPath: null,
  },
]

describe("matchParsedItems", () => {
  it("mencocokkan nama + ukuran dari pesan WA", () => {
    const parsed = parseWaOrder(PERSONAL_SAMPLE, "2026-10-24")
    const { quantities, unmatched } = matchParsedItems(parsed.items, CATALOG)
    expect(quantities).toEqual({ "bolo-l": 2, "lasagna-l": 1, "mac-r": 1, choco: 2 })
    expect(unmatched).toEqual([])
  })

  it("beda huruf besar dan spasi tetap cocok", () => {
    const { quantities } = matchParsedItems(
      [{ name: "spaghetti classico  BOLOGNA brulee", size: "regular", qty: 1 }],
      CATALOG,
    )
    expect(quantities).toEqual({ "bolo-r": 1 })
  })

  it("nama ambigu, salah ketik, atau menu asing tidak ditebak", () => {
    const { quantities, unmatched } = matchParsedItems(
      [
        { name: "Mac and Cheese", size: "large", qty: 1 },
        { name: "Potato Gratin Lasagne", size: "large", qty: 1 },
        { name: "Tiramisu", size: "single", qty: 1 },
      ],
      CATALOG,
    )
    expect(quantities).toEqual({})
    expect(unmatched.map((item) => item.name)).toEqual([
      "Mac and Cheese",
      "Potato Gratin Lasagne",
      "Tiramisu",
    ])
  })

  it("nama yang ditulis sebagian dipakai bila hanya cocok ke satu menu", () => {
    const { quantities } = matchParsedItems(
      [{ name: "Gratin Lasagna", size: "large", qty: 3 }],
      CATALOG,
    )
    expect(quantities).toEqual({ "lasagna-l": 3 })
  })
})

describe("groupCatalog dan orderTotal", () => {
  it("urutan kelompok mengikuti template WA", () => {
    expect(groupCatalog(CATALOG).map((group) => [group.title, group.variants.length])).toEqual([
      ["Large", 4],
      ["Regular", 2],
      ["Dessert", 1],
      ["Special Bundle", 1],
    ])
  })

  it("kategori baru (event) ikut urutan kategori; dua kategori berukuran diberi nama", () => {
    const event = {
      id: "natal",
      menuName: "Lasagna Natal",
      categoryId: "event",
      categoryName: "Event Natal",
      categorySort: 1,
      sized: false,
      size: "single" as const,
      price: 90000,
      photoPath: null,
    }
    expect(groupCatalog([...CATALOG, event]).map((group) => group.title)).toEqual([
      "Large",
      "Regular",
      "Dessert",
      "Event Natal",
      "Special Bundle",
    ])
    const sizedEvent = { ...event, sized: true, size: "large" as const, categorySort: 5 }
    expect(groupCatalog([...CATALOG, sizedEvent]).map((group) => group.title)).toEqual([
      "Pasta Large",
      "Pasta Regular",
      "Dessert",
      "Special Bundle",
      "Event Natal Large",
    ])
  })

  it("menjumlahkan porsi dan harga", () => {
    expect(orderTotal(CATALOG, { "bolo-l": 2, choco: 1 })).toEqual({ items: 3, total: 170000 })
  })
})

describe("draftIssues", () => {
  const today = "2026-10-24"

  it("draf dari pesan WA lengkap tidak punya masalah", () => {
    const parsed = parseWaOrder(PERSONAL_SAMPLE, today)
    const draft = draftFromParsed(parsed, matchParsedItems(parsed.items, CATALOG).quantities)
    expect(draftIssues(draft, today)).toEqual({})
  })

  it("draf kosong menandai semua isian wajib", () => {
    expect(Object.keys(draftIssues(EMPTY_DRAFT, today))).toEqual([
      "name",
      "phone",
      "address",
      "deliveryDate",
      "shippingMethod",
      "items",
    ])
  })

  it("Pick Up tidak butuh alamat; tanggal lewat ditolak", () => {
    const issues = draftIssues(
      {
        ...EMPTY_DRAFT,
        type: "hampers",
        shippingMethod: "pick_up",
        deliveryDate: "2026-10-23",
      },
      today,
    )
    expect(issues.address).toBeUndefined()
    expect(issues.deliveryDate).toBe("Tanggal kirim sudah lewat.")
  })
})
