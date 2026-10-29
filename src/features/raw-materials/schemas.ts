import { z } from "zod"

import { isValidQty, MOVEMENT_MODES, parseQty } from "@/features/packagings/stock"

/** Bahan baku boleh pecahan sampai 2 angka di belakang koma (mis. 2,5 kg). */
export const RAW_MATERIAL_DECIMALS = 2

const quantity = (message: string, required: boolean) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      const number = parseQty(value)
      if (number === null) {
        if (!required) return null
        ctx.addIssue({ code: "custom", message })
        return z.NEVER
      }
      if (!isValidQty(number, RAW_MATERIAL_DECIMALS) || number > 1_000_000) {
        ctx.addIssue({ code: "custom", message })
        return z.NEVER
      }
      return number
    })

export const rawMaterialFormSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Nama minimal 2 huruf.").max(60, "Nama terlalu panjang."),
  unit: z.string().trim().min(1, "Satuan wajib diisi.").max(20, "Satuan terlalu panjang."),
  minStock: quantity("Isi stok minimum dengan angka, 0 atau lebih (mis. 10 atau 2,5).", true).pipe(
    z.number(),
  ),
  /** Hanya untuk bahan baku baru; dicatat sebagai pergerakan "Stok awal". */
  initialStock: quantity("Stok awal harus angka, 0 atau lebih (mis. 10 atau 2,5).", false),
})

export function rawMaterialFormFromData(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key)
    return typeof value === "string" ? value : ""
  }
  return {
    id: text("id") || undefined,
    name: text("name"),
    unit: text("unit"),
    minStock: text("minStock"),
    initialStock: text("initialStock"),
  }
}

export const rawMaterialMovementSchema = z.object({
  rawMaterialId: z.uuid(),
  mode: z.enum(MOVEMENT_MODES),
  qty: z.number().min(0).max(1_000_000),
  note: z.string().trim().max(200, "Catatan terlalu panjang (maks. 200 karakter)."),
})
