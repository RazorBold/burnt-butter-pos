import { describe, expect, it } from "vitest"

import { rawMaterialFormSchema } from "./schemas"

const base = { name: "Keju Cheddar", unit: "kg", minStock: "10", initialStock: "" }

describe("rawMaterialFormSchema", () => {
  it("stok minimum wajib, boleh pecahan dengan koma", () => {
    expect(rawMaterialFormSchema.parse({ ...base, minStock: "2,5" })).toMatchObject({
      minStock: 2.5,
      initialStock: null,
    })
    expect(rawMaterialFormSchema.safeParse({ ...base, minStock: "" }).success).toBe(false)
  })

  it("menolak angka negatif, teks, dan lebih dari 2 desimal", () => {
    for (const minStock of ["-1", "sepuluh", "1,255"]) {
      expect(rawMaterialFormSchema.safeParse({ ...base, minStock }).success).toBe(false)
    }
  })

  it("stok awal opsional", () => {
    expect(rawMaterialFormSchema.parse({ ...base, initialStock: "15,25" }).initialStock).toBe(15.25)
  })
})
