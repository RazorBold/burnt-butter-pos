import { z } from "zod"

import { normalizePhone } from "@/lib/phone"

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null)

export const storeSettingsSchema = z.object({
  storeName: z
    .string()
    .trim()
    .min(2, "Nama toko minimal 2 huruf.")
    .max(80, "Nama toko terlalu panjang."),
  whatsapp: z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (!value) return null
      const phone = normalizePhone(value)
      if (!phone) {
        ctx.addIssue({
          code: "custom",
          message: "Nomor WhatsApp belum benar. Contoh: 0812 3456 7890.",
        })
        return z.NEVER
      }
      return phone
    }),
  pickupAddress: optionalText(300, "Alamat terlalu panjang (maks. 300 karakter)."),
  pickupMapsUrl: z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (!value) return null
      const parsed = z.url({ protocol: /^https$/ }).safeParse(value)
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          message: "Tempel link lengkap dari Google Maps, diawali https://",
        })
        return z.NEVER
      }
      return value
    }),
})

export function storeSettingsFromData(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key)
    return typeof value === "string" ? value : ""
  }
  return {
    storeName: text("storeName"),
    whatsapp: text("whatsapp"),
    pickupAddress: text("pickupAddress"),
    pickupMapsUrl: text("pickupMapsUrl"),
  }
}
