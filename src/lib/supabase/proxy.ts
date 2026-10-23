import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { supabaseEnv } from "./env"

/**
 * Me-refresh token sesi Supabase dan meneruskan cookie barunya ke browser.
 * Mengembalikan response yang harus dipakai proxy, beserta klaim user (null bila belum login).
 */
export async function updateSession(request: NextRequest) {
  const { url, key } = supabaseEnv()
  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value)
      },
    },
  })

  // Jangan menaruh kode lain di antara createServerClient dan getClaims():
  // getClaims() yang memicu refresh token bila perlu.
  const { data } = await supabase.auth.getClaims()

  return { response, claims: data?.claims ?? null }
}
