import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { connection } from "next/server"

import { supabaseEnv } from "./env"

/** Klien Supabase untuk Server Component, Server Action, dan Route Handler. */
export async function createSupabaseServerClient() {
  // auth-js memanggil Date.now() saat memuat sesi. Dengan Cache Components, nilai waktu
  // saat prerender ditandai "Blocking Route"; connection() menandai bagian ini per-request.
  await connection()
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
