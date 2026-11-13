import { z } from "zod"

import { SHIPPING_METHODS } from "@/features/orders/constants"

export const shippingOptionFormSchema = z
  .object({
    id: z.uuid().optional(),
    name: z
      .string()
      .trim()
      .min(2, "Nama kategori minimal 2 huruf.")
      .max(40, "Nama terlalu panjang."),
    flow: z.enum(SHIPPING_METHODS, { error: "Pilih alur pengiriman." }),
    liveTracking: z.boolean(),
    note: z.string().trim().max(120, "Keterangan maksimal 120 karakter."),
    isActive: z.boolean(),
  })
  .refine((value) => !(value.flow === "pick_up" && value.liveTracking), {
    path: ["liveTracking"],
    message: "Pick Up diambil sendiri, jadi tidak memakai live tracking.",
  })

export function shippingOptionFormFromData(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key)
    return typeof value === "string" ? value : undefined
  }
  return {
    id: text("id") || undefined,
    name: text("name") ?? "",
    flow: text("flow"),
    liveTracking: text("liveTracking") === "true",
    note: text("note") ?? "",
    isActive: text("isActive") !== "false",
  }
}
