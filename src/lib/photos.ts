// URL foto produk. Dipakai di server dan klien, jadi tanpa server-only.
// photo_path bisa berupa:
//   - path lokal bawaan:  "/images/menu/potato-gratin-lasagna-large.webp"
//   - path di Storage:    "menu/potato-gratin-lasagna-1729760000.webp" (bucket publik)

export const PHOTO_BUCKET = "menu-photos"

export function photoSrc(photoPath: string | null | undefined): string | null {
  if (!photoPath) return null
  if (photoPath.startsWith("/") || photoPath.startsWith("https://")) return photoPath
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return base ? `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${photoPath}` : null
}

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

/** Pesan error untuk file foto yang tidak diterima, atau null bila boleh. Dipakai klien dan server. */
export function photoFileError(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES.includes(file.type as (typeof PHOTO_TYPES)[number])) {
    return "Foto harus JPG, PNG, atau WebP."
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return `Ukuran foto ${(file.size / 1024 / 1024).toFixed(1)} MB. Maksimal 4 MB.`
  }
  return null
}
