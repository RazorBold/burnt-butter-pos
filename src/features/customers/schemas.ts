import { z } from "zod"

import { normalizePhone } from "@/lib/phone"

export const customerFormSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Nama minimal 2 huruf.").max(80, "Nama terlalu panjang."),
  phone: z
    .string()
    .trim()
    .min(1, "No. HP wajib diisi.")
    .transform((value, ctx) => {
      const phone = normalizePhone(value)
      if (!phone) {
        ctx.addIssue({ code: "custom", message: "Nomor HP belum benar. Contoh: 0812 3456 7890." })
        return z.NEVER
      }
      return phone
    }),
  address: z
    .string()
    .trim()
    .max(300, "Alamat terlalu panjang (maks. 300 karakter).")
    .transform((value) => value || null),
})

export function customerFormFromData(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key)
    return typeof value === "string" ? value : undefined
  }
  return {
    id: text("id") || undefined,
    name: text("name") ?? "",
    phone: text("phone") ?? "",
    address: text("address") ?? "",
  }
}
