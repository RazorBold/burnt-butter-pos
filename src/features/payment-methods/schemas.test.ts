import { describe, expect, it } from "vitest"

import { fieldErrors } from "@/lib/form"

import { paymentMethodFormFromData, paymentMethodFormSchema } from "./schemas"

function parse(entries: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.set(key, value)
  return paymentMethodFormSchema.safeParse(paymentMethodFormFromData(data))
}

describe("paymentMethodFormSchema", () => {
  it("menerima metode e-wallet aktif", () => {
    const result = parse({ name: "  GoPay ", type: "ewallet" })
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({ name: "GoPay", type: "ewallet", isActive: true })
  })

  it("membaca status nonaktif", () => {
    expect(parse({ name: "Cash", type: "cash", isActive: "false" }).data?.isActive).toBe(false)
  })

  it("menolak nama pendek dan tipe yang tidak dikenal", () => {
    const errors = fieldErrors(parse({ name: "Q", type: "kripto" }).error!)
    expect(errors.name).toBe("Nama metode minimal 2 huruf.")
    expect(errors.type).toBe("Pilih tipe metode.")
  })
})
