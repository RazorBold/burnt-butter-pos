import { describe, expect, it } from "vitest"

import { packagingFormSchema } from "./schemas"

describe("packagingFormSchema", () => {
  it("angka boleh kosong atau pakai titik ribuan", () => {
    expect(
      packagingFormSchema.parse({
        name: " Box Large ",
        unit: "pcs",
        minStock: "50",
        capacity: "1.000",
        initialStock: "",
      }),
    ).toEqual({ name: "Box Large", unit: "pcs", minStock: 50, capacity: 1000, initialStock: null })
  })

  it("menolak angka negatif atau pecahan", () => {
    const result = packagingFormSchema.safeParse({
      name: "Box",
      unit: "pcs",
      minStock: "-1",
      capacity: "2,5",
      initialStock: "",
    })
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(["minStock", "capacity"])
  })
})
