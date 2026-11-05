import { describe, expect, it } from "vitest"

import { draftIssues, EMPTY_DRAFT, type OrderDraft, parseRupiahInput } from "./draft"

const TODAY = "2026-11-04"

const shopee: OrderDraft = {
  ...EMPTY_DRAFT,
  channel: "shopee",
  marketplaceOrderNo: "2611040ABC",
  name: "Nadia",
  deliveryDate: TODAY,
  expedition: "SPX Express",
  marketplaceTotal: "210.000",
  quantities: { menu: 1 },
}

describe("parseRupiahInput", () => {
  it("mengambil angka saja", () => {
    expect(parseRupiahInput("Rp 210.000")).toBe(210_000)
    expect(parseRupiahInput("")).toBeNull()
    expect(parseRupiahInput("abc")).toBeNull()
  })
})

describe("draftIssues marketplace", () => {
  it("no. HP, alamat, resi, dan metode kirim tidak wajib", () => {
    expect(draftIssues(shopee, TODAY)).toEqual({})
  })

  it("no. pesanan, kurir, total, nama, dan menu wajib", () => {
    const issues = draftIssues(
      {
        ...shopee,
        marketplaceOrderNo: " ",
        expedition: "",
        marketplaceTotal: "0",
        name: "",
        quantities: {},
      },
      TODAY,
    )
    expect(Object.keys(issues).sort()).toEqual([
      "expedition",
      "items",
      "marketplaceOrderNo",
      "marketplaceTotal",
      "name",
    ])
  })

  it("no. HP yang diisi tetap harus benar", () => {
    expect(draftIssues({ ...shopee, phone: "0812****12" }, TODAY).phone).toBeTruthy()
    expect(draftIssues({ ...shopee, phone: "0812 3456 7890" }, TODAY).phone).toBeUndefined()
  })

  it("pesanan WhatsApp tetap wajib no. HP, alamat, dan metode kirim", () => {
    const issues = draftIssues({ ...EMPTY_DRAFT, name: "Siti", quantities: { menu: 1 } }, TODAY)
    expect(issues.phone).toBeTruthy()
    expect(issues.address).toBeTruthy()
    expect(issues.shippingMethod).toBeTruthy()
    expect(issues.marketplaceOrderNo).toBeUndefined()
  })
})
