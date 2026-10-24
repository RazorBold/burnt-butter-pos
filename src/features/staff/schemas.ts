import { z } from "zod"

import { ROLES } from "@/lib/access"

const name = z.string().trim().min(2, "Nama minimal 2 huruf.").max(60, "Nama terlalu panjang.")
const role = z.enum(ROLES, { error: "Pilih role." })

export const createStaffSchema = z.object({
  name,
  // trim dulu, baru cek format: z.email().trim() menolak email yang tertempel spasi.
  email: z.string().trim().toLowerCase().pipe(z.email("Format email belum benar.")),
  role,
})

export const updateStaffSchema = z.object({
  id: z.uuid(),
  name,
  role,
  isActive: z.boolean(),
})

export function staffFormFromData(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key)
    return typeof value === "string" ? value : undefined
  }
  return {
    id: text("id") || undefined,
    name: text("name") ?? "",
    email: text("email") ?? "",
    role: text("role"),
    isActive: text("isActive") !== "false",
  }
}
