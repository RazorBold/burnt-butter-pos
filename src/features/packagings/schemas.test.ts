import { describe, expect, it } from "vitest"

import { packagingFormSchema } from "./schemas"

describe("packagingFormSchema", () => {
  it("angka boleh kosong atau pakai titik ribuan", () => {
    expect(
      packagingFormSchema.parse({
        name: " Classic Red (Large) ",
        unit: "pcs",
        categoryId: "3f2a8c1e-6b4d-4e8a-9c7f-1d2e3f4a5b6c",
        minStock: "50",
        capacity: "1.000",
        initialStock: "",
      }),
    ).toEqual({
      name: "Classic Red (Large)",
      unit: "pcs",
      categoryId: "3f2a8c1e-6b4d-4e8a-9c7f-1d2e3f4a5b6c",
      minStock: 50,
      capacity: 1000,
      initialStock: null,
    })
  })

  it("menolak angka negatif atau pecahan", () => {
    const result = packagingFormSchema.safeParse({
      name: "Box",
      unit: "pcs",
      categoryId: "",
      minStock: "-1",
      capacity: "2,5",
      initialStock: "",
    })
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(["minStock", "capacity"])
  })

  it("kategori kosong = tanpa kategori; selain uuid ditolak", () => {
    const base = { name: "Box", unit: "pcs", minStock: "", capacity: "", initialStock: "" }
    expect(packagingFormSchema.parse({ ...base, categoryId: "" }).categoryId).toBeNull()
    expect(
      packagingFormSchema.parse({ ...base, categoryId: "3f2a8c1e-6b4d-4e8a-9c7f-1d2e3f4a5b6c" })
        .categoryId,
    ).toBe("3f2a8c1e-6b4d-4e8a-9c7f-1d2e3f4a5b6c")
    expect(packagingFormSchema.safeParse({ ...base, categoryId: "large" }).success).toBe(false)
  })
})
