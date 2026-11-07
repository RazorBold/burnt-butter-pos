import { describe, expect, it } from "vitest"

import { packagingFormSchema } from "./schemas"

describe("packagingFormSchema", () => {
  it("angka boleh kosong atau pakai titik ribuan", () => {
    expect(
      packagingFormSchema.parse({
        name: " Classic Red (Large) ",
        unit: "pcs",
        size: "large",
        minStock: "50",
        capacity: "1.000",
        initialStock: "",
      }),
    ).toEqual({
      name: "Classic Red (Large)",
      unit: "pcs",
      size: "large",
      minStock: 50,
      capacity: 1000,
      initialStock: null,
    })
  })

  it("menolak angka negatif atau pecahan", () => {
    const result = packagingFormSchema.safeParse({
      name: "Box",
      unit: "pcs",
      size: "",
      minStock: "-1",
      capacity: "2,5",
      initialStock: "",
    })
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(["minStock", "capacity"])
  })

  it("ukuran kosong = tanpa ukuran; selain Large/Regular ditolak", () => {
    const base = { name: "Box", unit: "pcs", minStock: "", capacity: "", initialStock: "" }
    expect(packagingFormSchema.parse({ ...base, size: "" }).size).toBeNull()
    expect(packagingFormSchema.parse({ ...base, size: "regular" }).size).toBe("regular")
    expect(packagingFormSchema.safeParse({ ...base, size: "jumbo" }).success).toBe(false)
  })
})
