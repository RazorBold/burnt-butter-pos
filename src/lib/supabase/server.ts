import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { supabaseEnv } from "./env"

/** Klien Supabase untuk Server Component, Server Action, dan Route Handler. */
export async function createSupabaseServerClient() {
  const { url, key } = supabaseEnv()
  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Dipanggil dari Server Component (cookie read-only). Aman diabaikan karena
          // proxy.ts sudah me-refresh sesi di setiap request.
        }
      },
    },
  })
}
