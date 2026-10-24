import { z } from "zod"

import { normalizePhone } from "@/lib/phone"

export const COURIER_TYPES = ["internal", "eksternal"] as const
export type CourierType = (typeof COURIER_TYPES)[number]

export const COURIER_TYPE_LABEL: Record<CourierType, string> = {
  internal: "Kurir Internal",
  eksternal: "Eksternal",
}

export const courierFormSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(2, "Nama kurir minimal 2 huruf.").max(60, "Nama terlalu panjang."),
    type: z.enum(COURIER_TYPES, { error: "Pilih tipe kurir." }),
    phone: z.string().trim().optional(),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.phone && !normalizePhone(value.phone)) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Nomor HP belum benar. Contoh: 0812 3456 7890.",
      })
    }
    // Kurir internal dihubungi langsung oleh admin, jadi nomornya wajib.
    if (value.type === "internal" && !value.phone) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "No. telp wajib untuk kurir internal.",
      })
    }
  })
  .transform((value) => ({ ...value, phone: normalizePhone(value.phone) }))

export type CourierFormValues = z.output<typeof courierFormSchema>

export function courierFormFromData(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key)
    return typeof value === "string" ? value : undefined
  }
  return {
    id: text("id") || undefined,
    name: text("name") ?? "",
    type: text("type"),
    phone: text("phone") || undefined,
    isActive: text("isActive") !== "false",
  }
}
