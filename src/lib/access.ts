// Aturan akses per role. Murni (tanpa DB/cookie) supaya bisa dipakai navbar, halaman, dan test.
// Matriks mengikuti usulan PRD bagian "Pengguna & peran" (masih perlu dikonfirmasi pemilik toko).

export const ROLES = ["admin", "kasir", "produksi", "owner"] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  kasir: "Kasir",
  produksi: "Produksi",
  owner: "Owner",
}

const ALL: readonly Role[] = ROLES

/** Halaman utama aplikasi dan role yang boleh membukanya. Urutan = urutan navbar. */
export const SECTION_ACCESS = {
  "/dashboard": ALL,
  "/pesanan": ["admin", "kasir"],
  "/pembayaran": ["admin", "kasir"],
  "/stok-packaging": ["admin", "produksi"],
  "/produksi": ["admin", "produksi"],
  "/pengiriman": ["admin", "kasir"],
  "/laporan": ["admin", "owner"],
  "/master-data": ALL,
} as const satisfies Record<string, readonly Role[]>

export type Section = keyof typeof SECTION_ACCESS

/** Role yang boleh membuat pesanan lewat tombol "Input Pesanan". */
export const CAN_INPUT_ORDER: readonly Role[] = ["admin", "kasir"]

function sectionOf(pathname: string): Section | undefined {
  return (Object.keys(SECTION_ACCESS) as Section[]).find(
    (section) => pathname === section || pathname.startsWith(`${section}/`),
  )
}

/** Path yang tidak terdaftar di SECTION_ACCESS hanya boleh dibuka Admin. */
export function canAccessPath(role: Role, pathname: string): boolean {
  const section = sectionOf(pathname)
  if (!section) return role === "admin"
  return (SECTION_ACCESS[section] as readonly Role[]).includes(role)
}

/**
 * Tujuan setelah login. Hanya path internal yang diterima, supaya ?next= tidak bisa
 * dipakai untuk mengarahkan orang ke situs lain (open redirect).
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback
  }
  if (next === "/" || next.startsWith("/login")) return fallback
  return next
}
