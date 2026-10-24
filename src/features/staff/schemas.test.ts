import { describe, expect, it } from "vitest"

import { createStaffSchema, updateStaffSchema } from "./schemas"

describe("createStaffSchema", () => {
  it("merapikan email jadi huruf kecil", () => {
    const parsed = createStaffSchema.parse({
      name: " Sari ",
      email: " Sari@Contoh.COM ",
      role: "kasir",
    })
    expect(parsed).toEqual({ name: "Sari", email: "sari@contoh.com", role: "kasir" })
  })

  it("menolak email dan role yang tidak valid", () => {
    const result = createStaffSchema.safeParse({ name: "Sari", email: "sari", role: "manajer" })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(["email", "role"])
  })
})

describe("updateStaffSchema", () => {
  it("butuh id yang valid", () => {
    const result = updateStaffSchema.safeParse({
      id: "bukan-uuid",
      name: "Sari",
      role: "kasir",
      isActive: true,
    })
    expect(result.success).toBe(false)
  })
})
