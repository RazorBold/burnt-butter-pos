import { describe, expect, it } from "vitest"

import { fieldErrors } from "@/lib/form"

import {
  categoryFormSchema,
  menuFormFromData,
  menuFormSchema,
  parseRupiah,
  slugify,
} from "./schemas"

const CATEGORY_ID = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed"

function form(entries: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.set(key, value)
  return data
}

describe("parseRupiah", () => {
  it("membaca berbagai format penulisan harga", () => {
    expect(parseRupiah("65.000")).toBe(65000)
    expect(parseRupiah("Rp 65.000")).toBe(65000)
    expect(parseRupiah("65000")).toBe(65000)
    expect(parseRupiah("")).toBeUndefined()
    expect(parseRupiah(undefined)).toBeUndefined()
  })
})

describe("slugify", () => {
  it("membuat slug yang aman untuk URL dan nama file", () => {
    expect(slugify("Not Your Mac & Cheese!")).toBe("not-your-mac-cheese")
    expect(slugify("  Spaghetti Aglio E Olio ")).toBe("spaghetti-aglio-e-olio")
    expect(slugify("Crème Brûlée")).toBe("creme-brulee")
  })
})

describe("menuFormSchema", () => {
  it("menerima menu pasta dengan dua harga", () => {
    const parsed = menuFormSchema.safeParse(
      menuFormFromData(
        form({
          name: "Spaghetti Classico Bologna Brulee",
          categoryId: CATEGORY_ID,
          sizing: "two_sizes",
          priceLarge: "65.000",
          priceRegular: "50.000",
        }),
      ),
    )
    expect(parsed.success).toBe(true)
    expect(parsed.data?.priceLarge).toBe(65000)
    expect(parsed.data?.isActive).toBe(true)
  })

  it("mewajibkan kedua harga untuk menu dua ukuran", () => {
    const parsed = menuFormSchema.safeParse(
      menuFormFromData(
        form({
          name: "Lasagna",
          categoryId: CATEGORY_ID,
          sizing: "two_sizes",
          priceLarge: "65000",
        }),
      ),
    )
    expect(parsed.success).toBe(false)
    expect(fieldErrors(parsed.error!)).toEqual({ priceRegular: "Harga Regular wajib diisi." })
  })

  it("mewajibkan satu harga untuk menu tanpa ukuran", () => {
    const parsed = menuFormSchema.safeParse(
      menuFormFromData(form({ name: "Choco Bon Bon", categoryId: CATEGORY_ID, sizing: "single" })),
    )
    expect(fieldErrors(parsed.error!)).toEqual({ priceSingle: "Harga wajib diisi." })
  })

  it("menolak nama terlalu pendek dan kategori kosong", () => {
    const parsed = menuFormSchema.safeParse(
      menuFormFromData(form({ name: "ab", sizing: "single", priceSingle: "40000" })),
    )
    const errors = fieldErrors(parsed.error!)
    expect(errors.name).toBe("Nama menu minimal 3 huruf.")
    expect(errors.categoryId).toBe("Pilih kategori.")
  })
})

describe("categoryFormSchema", () => {
  it("nama kategori dirapikan dan wajib minimal 2 huruf", () => {
    expect(categoryFormSchema.parse({ name: "  Event Natal ", sized: false })).toEqual({
      name: "Event Natal",
      sized: false,
    })
    expect(categoryFormSchema.safeParse({ name: "A", sized: true }).success).toBe(false)
  })
})
