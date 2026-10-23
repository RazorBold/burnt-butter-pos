import "server-only"

import { createClient } from "@supabase/supabase-js"

/**
 * Klien dengan secret key: melewati RLS dan bisa mengelola user/Storage.
 * Hanya untuk Server Action yang sudah lolos requireRole(). Jangan pernah dikirim ke klien.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret)
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY belum diisi.")
  return createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } })
}
