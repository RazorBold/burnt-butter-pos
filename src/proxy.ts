import { NextResponse, type NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/proxy"

const PUBLIC_PATHS = ["/login"]
const CACHE_HEADERS = ["cache-control", "expires", "pragma"]

/** Redirect yang tetap membawa cookie sesi hasil refresh beserta header anti-cache-nya. */
function redirectWithSession(url: URL, sessionResponse: NextResponse) {
  const redirect = NextResponse.redirect(url)
  for (const cookie of sessionResponse.cookies.getAll()) redirect.cookies.set(cookie)
  for (const name of CACHE_HEADERS) {
    const value = sessionResponse.headers.get(name)
    if (value) redirect.headers.set(name, value)
  }
  return redirect
}

export async function proxy(request: NextRequest) {
  const configured =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  // Di lokal, aplikasi tetap bisa dibuka sebelum Supabase disiapkan.
  // Di produksi env wajib ada, jadi updateSession() akan melempar error yang jelas.
  if (!configured && process.env.NODE_ENV !== "production") return NextResponse.next()

  const { response, claims } = await updateSession(request)
  const { pathname, search } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))

  // Pengecekan optimistis saja (sesi valid atau tidak). Profil, status aktif, dan role
  // dicek di server lewat getCurrentUser()/requirePageAccess(). Halaman /login sendiri yang
  // mengarahkan user yang sudah login ke dashboard, supaya akun tanpa profil tidak berputar.
  if (!claims && !isPublic) {
    const loginUrl = new URL("/login", request.url)
    if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`)
    return redirectWithSession(loginUrl, response)
  }

  return response
}

export const config = {
  matcher: [
    // Semua path kecuali API cron, aset Next, dan file statis.
    "/((?!api/cron|_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
