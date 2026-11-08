import { z } from "zod"

/** Kategori menu (diatur Owner). `sized`: menunya punya harga Large dan Regular. */
export type MenuCategoryRef = { id: string; name: string; sized: boolean }

export const categoryFormSchema = z.object({
  id: z.uuid().optional(),
  name: z
    .string()
    .trim()
    .min(2, "Nama kategori minimal 2 huruf.")
    .max(40, "Nama kategori terlalu panjang."),
  sized: z.boolean(),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>

/** "65.000", "Rp 65.000", "65000" → 65000. Kosong → undefined. */
export function parseRupiah(input: unknown): number | undefined {
  if (typeof input !== "string") return undefined
  const digits = input.replace(/[^\d]/g, "")
  return digits ? Number(digits) : undefined
}

const price = (label: string) =>
  z
    .number({ error: `${label} wajib diisi.` })
    .int()
    .min(1000, `${label} minimal Rp 1.000.`)
    .max(10_000_000, `${label} terlalu besar.`)

/**
 * Isian form Produk & Menu. Ukuran mengikuti kategori: kategori bertanda "Large & Regular"
 * punya dua harga, selain itu satu harga ("single"). `sizing` diisi server dari kategori.
 */
export const menuFormSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(3, "Nama menu minimal 3 huruf.").max(80, "Nama terlalu panjang."),
    categoryId: z.uuid({ error: "Pilih kategori." }),
    description: z.string().trim().max(240, "Deskripsi maksimal 240 karakter.").optional(),
    sizing: z.enum(["two_sizes", "single"]),
    priceLarge: price("Harga Large").optional(),
    priceRegular: price("Harga Regular").optional(),
    priceSingle: price("Harga").optional(),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.sizing === "two_sizes") {
      if (value.priceLarge === undefined)
        ctx.addIssue({ code: "custom", path: ["priceLarge"], message: "Harga Large wajib diisi." })
      if (value.priceRegular === undefined)
        ctx.addIssue({
          code: "custom",
          path: ["priceRegular"],
          message: "Harga Regular wajib diisi.",
        })
    } else if (value.priceSingle === undefined) {
      ctx.addIssue({ code: "custom", path: ["priceSingle"], message: "Harga wajib diisi." })
    }
  })

export type MenuFormValues = z.infer<typeof menuFormSchema>

/** Membaca FormData dari form menu menjadi objek untuk divalidasi. */
export function menuFormFromData(formData: FormData) {
  const text = (key: string) => {
    const value = formData.get(key)
    return typeof value === "string" ? value : undefined
  }
  return {
    id: text("id") || undefined,
    name: text("name") ?? "",
    categoryId: text("categoryId"),
    description: text("description") || undefined,
    sizing: text("sizing") === "single" ? "single" : "two_sizes",
    priceLarge: parseRupiah(text("priceLarge")),
    priceRegular: parseRupiah(text("priceRegular")),
    priceSingle: parseRupiah(text("priceSingle")),
    isActive: text("isActive") !== "false",
  }
}

/** "Not Your Mac & Cheese!" → "not-your-mac-cheese" */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}
