import { z } from "zod"

import { MOVEMENT_MODES } from "./stock"

const optionalCount = (message: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (!value) return null
      const number = Number(value.replace(/\./g, ""))
      if (!Number.isInteger(number) || number < 0) {
        ctx.addIssue({ code: "custom", message })
        return z.NEVER
      }
      return number
    })

export const packagingFormSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Nama minimal 2 huruf.").max(60, "Nama terlalu panjang."),
  unit: z.string().trim().min(1, "Satuan wajib diisi.").max(20, "Satuan terlalu panjang."),
  /** Kategori stok (diatur Owner); kosong = tanpa kategori ("Lainnya"). */
  categoryId: z
    .union([z.literal(""), z.uuid({ error: "Pilih kategori dari daftar." })])
    .transform((value) => value || null),
  minStock: optionalCount("Stok minimum harus angka bulat, 0 atau lebih."),
  capacity: optionalCount("Kapasitas harus angka bulat, 0 atau lebih."),
  /** Hanya untuk packaging baru; dicatat sebagai pergerakan "Stok awal". */
  initialStock: optionalCount("Stok awal harus angka bulat, 0 atau lebih."),
})

export function packagingFormFromData(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key)
    return typeof value === "string" ? value : ""
  }
  return {
    id: text("id") || undefined,
    name: text("name"),
    unit: text("unit"),
    categoryId: text("categoryId"),
    minStock: text("minStock"),
    capacity: text("capacity"),
    initialStock: text("initialStock"),
  }
}

export const packagingCategoryFormSchema = z.object({
  id: z.uuid().optional(),
  name: z
    .string()
    .trim()
    .min(2, "Nama kategori minimal 2 huruf.")
    .max(40, "Nama kategori terlalu panjang."),
})

export const stockMovementSchema = z.object({
  packagingId: z.uuid(),
  mode: z.enum(MOVEMENT_MODES),
  qty: z.number().int({ error: "Isi jumlah dengan angka bulat." }).min(0).max(1_000_000),
  note: z.string().trim().max(200, "Catatan terlalu panjang (maks. 200 karakter)."),
})
