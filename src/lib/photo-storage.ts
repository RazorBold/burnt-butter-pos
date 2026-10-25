import "server-only"

import { PHOTO_BUCKET, photoFileError } from "@/lib/photos"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

/** File foto dari FormData, atau null bila tidak ada yang dipilih. */
export function photoFromForm(formData: FormData, field = "photo"): File | null {
  const photo = formData.get(field)
  return photo instanceof File && photo.size > 0 ? photo : null
}

/**
 * Upload foto ke bucket publik, mis. folder "menu" atau "packaging".
 * Nama file diberi waktu supaya cache CDN tidak menampilkan foto lama.
 */
export async function uploadPhoto(
  folder: string,
  baseName: string,
  photo: File,
): Promise<{ path: string } | { error: string }> {
  const invalid = photoFileError(photo)
  if (invalid) return { error: invalid }
  const path = `${folder}/${baseName}-${Date.now()}.${EXTENSION[photo.type]}`
  const { error } = await createSupabaseAdminClient()
    .storage.from(PHOTO_BUCKET)
    .upload(path, photo, { contentType: photo.type, cacheControl: "31536000", upsert: false })
  return error ? { error: "Foto gagal di-upload. Coba lagi." } : { path }
}

/** Hapus foto lama di Storage. Foto bawaan aplikasi (/images/...) dibiarkan. */
export async function removeStoredPhoto(path: string | null | undefined) {
  if (!path || path.startsWith("/")) return
  await createSupabaseAdminClient().storage.from(PHOTO_BUCKET).remove([path])
}
