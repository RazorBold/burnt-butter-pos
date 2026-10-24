import { describe, expect, it } from "vitest"

import { storeSettingsSchema } from "./schemas"

describe("storeSettingsSchema", () => {
  it("isian opsional yang kosong jadi null, no. WA dinormalkan", () => {
    const parsed = storeSettingsSchema.parse({
      storeName: " Burnt Butter ",
      whatsapp: "62 812 3456 7890",
      pickupAddress: "",
      pickupMapsUrl: " ",
    })
    expect(parsed).toEqual({
      storeName: "Burnt Butter",
      whatsapp: "081234567890",
      pickupAddress: null,
      pickupMapsUrl: null,
    })
  })

  it("link Maps harus https", () => {
    const result = storeSettingsSchema.safeParse({
      storeName: "Burnt Butter",
      whatsapp: "",
      pickupAddress: "",
      pickupMapsUrl: "maps.google.com/xyz",
    })
    expect(result.error?.issues[0]?.path).toEqual(["pickupMapsUrl"])
    const ok = storeSettingsSchema.safeParse({
      storeName: "Burnt Butter",
      whatsapp: "",
      pickupAddress: "",
      pickupMapsUrl: "https://maps.app.goo.gl/abc123",
    })
    expect(ok.success).toBe(true)
  })
})
