import { describe, expect, it } from "vitest"

import { generatePassword } from "./password"

describe("generatePassword", () => {
  it("16 karakter tanpa huruf yang mudah tertukar", () => {
    const password = generatePassword()
    expect(password).toHaveLength(16)
    expect(password).not.toMatch(/[0O1lI]/)
  })

  it("acak tiap panggilan", () => {
    expect(new Set(Array.from({ length: 20 }, () => generatePassword())).size).toBe(20)
  })
})
