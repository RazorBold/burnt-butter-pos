import { describe, expect, it } from "vitest"

import { formatOrderNo } from "./order-number"

describe("formatOrderNo", () => {
  it("BB + YYMMDD + urutan 3 digit", () => {
    expect(formatOrderNo("2026-10-24", 1)).toBe("BB261024001")
    expect(formatOrderNo("2026-01-05", 42)).toBe("BB260105042")
  })

  it("lebih dari 999 pesanan sehari tetap unik (4 digit)", () => {
    expect(formatOrderNo("2026-10-24", 1000)).toBe("BB2610241000")
  })
})
