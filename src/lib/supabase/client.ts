import { createBrowserClient } from "@supabase/ssr"

import { supabaseEnv } from "./env"

/** Klien Supabase untuk Client Component (login, logout). Data aplikasi tetap lewat server. */
export function createSupabaseBrowserClient() {
  const { url, key } = supabaseEnv()
  return createBrowserClient(url, key)
}
