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
