import { describe, expect, it } from "vitest"

import { formatPhone, normalizePhone } from "./phone"

describe("normalizePhone", () => {
  it("menerima berbagai penulisan nomor HP", () => {
    expect(normalizePhone("0812 3456 7890")).toBe("081234567890")
    expect(normalizePhone("+62 812-3456-7890")).toBe("081234567890")
    expect(normalizePhone("6281234567890")).toBe("081234567890")
    expect(normalizePhone("81234567890")).toBe("081234567890")
  })

  it("menolak yang bukan nomor HP", () => {
    expect(normalizePhone("021 555 1234")).toBeNull()
    expect(normalizePhone("0812")).toBeNull()
    expect(normalizePhone("")).toBeNull()
    expect(normalizePhone(null)).toBeNull()
  })
})

describe("formatPhone", () => {
  it("mengelompokkan per 4 digit seperti di desain", () => {
    expect(formatPhone("081234567890")).toBe("0812 3456 7890")
    expect(formatPhone("0813234567891")).toBe("0813 2345 6789 1")
    expect(formatPhone(null)).toBe("-")
  })
})
