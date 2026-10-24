import { describe, expect, it } from "vitest"

import { fieldErrors } from "@/lib/form"

import { courierFormFromData, courierFormSchema } from "./schemas"

function parse(entries: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.set(key, value)
  return courierFormSchema.safeParse(courierFormFromData(data))
}

describe("courierFormSchema", () => {
  it("menormalisasi nomor kurir internal", () => {
    const result = parse({ name: "Andi", type: "internal", phone: "+62 812-3456-7890" })
    expect(result.success).toBe(true)
    expect(result.data?.phone).toBe("081234567890")
  })

  it("kurir eksternal boleh tanpa nomor", () => {
    const result = parse({ name: "Citra Express", type: "eksternal" })
    expect(result.success).toBe(true)
    expect(result.data?.phone).toBeNull()
  })

  it("kurir internal wajib punya nomor", () => {
    const result = parse({ name: "Budi", type: "internal" })
    expect(fieldErrors(result.error!)).toEqual({ phone: "No. telp wajib untuk kurir internal." })
  })

  it("menolak nomor yang bukan HP", () => {
    const result = parse({ name: "Budi", type: "internal", phone: "021 555 1234" })
    expect(fieldErrors(result.error!).phone).toBe("Nomor HP belum benar. Contoh: 0812 3456 7890.")
  })

  it("menolak nama terlalu pendek dan tipe kosong", () => {
    const errors = fieldErrors(parse({ name: "A" }).error!)
    expect(errors.name).toBe("Nama kurir minimal 2 huruf.")
    expect(errors.type).toBe("Pilih tipe kurir.")
  })
})
