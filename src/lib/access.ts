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

/** Ringkasan hak akses per role, ditampilkan di form User / Staff. Selaras dengan SECTION_ACCESS. */
export const ROLE_DESCRIPTION: Record<Role, string> = {
  admin: "Semua menu, termasuk mengelola akun staf.",
  kasir: "Dashboard, Pesanan, Pembayaran, Pengiriman, Customer, dan lihat Master Data.",
  produksi: "Dashboard, Produksi, Stok Packaging, dan lihat Master Data (tanpa Customer).",
  owner: "Dashboard, Laporan, dan lihat Master Data.",
}

const ALL: readonly Role[] = ROLES

/** Halaman utama aplikasi dan role yang boleh membukanya. Urutan = urutan navbar. */
export const SECTION_ACCESS = {
  "/dashboard": ALL,
  "/pesanan": ["admin", "kasir"],
  "/pembayaran": ["admin", "kasir"],
  "/produksi": ["admin", "produksi"],
  "/pengiriman": ["admin", "kasir"],
  "/laporan": ["admin", "owner"],
  "/stok-packaging": ["admin", "produksi"],
  "/master-data": ALL,
} as const satisfies Record<string, readonly Role[]>

export type Section = keyof typeof SECTION_ACCESS

/**
 * Sub-halaman yang aksesnya lebih sempit dari halaman induknya. Diperiksa sebelum SECTION_ACCESS.
 * Customer berisi data pribadi (no. HP, alamat); User / Staff dan Pengaturan khusus Admin.
 */
export const SUBSECTION_ACCESS = {
  "/master-data/customer": ["admin", "kasir", "owner"],
  "/master-data/user-staff": ["admin"],
  "/master-data/pengaturan": ["admin"],
} as const satisfies Record<string, readonly Role[]>

/** Role yang boleh mencatat stok masuk/keluar (packaging, bahan baku). */
export const CAN_EDIT_STOCK: readonly Role[] = ["admin", "produksi"]

/** Role yang boleh menambah dan mengubah data customer (Kasir mencatat pesanan dari WA). */
export const CAN_EDIT_CUSTOMER: readonly Role[] = ["admin", "kasir"]

/** Role yang boleh membuat pesanan lewat tombol "Input Pesanan". */
export const CAN_INPUT_ORDER: readonly Role[] = ["admin", "kasir"]

function sectionOf(pathname: string): Section | undefined {
  return (Object.keys(SECTION_ACCESS) as Section[]).find(
    (section) => pathname === section || pathname.startsWith(`${section}/`),
  )
}

/** Path yang tidak terdaftar di SECTION_ACCESS hanya boleh dibuka Admin. */
export function canAccessPath(role: Role, pathname: string): boolean {
  const subsection = (Object.keys(SUBSECTION_ACCESS) as (keyof typeof SUBSECTION_ACCESS)[]).find(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
  if (subsection) return (SUBSECTION_ACCESS[subsection] as readonly Role[]).includes(role)
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
