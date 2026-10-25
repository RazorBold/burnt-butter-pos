// Membuat/memperbarui bucket Storage untuk foto produk. Aman dijalankan berulang.
//   pnpm storage:setup

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"

import { MAX_PHOTO_BYTES, PHOTO_BUCKET, PHOTO_TYPES } from "../src/lib/photos"

config({ path: ".env.local", quiet: true })

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret)
    throw new Error("Env Supabase belum lengkap. Jalankan: vercel env pull .env.local")

  const supabase = createClient(url, secret, { auth: { persistSession: false } })
  const options = {
    public: true,
    fileSizeLimit: MAX_PHOTO_BYTES,
    allowedMimeTypes: [...PHOTO_TYPES],
  }

  const { data: existing } = await supabase.storage.getBucket(PHOTO_BUCKET)
  const { error } = existing
    ? await supabase.storage.updateBucket(PHOTO_BUCKET, options)
    : await supabase.storage.createBucket(PHOTO_BUCKET, options)
  if (error) throw new Error(error.message)

  console.log(
    `✓ Bucket "${PHOTO_BUCKET}" ${existing ? "diperbarui" : "dibuat"} (publik, maks 4 MB, jpg/png/webp)`,
  )
}

main().catch((error) => {
  console.error(`✗ ${error instanceof Error ? error.message : error}`)
  process.exit(1)
})
