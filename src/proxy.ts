import { NextResponse, type NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/proxy"

const PUBLIC_PATHS = ["/login"]

export async function proxy(request: NextRequest) {
  const configured =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  // Di lokal, aplikasi tetap bisa dibuka sebelum Supabase disiapkan.
  // Di produksi env wajib ada, jadi updateSession() akan melempar error yang jelas.
  if (!configured && process.env.NODE_ENV !== "production") return NextResponse.next()

  const { response, claims } = await updateSession(request)
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path))

  // Pengecekan optimistis saja; otorisasi sebenarnya ada di requireRole() di server.
  if (!claims && !isPublic) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (claims && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Semua path kecuali API cron, aset Next, dan file statis.
    "/((?!api/cron|_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
