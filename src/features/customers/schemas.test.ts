import { describe, expect, it } from "vitest"

import { customerFormSchema } from "./schemas"

describe("customerFormSchema", () => {
  it("menormalkan no. HP dan mengosongkan alamat kosong", () => {
    const parsed = customerFormSchema.parse({
      name: " Rina ",
      phone: "+62 812-3456-7890",
      address: "  ",
    })
    expect(parsed).toEqual({ name: "Rina", phone: "081234567890", address: null })
  })

  it("no. HP wajib dan harus nomor HP Indonesia", () => {
    const empty = customerFormSchema.safeParse({ name: "Rina", phone: "", address: "" })
    expect(empty.error?.issues[0]?.message).toBe("No. HP wajib diisi.")
    const wrong = customerFormSchema.safeParse({ name: "Rina", phone: "12345", address: "" })
    expect(wrong.error?.issues[0]?.path).toEqual(["phone"])
  })
})
