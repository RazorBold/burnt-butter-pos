import { describe, expect, it } from "vitest"

import { parsePaymentFilters, paymentFilterParams } from "./filters"

const TODAY = "2026-10-25"
const METHOD = "0b0f6c1e-2c1a-4f5e-9a3b-1d2e3f4a5b6c"

describe("parsePaymentFilters", () => {
  it("default: hari ini, semua status", () => {
    expect(parsePaymentFilters({}, TODAY)).toEqual({
      q: undefined,
      from: TODAY,
      to: TODAY,
      state: undefined,
      methodId: undefined,
      page: 1,
    })
  })

  it("membaca status bayar dan metode", () => {
    expect(
      parsePaymentFilters({ bayar: "lunas", metode: METHOD, dari: "2026-10-01", hal: "2" }, TODAY),
    ).toMatchObject({
      state: "lunas",
      methodId: METHOD,
      from: "2026-10-01",
      to: "2026-10-01",
      page: 2,
    })
  })

  it("nilai asing diabaikan; metode tidak dipakai untuk Belum bayar", () => {
    expect(parsePaymentFilters({ bayar: "dp", metode: "ovo" }, TODAY)).toMatchObject({
      state: undefined,
      methodId: undefined,
    })
    expect(parsePaymentFilters({ bayar: "belum", metode: METHOD }, TODAY).methodId).toBeUndefined()
  })
})

describe("paymentFilterParams", () => {
  it("rentang hari ini tidak ditulis ke URL", () => {
    expect(paymentFilterParams(parsePaymentFilters({ bayar: "belum" }, TODAY), TODAY)).toEqual({
      q: undefined,
      dari: undefined,
      sampai: undefined,
      bayar: "belum",
      metode: undefined,
    })
  })
})
